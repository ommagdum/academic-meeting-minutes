# services/transcription_service.py - FIXED VERSION

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
    def __init__(self):
        self.model = None
        self.device = "cpu"
        self.load_model()

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
        """Load Whisper model optimized for M2 GPU"""
        try:
            logger.info(f"Loading Whisper model: {settings.WHISPER_MODEL} on device: {self.device}")
            # Load model with device specification
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
        """Transcribe audio file with enhanced logging"""
        start_time = time.time()
        try:
            # Validate audio file exists
            if not Path(audio_path).exists():
                raise FileNotFoundError(f"Audio file not found: {audio_path}")

            # Get audio info before processing
            audio_info = self._get_audio_info(audio_path)
            logger.info(f"🎵 Audio info: {audio_info}")

            # Preprocess audio
            processed_path = self.preprocess_audio(audio_path)

            # GPU-optimized transcription parameters
            logger.info(f"🚀 Starting transcription on {self.device.upper()}...")
            result = self.model.transcribe(
                processed_path,
                language=language or 'en',
                word_timestamps=True,
                temperature=0.0,   # Deterministic output
                best_of=5,         # Better accuracy with multiple attempts
                fp16=(self.device != "cpu")
            )

            # ✅ FIX: Enhanced logging of transcription results
            logger.info(f"📝 Transcription raw result keys: {list(result.keys())}")
            logger.info(f"📝 Transcription text length: {len(result.get('text', ''))}")
            logger.info(f"📝 Transcription text preview: {result.get('text', '')[:100]}...")
            logger.info(f"📝 Number of segments: {len(result.get('segments', []))}")

            # Calculate processing time
            processing_time = time.time() - start_time

            # Clean up preprocessed file if created
            if processed_path != audio_path and Path(processed_path).exists():
                Path(processed_path).unlink(missing_ok=True)
                logger.info(f"🧹 Cleaned up preprocessed file: {processed_path}")

            transcription_result = {
                "raw_text": result.get("text", ""),
                "word_timestamps": self._extract_word_timestamps(result),
                "processing_time": round(processing_time, 2),
                "audio_duration": self._get_audio_duration(audio_path),
                "confidence_score": self._calculate_confidence(result),
                "language": result.get("language", "en"),
                "device_used": self.device.upper(),
                "success": True
            }

            # ✅ FIX: Validate that we actually got text
            if not transcription_result["raw_text"] or transcription_result["raw_text"].strip() == "":
                logger.warning("⚠️ Transcription returned empty text!")
                transcription_result["success"] = False
                transcription_result["error_message"] = "Transcription returned empty text - audio may be silent or too noisy"

            return transcription_result

        except Exception as e:
            logger.error(f"❌ Transcription failed on {self.device}: {str(e)}")
            return {
                "success": False,
                "error_message": f"Transcription failed: {str(e)}",
                "device_used": self.device.upper(),
                "processing_time": round(time.time() - start_time, 2)
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

