import pytest
import json
from unittest.mock import MagicMock, patch
from services.extraction_service import ExtractionService

@pytest.fixture
def extraction_service():
    return ExtractionService()

@patch.object(ExtractionService, '_call_mistral_api')
def test_extract_structured_data_empty_transcript(mock_call, extraction_service):
    result = extraction_service.extract_structured_data("")
    
    assert result["success"] is False
    assert "Transcript cannot be None or empty" in result["error_message"]
    mock_call.assert_not_called()

@patch.object(ExtractionService, '_call_mistral_api')
def test_extract_structured_data_success(mock_call, extraction_service):
    mock_response = json.dumps({
        "decisions": [],
        "actionItems": [],
        "topicsDiscussed": [],
        "attendees": []
    })
    mock_call.return_value = mock_response
    
    result = extraction_service.extract_structured_data("Valid transcript text")
    
    assert result["success"] is True
    assert "extracted_data" in result
    assert result["extracted_data"]["decisions"] == []

@patch.object(ExtractionService, '_call_mistral_api')
def test_extract_structured_data_api_fails(mock_call, extraction_service):
    mock_call.side_effect = Exception("Network error")
    
    result = extraction_service.extract_structured_data("Valid transcript text")
    
    assert result["success"] is False
    assert "Network error" in result["error_message"]

@patch.object(ExtractionService, '_call_mistral_api')
def test_extract_structured_data_malformed_json(mock_call, extraction_service):
    mock_call.return_value = "{ invalid json ]"
    
    result = extraction_service.extract_structured_data("Valid transcript text")
    
    assert result["success"] is False
    assert "Mistral AI returned invalid JSON format" in result["error_message"]

@patch.object(ExtractionService, '_call_mistral_api')
def test_extract_structured_data_defaults(mock_call, extraction_service):
    mock_response = json.dumps({
        "decisions": [], "actionItems": [], "topicsDiscussed": [], "attendees": []
    })
    mock_call.return_value = mock_response
    
    # Should not raise exception
    extraction_service.extract_structured_data("text", agenda_items=None, previous_context=None)
    mock_call.assert_called_once()

def test_parse_ai_response_valid(extraction_service):
    json_str = '{"decisions": [], "actionItems": [], "topicsDiscussed": [], "attendees": []}'
    result = extraction_service._parse_ai_response(json_str)
    assert isinstance(result, dict)

def test_parse_ai_response_markdown_json(extraction_service):
    json_str = '```json\n{"decisions": [], "actionItems": [], "topicsDiscussed": [], "attendees": []}\n```'
    result = extraction_service._parse_ai_response(json_str)
    assert isinstance(result, dict)

def test_parse_ai_response_markdown_no_tag(extraction_service):
    json_str = '```\n{"decisions": [], "actionItems": [], "topicsDiscussed": [], "attendees": []}\n```'
    result = extraction_service._parse_ai_response(json_str)
    assert isinstance(result, dict)

def test_parse_ai_response_invalid_json(extraction_service):
    json_str = '{ bad }'
    with pytest.raises(Exception, match="Mistral AI returned invalid JSON format"):
        extraction_service._parse_ai_response(json_str)

def test_parse_ai_response_missing_section(extraction_service):
    json_str = '{"actionItems": [], "topicsDiscussed": [], "attendees": []}'
    with pytest.raises(ValueError, match="Missing required section: decisions"):
        extraction_service._parse_ai_response(json_str)

def test_parse_ai_response_invalid_section_type(extraction_service):
    json_str = '{"decisions": {}, "actionItems": [], "topicsDiscussed": [], "attendees": []}'
    with pytest.raises(ValueError, match="Section decisions must be a list"):
        extraction_service._parse_ai_response(json_str)

def test_validate_extraction_schema(extraction_service):
    valid_data = {"decisions": [], "actionItems": [], "topicsDiscussed": [], "attendees": []}
    extraction_service._validate_extraction_schema(valid_data)  # Should not raise
    
    invalid_missing = {"decisions": [], "topicsDiscussed": [], "attendees": []}
    with pytest.raises(ValueError):
        extraction_service._validate_extraction_schema(invalid_missing)
        
    invalid_type = {"decisions": [], "actionItems": [], "topicsDiscussed": [], "attendees": {}}
    with pytest.raises(ValueError):
        extraction_service._validate_extraction_schema(invalid_type)

@patch('requests.post')
def test_call_mistral_api_success(mock_post, extraction_service):
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "choices": [{"message": {"content": "result_text"}}]
    }
    mock_post.return_value = mock_response
    
    result = extraction_service._call_mistral_api("prompt")
    
    assert result == "result_text"

@patch('requests.post')
def test_call_mistral_api_unauthorized(mock_post, extraction_service):
    from requests.exceptions import HTTPError
    mock_post.side_effect = HTTPError("401 Unauthorized")
    
    with pytest.raises(Exception, match="Mistral API request failed: 401 Unauthorized"):
        extraction_service._call_mistral_api("prompt")

@patch('requests.post')
def test_call_mistral_api_no_choices(mock_post, extraction_service):
    mock_response = MagicMock()
    mock_response.json.return_value = {}
    mock_post.return_value = mock_response
    
    with pytest.raises(Exception, match="No choices in Mistral API response"):
        extraction_service._call_mistral_api("prompt")
