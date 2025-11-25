# utils/validation_utils.py
import os
from typing import Dict, Any
import json

class RequestValidator:
    @staticmethod
    def validate_transcription_request(request) -> Dict[str, Any]:
        """Validate transcription request parameters"""
        errors = []
        
        # Check file
        if 'file' not in request.files:
            errors.append("No file provided")
        else:
            file = request.files['file']
            if file.filename == '':
                errors.append("No file selected")
        
        # Validate language parameter
        language = request.form.get('language', 'en')
        if language not in ['en', 'auto', 'fr', 'de', 'es', 'it', 'pt', 'ru', 'ja', 'zh']:
            errors.append(f"Unsupported language: {language}")
        
        # Validate meeting_id format if provided
        meeting_id = request.form.get('meeting_id')
        if meeting_id and len(meeting_id) > 100:
            errors.append("Meeting ID too long")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "params": {
                "file": request.files.get('file'),
                "language": language,
                "meeting_id": meeting_id,
                "word_timestamps": request.form.get('word_timestamps', 'true').lower() == 'true'
            }
        }
    
    @staticmethod
    def validate_extraction_request(request) -> Dict[str, Any]:
        """Validate extraction request parameters"""
        errors = []
        
        try:
            data = request.get_json()
            if not data:
                errors.append("No JSON data provided")
                return {"valid": False, "errors": errors}
            
            # Check required fields
            if 'transcript_text' not in data:
                errors.append("Missing required field: transcript_text")
            else:
                transcript = data['transcript_text']
                if len(transcript) < 10:
                    errors.append("Transcript too short")
                if len(transcript) > 100000:
                    errors.append("Transcript too long")
            
            # Validate agenda_items format
            agenda_items = data.get('agenda_items', [])
            if not isinstance(agenda_items, list):
                errors.append("agenda_items must be a list")
            
            # Validate previous_context format
            previous_context = data.get('previous_context', {})
            if not isinstance(previous_context, dict):
                errors.append("previous_context must be a dictionary")
            
            return {
                "valid": len(errors) == 0,
                "errors": errors,
                "params": data
            }
            
        except json.JSONDecodeError as e:
            return {
                "valid": False,
                "errors": [f"Invalid JSON: {str(e)}"]
            }