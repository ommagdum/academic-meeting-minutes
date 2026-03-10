import time
import logging
import os
import numpy as np
import soundfile as sf
import platform
from pathlib import Path
from services.transcription_service import TranscriptionService

# Configure logging to show only info/errors
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger("Benchmark")

# ---------------------------------------------------------
# Helper: Force CPU Usage by using standard whisper
# ---------------------------------------------------------
class CpuTranscriptionService(TranscriptionService):
    """Subclass that forces CPU usage for benchmarking comparison."""
    def _get_optimal_device(self) -> str:
        logger.info("🔒 Forcing CPU mode for baseline comparison")
        return "cpu"
    
    def load_model(self):
        """Load standard OpenAI Whisper on CPU"""
        try:
            import whisper
            logger.info("Loading standard Whisper model on CPU...")
            from config.config import settings
            self.model = whisper.load_model(settings.WHISPER_MODEL, device="cpu")
            self.whisper_module = whisper
            logger.info("✅ Standard Whisper model loaded on CPU")
        except Exception as e:
            logger.error(f"Failed to load CPU model: {e}")
            raise
    
    def transcribe_audio(self, audio_path: str, language: str = None):
        """Transcribe using standard Whisper on CPU"""
        start_time = time.time()
        try:
            if not Path(audio_path).exists():
                raise FileNotFoundError(f"Audio file not found: {audio_path}")
            
            processed_path = self.preprocess_audio(audio_path)
            
            logger.info("🚀 Starting transcription on CPU...")
            result = self.model.transcribe(
                processed_path,
                language=language or 'en',
                word_timestamps=True,
                temperature=0.0,
                best_of=5,
                fp16=False
            )
            
            processing_time = time.time() - start_time
            
            if processed_path != audio_path and Path(processed_path).exists():
                Path(processed_path).unlink(missing_ok=True)
            
            return {
                "raw_text": result.get("text", ""),
                "word_timestamps": self._extract_word_timestamps(result),
                "processing_time": round(processing_time, 2),
                "device_used": "CPU",
                "success": True
            }
        except Exception as e:
            logger.error(f"CPU transcription failed: {e}")
            return {
                "success": False,
                "error_message": str(e),
                "device_used": "CPU",
                "processing_time": round(time.time() - start_time, 2)
            }

# ---------------------------------------------------------
# Helper: Generate Dummy Audio if missing
# ---------------------------------------------------------
def ensure_audio_file(filename="meeting.mp3", duration_sec=30):
    """Generate realistic test audio with speech-like characteristics"""
    if os.path.exists(filename):
        return filename
    
    logger.info(f"⚠️ No audio file found. Generating {duration_sec}s dummy audio: {filename}")
    sr = 16000
    t = np.linspace(0, duration_sec, int(sr * duration_sec))
    
    # Generate more complex audio that resembles speech patterns
    audio = (
        0.3 * np.sin(2 * np.pi * 200 * t) * (1 + 0.5 * np.sin(2 * np.pi * 3 * t)) +
        0.2 * np.sin(2 * np.pi * 400 * t) * (1 + 0.3 * np.sin(2 * np.pi * 5 * t)) +
        0.1 * np.sin(2 * np.pi * 800 * t) * (1 + 0.2 * np.sin(2 * np.pi * 7 * t))
    )
    
    # Add some noise
    audio += 0.05 * np.random.randn(len(audio))
    
    # Normalize
    audio = audio / np.max(np.abs(audio)) * 0.9
    
    sf.write(filename, audio, sr)
    logger.info(f"✅ Generated test audio: {filename}")
    return filename

# ---------------------------------------------------------
# System Info Check
# ---------------------------------------------------------
def print_system_info():
    """Display system configuration"""
    print("\n" + "="*60)
    print("🖥️  SYSTEM INFORMATION")
    print("="*60)
    print(f"Platform: {platform.platform()}")
    print(f"Processor: {platform.processor()}")
    print(f"Python: {platform.python_version()}")
    
    try:
        import mlx.core as mx
        print(f"MLX Available: ✅ (Apple Silicon optimized)")
    except:
        print(f"MLX Available: ❌ (Install with: pip install mlx-whisper)")
    
    is_apple_silicon = platform.processor() == 'arm'
    if is_apple_silicon:
        print("✅ Apple Silicon detected - MLX will use GPU acceleration!")
    else:
        print("⚠️  Not Apple Silicon - MLX may not provide GPU acceleration")
    print()

# ---------------------------------------------------------
# Benchmark Logic
# ---------------------------------------------------------
def run_benchmark(audio_file: str = None, num_runs: int = 3):
    """
    Run comprehensive benchmark comparing CPU vs MLX (Apple Silicon GPU).
    
    Args:
        audio_file: Path to audio file (if None, generates test audio)
        num_runs: Number of test runs per device (for averaging)
    """
    # Display system info
    print_system_info()
    
    # Ensure we have an audio file
    if audio_file is None:
        audio_file = ensure_audio_file(duration_sec=30)
    
    if not os.path.exists(audio_file):
        print(f"❌ Error: Audio file not found: {audio_file}")
        return
    
    print("="*60)
    print(f"🚀  STARTING BENCHMARK")
    print("="*60)
    print(f"📁 Audio File: {audio_file}")
    print(f"🔁 Number of runs per device: {num_runs}")
    print()

    cpu_times = []
    mlx_times = []
    detected_device = "MLX"

    # --- TEST 1: CPU (Baseline) ---
    print("🔹 TEST 1: CPU Baseline (Standard Whisper)")
    print("-" * 60)
    try:
        print("Loading standard Whisper model on CPU...")
        start_load = time.time()
        cpu_service = CpuTranscriptionService()
        load_time_cpu = time.time() - start_load
        print(f"✅ Model loaded in {load_time_cpu:.2f}s")
        
        # Run multiple times for average
        for i in range(num_runs):
            print(f"   Run {i+1}/{num_runs}...", end=" ", flush=True)
            result_cpu = cpu_service.transcribe_audio(audio_file)
            
            if not result_cpu['success']:
                print(f"❌ Error: {result_cpu.get('error_message')}")
                continue
            
            time_cpu = result_cpu['processing_time']
            cpu_times.append(time_cpu)
            print(f"✅ {time_cpu:.2f}s")
        
        if cpu_times:
            avg_cpu = np.mean(cpu_times)
            print(f"\n📊 CPU Average: {avg_cpu:.2f}s (± {np.std(cpu_times):.2f}s)")
        else:
            print("\n❌ All CPU runs failed")
            avg_cpu = None
            
    except Exception as e:
        print(f"❌ CPU Benchmark Failed: {e}")
        avg_cpu = None

    print("\n" + "="*60 + "\n")

    # --- TEST 2: MLX (Apple Silicon GPU) ---
    print("🔸 TEST 2: MLX Whisper (Apple Silicon GPU)")
    print("-" * 60)
    try:
        print("Loading MLX Whisper model...")
        start_load = time.time()
        mlx_service = TranscriptionService()
        load_time_mlx = time.time() - start_load
        
        detected_device = mlx_service.device.upper()
        print(f"✅ Device: {detected_device}")
        print(f"✅ Model loaded in {load_time_mlx:.2f}s")
        
        # Warmup run (GPU needs warmup for accurate timing)
        if detected_device == "MLX":
            print("🔥 Warming up Apple Silicon GPU...", end=" ", flush=True)
            mlx_service.transcribe_audio(audio_file)
            print("Done")
        
        # Run multiple times for average
        for i in range(num_runs):
            print(f"   Run {i+1}/{num_runs}...", end=" ", flush=True)
            result_mlx = mlx_service.transcribe_audio(audio_file)
            
            if not result_mlx['success']:
                print(f"❌ Error: {result_mlx.get('error_message')}")
                continue
            
            time_mlx = result_mlx['processing_time']
            mlx_times.append(time_mlx)
            print(f"✅ {time_mlx:.2f}s")
        
        if mlx_times:
            avg_mlx = np.mean(mlx_times)
            print(f"\n📊 {detected_device} Average: {avg_mlx:.2f}s (± {np.std(mlx_times):.2f}s)")
        else:
            print(f"\n❌ All {detected_device} runs failed")
            avg_mlx = None

    except Exception as e:
        print(f"❌ MLX Benchmark Failed: {e}")
        print("💡 Make sure mlx-whisper is installed: pip install mlx-whisper")
        avg_mlx = None

    # --- FINAL SUMMARY ---
    print("\n" + "="*60)
    print("📊  FINAL RESULTS")
    print("="*60)
    
    if avg_cpu and avg_mlx:
        print(f"🐢 CPU Average:        {avg_cpu:.2f}s")
        print(f"🚀 MLX Average:        {avg_mlx:.2f}s")
        print("-" * 60)
        
        if avg_mlx < avg_cpu:
            speedup = avg_cpu / avg_mlx
            improvement = ((avg_cpu - avg_mlx) / avg_cpu) * 100
            print(f"✨ SPEEDUP:           {speedup:.2f}x FASTER on {detected_device}")
            print(f"⚡ IMPROVEMENT:       {improvement:.1f}% faster")
            print(f"⏱️  TIME SAVED:        {avg_cpu - avg_mlx:.2f}s per transcription")
        else:
            slowdown = avg_mlx / avg_cpu
            print(f"⚠️  {detected_device} was {slowdown:.2f}x SLOWER than CPU")
            print("\n💡 Note: This is unexpected for MLX on Apple Silicon")
    
    elif avg_cpu:
        print(f"🐢 CPU Average: {avg_cpu:.2f}s")
        print(f"❌ {detected_device} failed - no comparison available")
    elif avg_mlx:
        print(f"❌ CPU failed - no comparison available")
        print(f"🚀 {detected_device} Average: {avg_mlx:.2f}s")
    else:
        print("❌ Both tests failed - cannot calculate speedup")
    
    print("="*60 + "\n")
    
    # Return results for programmatic use
    return {
        "cpu_times": cpu_times,
        "mlx_times": mlx_times,
        "avg_cpu": avg_cpu,
        "avg_mlx": avg_mlx,
        "device": detected_device,
        "speedup": avg_cpu / avg_mlx if (avg_cpu and avg_mlx) else None
    }

# ---------------------------------------------------------
# Main Entry Point
# ---------------------------------------------------------
if __name__ == "__main__":
    import sys
    
    # Allow command-line audio file specification
    audio_file = sys.argv[1] if len(sys.argv) > 1 else None
    
    try:
        results = run_benchmark(audio_file=audio_file, num_runs=3)
        
        # Exit with appropriate code
        if results["speedup"] and results["speedup"] > 1.0:
            print("✅ Apple Silicon GPU acceleration is working correctly!")
            sys.exit(0)
        elif results["device"] == "CPU":
            print("⚠️  GPU not detected - using CPU only")
            sys.exit(1)
        else:
            print("⚠️  GPU detected but not providing speedup")
            sys.exit(2)
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Benchmark interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ Benchmark failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)