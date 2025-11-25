# app.py - FIXED VERSION
from flask import Flask, request, jsonify
from datetime import datetime
import logging
from pathlib import Path
import os
import json

from config.config import settings
from services.file_uplod_service import FileUploadService
from services.transcription_service import TranscriptionService
from services.extraction_service import ExtractionService
from services.fallback_service import FallbackExtractionService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configure Flask from settings
app.config['UPLOAD_FOLDER'] = settings.UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = settings.MAX_CONTENT_LENGTH
app.config['ALLOWED_EXTENSIONS'] = settings.ALLOWED_EXTENSIONS

# Initialize services AFTER app configuration
file_upload_service = None
transcription_service = None
extraction_service = None

def initialize_services():
    """Initialize services with app configuration"""
    global file_upload_service, transcription_service, extraction_service
    
    file_upload_service = FileUploadService(
        upload_folder=app.config['UPLOAD_FOLDER'],
        allowed_extensions=app.config['ALLOWED_EXTENSIONS'],
        max_file_size=app.config['MAX_CONTENT_LENGTH']
    )
    
    transcription_service = TranscriptionService()
    extraction_service = ExtractionService()
    
    logger.info("All services initialized successfully")

@app.before_request
def before_first_request():
    """Initialize services before the first request"""
    global file_upload_service
    if file_upload_service is None:
        initialize_services()

@app.route('/ai/transcribe', methods=['POST'])
def transcribe_audio():
    """Transcribe uploaded audio file"""
    file_path = None  # Track file for cleanup
    
    try:
        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({
                "success": False,
                "error_message": "No file provided in request"
            }), 400
        
        file = request.files['file']
        
        # Get additional parameters from form data
        language = request.form.get('language', 'en')
        meeting_id = request.form.get('meeting_id')

        logger.info(f"🔧 DEBUG: Received meeting_id from form: {meeting_id}")
        logger.info(f"🔧 DEBUG: Form data keys: {list(request.form.keys())}")
        logger.info(f"🔧 DEBUG: File keys: {list(request.files.keys())}")
        
        # Save uploaded file
        success, file_path, error_msg = file_upload_service.save_uploaded_file(file)
        if not success:
            return jsonify({
                "success": False,
                "error_message": error_msg
            }), 400
        
        logger.info(f"Processing audio file: {file_path} for meeting: {meeting_id}")
        
        # Perform transcription
        result = transcription_service.transcribe_audio(file_path, language)
        
        # Auto-cleanup if enabled
        if settings.CLEANUP_UPLOADS and file_path:
            file_upload_service.cleanup_file(file_path)
        
        if result['success']:
            # Add meeting ID to result if provided
            if meeting_id:
                result['meeting_id'] = meeting_id
                
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        # Ensure cleanup on error
        if file_path and file_upload_service:
            file_upload_service.cleanup_file(file_path)
            
        logger.error(f"Transcription endpoint error: {str(e)}")
        return jsonify({
            "success": False,
            "error_message": f"Internal server error: {str(e)}"
        }), 500

@app.route('/ai/extract', methods=['POST'])
def extract_meeting_data():
    """Extract structured meeting data from transcript"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error_message": "No JSON data provided"
            }), 400
        
        # Validate required fields
        required_fields = ['transcript_text']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "success": False,
                    "error_message": f"Missing required field: {field}"
                }), 400
        
        transcript = data['transcript_text']
        agenda_items = data.get('agenda_items', [])
        previous_context = data.get('previous_context', {})
        meeting_id = data.get('meeting_id')

        if not meeting_id:
            logger.warning("⚠️  No meeting_id provided for extraction, using 'unknown'")
            meeting_id = "unknown"
        
        logger.info(f"Extracting data for meeting: {meeting_id}")

        if not transcript or transcript.strip() == "":
            logger.error("❌ Empty transcript provided for extraction")
            return jsonify({
                "success": False,
                "error_message": "Empty transcript provided"
            }), 400
        
        # Perform extraction
        result = extraction_service.extract_structured_data(
            transcript, agenda_items, previous_context
        )
        
        # Fallback if extraction fails
        if not result['success'] and settings.ENABLE_FALLBACK:
            logger.info("Using fallback extraction service")
            fallback_data = FallbackExtractionService.basic_extraction(transcript)
            result = {
                "extracted_data": fallback_data,
                "processing_time": result.get('processing_time', 0),
                "model_version": "fallback-rules",
                "confidence_score": 0.3,
                "success": True,
                "fallback_used": True
            }
        
        # Add meeting ID to result if provided
        if meeting_id:
            result['meeting_id'] = meeting_id
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Extraction endpoint error: {str(e)}")
        return jsonify({
            "success": False,
            "error_message": f"Internal server error: {str(e)}"
        }), 500

@app.route('/ai/health', methods=['GET'])
def health_check():
    """Comprehensive health check"""
    try:
        # Test Mistral API connectivity
        test_prompt = "Respond with 'OK'"
        extraction_service._call_mistral_api(test_prompt)
        api_status = "healthy"
    except Exception as e:
        api_status = f"unhealthy: {str(e)}"
    
    # Test disk space
    try:
        upload_path = Path(settings.UPLOAD_FOLDER)
        if upload_path.exists():
            statvfs = os.statvfs(upload_path)
            free_space_gb = (statvfs.f_frsize * statvfs.f_bavail) / (1024 ** 3)
        else:
            free_space_gb = 0
    except:
        free_space_gb = 0
    
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "academic-meeting-ai-service",
        "components": {
            "whisper": "healthy",
            "mistral_api": api_status,
            "file_upload": "healthy",
            "disk_space_gb": round(free_space_gb, 2)
        },
        "version": "1.0.0"
    })

@app.route('/')
def hello():
    return "🚀 Academic Meeting Minutes AI Service is running!"

if __name__ == '__main__':
    # Ensure upload directory exists
    upload_path = Path(settings.UPLOAD_FOLDER)
    upload_path.mkdir(parents=True, exist_ok=True)
    
    # Initialize services
    initialize_services()
    
    print("🚀 Starting Academic Meeting Minutes AI Service...")
    print(f"📍 Upload folder: {settings.UPLOAD_FOLDER}")
    print("📍 Health check available at: http://localhost:5001/ai/health")
    print("📍 Transcription endpoint: http://localhost:5001/ai/transcribe")
    print("📍 Extraction endpoint: http://localhost:5001/ai/extract")
    
    app.run(
        host=settings.FLASK_HOST,
        port=settings.FLASK_PORT,
        debug=settings.DEBUG
    )