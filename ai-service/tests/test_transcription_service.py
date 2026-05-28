import pytest
from unittest.mock import MagicMock, patch
from services.transcription_service import TranscriptionService

@pytest.fixture
def transcription_service():
    with patch('whisper.load_model'):
        service = TranscriptionService()
        return service

@patch('pathlib.Path.exists')
def test_transcribe_audio_not_found(mock_exists, transcription_service):
    mock_exists.return_value = False
    
    result = transcription_service.transcribe_audio("fake_path.mp3")
    
    assert result["success"] is False
    assert "Audio file not found" in result["error_message"]

@patch('pathlib.Path.exists')
@patch.object(TranscriptionService, 'preprocess_audio')
@patch.object(TranscriptionService, '_get_audio_info')
def test_transcribe_audio_success(mock_audio_info, mock_preprocess, mock_exists, transcription_service):
    mock_exists.return_value = True
    mock_preprocess.return_value = "processed.mp3"
    mock_audio_info.return_value = {}
    
    mock_model = MagicMock()
    mock_model.transcribe.return_value = {
        "text": "Hello world",
        "language": "en",
        "segments": [
            {
                "words": [
                    {"word": "Hello", "start": 0.0, "end": 0.5, "probability": 0.9},
                    {"word": "world", "start": 0.5, "end": 1.0, "probability": 0.95}
                ]
            }
        ]
    }
    transcription_service.model = mock_model
    
    with patch.object(TranscriptionService, '_get_audio_duration', return_value=1.0):
        result = transcription_service.transcribe_audio("real_path.mp3")
    
    assert result["success"] is True
    assert result["raw_text"] == "Hello world"
    assert result["confidence_score"] == 0.925
    assert len(result["word_timestamps"]) == 2

@patch('pathlib.Path.exists')
@patch.object(TranscriptionService, 'preprocess_audio')
@patch.object(TranscriptionService, '_get_audio_info')
def test_transcribe_audio_empty_text(mock_audio_info, mock_preprocess, mock_exists, transcription_service):
    mock_exists.return_value = True
    mock_preprocess.return_value = "processed.mp3"
    mock_audio_info.return_value = {}
    
    mock_model = MagicMock()
    mock_model.transcribe.return_value = {
        "text": "   ",
        "language": "en"
    }
    transcription_service.model = mock_model
    
    with patch.object(TranscriptionService, '_get_audio_duration', return_value=1.0):
        result = transcription_service.transcribe_audio("real_path.mp3")
    
    assert result["success"] is False
    assert "returned empty text" in result["error_message"]

@patch('pathlib.Path.exists')
@patch.object(TranscriptionService, 'preprocess_audio')
@patch.object(TranscriptionService, '_get_audio_info')
def test_transcribe_audio_exception(mock_audio_info, mock_preprocess, mock_exists, transcription_service):
    mock_exists.return_value = True
    mock_preprocess.return_value = "processed.mp3"
    mock_audio_info.return_value = {}
    
    mock_model = MagicMock()
    mock_model.transcribe.side_effect = Exception("Model crashed")
    transcription_service.model = mock_model
    
    result = transcription_service.transcribe_audio("real_path.mp3")
    
    assert result["success"] is False
    assert "Model crashed" in result["error_message"]

def test_calculate_confidence(transcription_service):
    result = {
        "segments": [
            {
                "words": [
                    {"probability": 0.9},
                    {"probability": 0.8},
                    {"probability": 1.0}
                ]
            }
        ]
    }
    assert transcription_service._calculate_confidence(result) == 0.9

def test_calculate_confidence_no_words(transcription_service):
    assert transcription_service._calculate_confidence({}) == 0.0

def test_calculate_confidence_no_probability(transcription_service):
    result = {
        "segments": [
            {"words": [{"word": "test"}]}
        ]
    }
    assert transcription_service._calculate_confidence(result) == 0.0

def test_extract_word_timestamps(transcription_service):
    result = {
        "segments": [
            {
                "words": [
                    {"word": "Hello", "start": 0.0, "end": 0.5, "probability": 0.9},
                    {"word": "world", "start": 0.5, "end": 1.0, "probability": 0.95}
                ]
            }
        ]
    }
    
    timestamps = transcription_service._extract_word_timestamps(result)
    
    assert len(timestamps) == 2
    assert timestamps[0]["word"] == "Hello"
    assert timestamps[0]["start"] == 0.0
    assert timestamps[0]["confidence"] == 0.9

def test_extract_word_timestamps_empty(transcription_service):
    assert transcription_service._extract_word_timestamps({"segments": []}) == []
    assert transcription_service._extract_word_timestamps({"segments": [{"nowords": "test"}]}) == []
