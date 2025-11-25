# services/file_upload_service.py - FIXED VERSION
import os
import uuid
from pathlib import Path
from werkzeug.utils import secure_filename
import magic
from typing import Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class FileUploadService:
    def __init__(self, upload_folder: str, allowed_extensions: set, max_file_size: int):
        """Initialize with configuration parameters instead of using current_app"""
        self.upload_folder = Path(upload_folder)
        self.allowed_extensions = allowed_extensions
        self.max_file_size = max_file_size
        
        # Ensure upload directory exists
        self.upload_folder.mkdir(parents=True, exist_ok=True)
        logger.info(f"FileUploadService initialized with upload folder: {self.upload_folder}")
    
    def save_uploaded_file(self, file) -> Tuple[bool, Optional[str], Optional[str]]:
        """Save uploaded file and return (success, file_path, error_message)"""
        try:
            # Validate file presence
            if not file or file.filename == '':
                return False, None, "No file provided"
            
            # Validate file extension
            if not self._allowed_file(file.filename):
                return False, None, f"File type not allowed. Allowed: {self.allowed_extensions}"
            
            # Validate file size
            file.seek(0, 2)  # Seek to end to get size
            file_size = file.tell()
            file.seek(0)  # Reset file pointer
            
            if file_size > self.max_file_size:
                return False, None, f"File too large. Max size: {self.max_file_size // (1024*1024)}MB"
            
            if file_size == 0:
                return False, None, "Empty file"
            
            # Generate unique filename
            file_extension = Path(file.filename).suffix.lower()
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = self.upload_folder / unique_filename
            
            # Save file
            file.save(file_path)
            
            # Validate file content (MIME type)
            is_valid, mime_error = self._validate_file_content(file_path)
            if not is_valid:
                file_path.unlink(missing_ok=True)  # Delete invalid file
                return False, None, f"Invalid file content: {mime_error}"
            
            logger.info(f"File saved successfully: {file_path}")
            return True, str(file_path), None
            
        except Exception as e:
            logger.error(f"File upload failed: {str(e)}")
            return False, None, f"Upload failed: {str(e)}"
    
    def _allowed_file(self, filename: str) -> bool:
        """Check if file extension is allowed"""
        return '.' in filename and \
               Path(filename).suffix.lower()[1:] in self.allowed_extensions
    
    def _validate_file_content(self, file_path: Path) -> Tuple[bool, Optional[str]]:
        """Validate file content using magic numbers"""
        try:
            mime = magic.Magic(mime=True)
            file_mime = mime.from_file(str(file_path))
            
            allowed_mime_types = {
                'audio/mpeg': 'mp3',
                'audio/wav': 'wav',
                'audio/x-wav': 'wav',
                'audio/mp4': 'm4a',
                'audio/x-m4a': 'm4a',
                'audio/flac': 'flac',
                'audio/ogg': 'ogg',
                'audio/webm': 'webm'
            }
            
            if file_mime not in allowed_mime_types:
                return False, f"Unsupported MIME type: {file_mime}"
            
            return True, None
            
        except Exception as e:
            return False, f"MIME validation failed: {str(e)}"
    
    def cleanup_file(self, file_path: str) -> bool:
        """Delete uploaded file after processing"""
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
                logger.info(f"Cleaned up file: {file_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"File cleanup failed for {file_path}: {str(e)}")
            return False
    
    def get_file_info(self, file_path: str) -> Optional[dict]:
        """Get information about uploaded file"""
        try:
            path = Path(file_path)
            if not path.exists():
                return None
            
            return {
                "file_size": path.stat().st_size,
                "file_name": path.name,
                "file_extension": path.suffix,
                "created_time": path.stat().st_ctime
            }
        except Exception as e:
            logger.error(f"Failed to get file info: {str(e)}")
            return None