# services/transcription_service.py
# Automatically uses whisper.cpp (Metal GPU) on Mac dev machines,
# and falls back to openai-whisper (CPU) on deployment servers.

import json
import os
import shutil
import subprocess
import whisper
import librosa
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional
import time
import logging
import torch
import soundfile as sf
from config.config import settings

logger = logging.getLogger(__name__)


class TranscriptionService:
    # whisper.cpp Metal GPU paths (Mac only — installed via `brew install whisper-cpp`)
    _WHISPER_CPP_BIN = "/opt/homebrew/bin/whisper-cli"
    _WHISPER_CPP_MODEL = os.path.expanduser("~/.whisper-cpp/models/ggml-base.en.bin")

    def __init__(self):
        self.model = None
        self.device = "cpu"

        # Check for whisper.cpp first (Mac dev environment with Metal GPU)
        self.use_whisper_cpp = self._check_whisper_cpp()

        if not self.use_whisper_cpp:
            # Deployment path: load openai-whisper on CPU as before
            self.load_model()

    # ──────────────────────────────────────────────────────────────────
    #  whisper.cpp (Metal GPU) — Mac dev path
    # ──────────────────────────────────────────────────────────────────

    def _check_whisper_cpp(self) -> bool:
        """
        Detect whether whisper.cpp is available on this machine.
        Returns True only if BOTH the binary and the GGML model file exist.
        On a deployment server (Linux/Docker) neither will be present,
        so this silently returns False and the CPU path is used.
        """
        bin_ok = (
            Path(self._WHISPER_CPP_BIN).exists()
            or shutil.which("whisper-cli") is not None
        )
        model_ok = Path(self._WHISPER_CPP_MODEL).exists()

        if bin_ok and model_ok:
            logger.info(
                f"🍎 whisper.cpp detected (Metal GPU) — "
                f"bin: {self._WHISPER_CPP_BIN}, model: {self._WHISPER_CPP_MODEL}"
            )
            return True

        if bin_ok and not model_ok:
            logger.warning(
                f"whisper-cli found but GGML model missing at {self._WHISPER_CPP_MODEL}. "
                "Falling back to CPU. Download with:\n"
                "  curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/"
                "ggml-base.en.bin -o ~/.whisper-cpp/models/ggml-base.en.bin"
            )

        logger.info("⚡ whisper.cpp not available — using openai-whisper (CPU)")
        return False

    def _transcribe_with_whisper_cpp(self, audio_path: str, language: str = "en") -> Dict:
        """
        Run whisper.cpp via subprocess using the Metal GPU backend.
        Outputs a JSON file alongside the audio which is parsed for
        segment-level timestamps, then cleaned up.
        """
        bin_path = (
            self._WHISPER_CPP_BIN
            if Path(self._WHISPER_CPP_BIN).exists()
            else "whisper-cli"
        )

        cmd = [
            bin_path,
            "-m", self._WHISPER_CPP_MODEL,
            "-f", audio_path,
            "-l", language,
            "--output-json",   # produces {audio_path}.json with segment timestamps
        ]

        logger.info(f"🚀 Starting transcription via whisper.cpp (Metal GPU)...")
        logger.debug(f"Command: {' '.join(cmd)}")

        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if proc.returncode != 0:
            raise RuntimeError(f"whisper-cli exited {proc.returncode}: {proc.stderr.strip()}")

        # whisper-cli writes {audio_path}.json next to the input file
        json_path = Path(audio_path + ".json")
        raw_text = ""
        word_timestamps: List[Dict] = []

        if json_path.exists():
            try:
                with open(json_path, "r") as f:
                    data = json.load(f)

                segments = data.get("transcription", [])
                text_parts = []
                for seg in segments:
                    seg_text = seg.get("text", "").strip()
                    text_parts.append(seg_text)
                    # Segment-level timestamps (word-level needs --word-thold flag)
                    offsets = seg.get("offsets", {})
                    start_ms = offsets.get("from", 0)
                    end_ms   = offsets.get("to",   0)
                    if seg_text:
                        word_timestamps.append({
                            "word":       seg_text,
                            "start":      round(start_ms / 1000, 3),
                            "end":        round(end_ms   / 1000, 3),
                            "confidence": 0.0,  # not provided by whisper.cpp JSON
                        })

                raw_text = " ".join(text_parts).strip()
            except Exception as parse_err:
                logger.warning(f"Could not parse whisper.cpp JSON ({parse_err}) — using stdout")
                raw_text = proc.stdout.strip()
            finally:
                json_path.unlink(missing_ok=True)
        else:
            # Fallback: plain stdout
            raw_text = proc.stdout.strip()

        logger.info(f"📝 whisper.cpp text length: {len(raw_text)}")
        logger.info(f"📝 whisper.cpp text preview: {raw_text[:100]}...")
        return {"text": raw_text, "word_timestamps": word_timestamps, "language": language}

    # ──────────────────────────────────────────────────────────────────
    #  openai-whisper (CPU) — deployment / fallback path
    # ──────────────────────────────────────────────────────────────────

    def _get_optimal_device(self) -> str:
        """Determine the best available device for processing"""
        if torch.backends.mps.is_available():
            logger.info("🎯 MPS (Metal Performance Shaders) available - Using M2 GPU")
            return "mps"
        elif torch.cuda.is_available():
            logger.info("🎯 CUDA available - Using NVIDIA GPU")
            return "cuda"
        else:
            logger.info("⚡ Using CPU (GPU not available)")
            return "cpu"

    def load_model(self):
        """Load Whisper model on CPU (deployment path)"""
        try:
            logger.info(f"Loading Whisper model: {settings.WHISPER_MODEL} on device: {self.device}")
            self.model = whisper.load_model(
                settings.WHISPER_MODEL,
                device=self.device
            )
            logger.info(f"✅ Whisper model loaded successfully on {self.device.upper()}")
        except Exception as e:
            logger.error(f"Failed to load Whisper model on {self.device}: {str(e)}")
            logger.info("🔄 Falling back to CPU...")
            self.device = "cpu"
            self.model = whisper.load_model(settings.WHISPER_MODEL, device="cpu")

    def preprocess_audio(self, audio_path: str) -> str:
        """Preprocess audio with soundfile instead of librosa.output"""
        try:
            # Load audio with librosa for preprocessing
            audio, sr = librosa.load(audio_path, sr=16000)

            # Normalize audio
            audio = librosa.util.normalize(audio)

            # Remove silence (optional - can be configurable)
            audio, _ = librosa.effects.trim(audio, top_db=20)

            # ✅ FIX: Use soundfile instead of librosa.output
            temp_path = audio_path.replace('.', '_preprocessed.')
            sf.write(temp_path, audio, sr)

            logger.info(f"✅ Audio preprocessed and saved to: {temp_path}")
            return temp_path

        except Exception as e:
            logger.warning(f"Audio preprocessing failed: {str(e)}")
            return audio_path  # Return original path if preprocessing fails

    def transcribe_audio(self, audio_path: str, language: str = None) -> Dict:
        """
        Transcribe audio — automatically routes to the best available backend:
          • Mac dev machine  → whisper.cpp (Metal GPU, ~3× faster)
          • Deployment server → openai-whisper (CPU, existing behaviour)
        """
        start_time = time.time()
        lang = language or "en"
        device_label = "whisper.cpp (Metal GPU)" if self.use_whisper_cpp else self.device.upper()

        try:
            if not Path(audio_path).exists():
                raise FileNotFoundError(f"Audio file not found: {audio_path}")

            audio_info = self._get_audio_info(audio_path)
            logger.info(f"🎵 Audio info: {audio_info}")

            processed_path = self.preprocess_audio(audio_path)

            # ── Route to the right backend ────────────────────────────
            if self.use_whisper_cpp:
                # Mac path: whisper.cpp with Metal GPU
                cpp_result = self._transcribe_with_whisper_cpp(processed_path, lang)
                raw_text       = cpp_result["text"]
                word_timestamps = cpp_result["word_timestamps"]
                result_language = cpp_result["language"]
                confidence      = 0.0   # whisper.cpp JSON does not expose token probs
            else:
                # Deployment path: openai-whisper on CPU (unchanged behaviour)
                logger.info(f"🚀 Starting transcription on {self.device.upper()}...")
                result = self.model.transcribe(
                    processed_path,
                    language=lang,
                    word_timestamps=True,
                    temperature=0.0,
                    best_of=5,
                    fp16=(self.device != "cpu")
                )
                logger.info(f"📝 Transcription raw result keys: {list(result.keys())}")
                logger.info(f"📝 Number of segments: {len(result.get('segments', []))}")
                raw_text        = result.get("text", "")
                word_timestamps = self._extract_word_timestamps(result)
                result_language = result.get("language", lang)
                confidence      = self._calculate_confidence(result)
            # ─────────────────────────────────────────────────────────

            processing_time = time.time() - start_time
            logger.info(f"📝 Transcription text length: {len(raw_text)}")
            logger.info(f"📝 Transcription text preview: {raw_text[:100]}...")

            # Clean up preprocessed temp file
            if processed_path != audio_path and Path(processed_path).exists():
                Path(processed_path).unlink(missing_ok=True)
                logger.info(f"🧹 Cleaned up preprocessed file: {processed_path}")

            transcription_result = {
                "raw_text":        raw_text,
                "word_timestamps": word_timestamps,
                "processing_time": round(processing_time, 2),
                "audio_duration":  self._get_audio_duration(audio_path),
                "confidence_score": confidence,
                "language":        result_language,
                "device_used":     device_label,
                "success":         True,
            }

            if not raw_text or raw_text.strip() == "":
                logger.warning("⚠️ Transcription returned empty text!")
                transcription_result["success"] = False
                transcription_result["error_message"] = (
                    "Transcription returned empty text — audio may be silent or too noisy"
                )

            return transcription_result

        except Exception as e:
            logger.error(f"❌ Transcription failed ({device_label}): {str(e)}")
            return {
                "success":         False,
                "error_message":   f"Transcription failed: {str(e)}",
                "device_used":     device_label,
                "processing_time": round(time.time() - start_time, 2),
            }

    def _get_audio_info(self, audio_path: str) -> Dict:
        """Get detailed audio file information"""
        try:
            import soundfile as sf
            audio, sr = sf.read(audio_path)
            return {
                "duration_seconds": len(audio) / sr,
                "sample_rate": sr,
                "channels": audio.shape[1] if len(audio.shape) > 1 else 1,
                "samples": len(audio),
                "max_amplitude": float(np.max(np.abs(audio)))
            }
        except Exception as e:
            logger.warning(f"Could not get audio info: {e}")
            return {"error": str(e)}

    def _extract_word_timestamps(self, result: Dict) -> List[Dict]:
        """Extract word-level timestamps from Whisper result"""
        word_timestamps = []
        for segment in result.get("segments", []):
            for word in segment.get("words", []):
                word_timestamps.append({
                    "word": word.get("word", "").strip(),
                    "start": word.get("start", 0),
                    "end": word.get("end", 0),
                    "confidence": word.get("probability", 0)
                })
        return word_timestamps

    def _get_audio_duration(self, audio_path: str) -> float:
        """Get audio duration using soundfile"""
        try:
            import soundfile as sf
            audio, sr = sf.read(audio_path)
            duration = len(audio) / sr
            return round(duration, 2)
        except Exception as e:
            logger.warning(f"Could not get audio duration: {e}")
            return 0.0

    def _calculate_confidence(self, result: Dict) -> float:
        """Calculate average confidence from word probabilities"""
        confidences = []
        for segment in result.get("segments", []):
            for word in segment.get("words", []):
                if "probability" in word:
                    confidences.append(word["probability"])
        return round(np.mean(confidences), 4) if confidences else 0.0

