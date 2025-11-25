import os
from pathlib import Path
import magic
from typing import Tuple

class AudioValidator:
    SUPPORTED_MIME_TYPES = {
        'audio/mpeg': '.mp3',
        'audio/wav': '.wav',
        'audio/x-wav': '.wav',
        'audio/mp4': '.m4a',
        'audio/x-m4a': '.m4a',
        'audio/flac': '.flac',
        'audio/ogg': '.ogg',
        'audio/webm': '.webm'
    }
    
    @staticmethod
    def validate_audio_file(file_path: str) -> Tuple[bool, str]:
        """Validate audio file format and accessibility"""
        try:
            # Check file exists
            if not Path(file_path).exists():
                return False, "File does not exist"
            
            # Check file size (500MB limit)
            file_size = Path(file_path).stat().st_size
            if file_size > 500 * 1024 * 1024:  # 500MB
                return False, "File size exceeds 500MB limit"
            
            # Check MIME type
            mime = magic.Magic(mime=True)
            file_mime = mime.from_file(file_path)
            
            if file_mime not in AudioValidator.SUPPORTED_MIME_TYPES:
                return False, f"Unsupported audio format: {file_mime}"
            
            return True, "Valid audio file"
            
        except Exception as e:
            return False, f"Validation error: {str(e)}"