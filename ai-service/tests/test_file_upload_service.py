import pytest
from unittest.mock import MagicMock, patch
from pathlib import Path
from services.file_uplod_service import FileUploadService

@pytest.fixture
def file_upload_service(tmp_path):
    allowed_extensions = {'mp3', 'wav', 'm4a'}
    max_file_size = 50 * 1024 * 1024  # 50 MB
    return FileUploadService(str(tmp_path), allowed_extensions, max_file_size)

def test_save_uploaded_file_no_file(file_upload_service):
    file = MagicMock()
    file.filename = ''
    
    success, path, error = file_upload_service.save_uploaded_file(file)
    
    assert not success
    assert path is None
    assert error == "No file provided"

def test_save_uploaded_file_not_allowed_extension(file_upload_service, mock_file):
    mock_file.filename = 'test.exe'
    
    success, path, error = file_upload_service.save_uploaded_file(mock_file)
    
    assert not success
    assert path is None
    assert "File type not allowed" in error

def test_save_uploaded_file_too_large(file_upload_service, mock_file):
    mock_file.tell.return_value = 100 * 1024 * 1024  # 100 MB
    
    success, path, error = file_upload_service.save_uploaded_file(mock_file)
    
    assert not success
    assert path is None
    assert "File too large" in error

def test_save_uploaded_file_empty(file_upload_service, mock_file):
    mock_file.tell.return_value = 0
    
    success, path, error = file_upload_service.save_uploaded_file(mock_file)
    
    assert not success
    assert path is None
    assert error == "Empty file"

@patch('magic.Magic')
def test_save_uploaded_file_valid_mp3(mock_magic, file_upload_service, mock_file):
    mock_mime = MagicMock()
    mock_mime.from_file.return_value = 'audio/mpeg'
    mock_magic.return_value = mock_mime
    mock_file.filename = 'recording.mp3'
    
    success, path, error = file_upload_service.save_uploaded_file(mock_file)
    
    assert success
    assert path is not None
    assert path.endswith('.mp3')
    assert error is None
    mock_file.save.assert_called_once()

@patch('magic.Magic')
def test_save_uploaded_file_mime_mismatch(mock_magic, file_upload_service, mock_file):
    mock_mime = MagicMock()
    mock_mime.from_file.return_value = 'video/mp4'
    mock_magic.return_value = mock_mime
    mock_file.filename = 'recording.mp3'
    
    success, path, error = file_upload_service.save_uploaded_file(mock_file)
    
    assert not success
    assert path is None
    assert "Unsupported MIME type" in error
    mock_file.save.assert_called_once()

def test_allowed_file(file_upload_service):
    assert file_upload_service._allowed_file("recording.mp3") is True
    assert file_upload_service._allowed_file("recording.wav") is True
    assert file_upload_service._allowed_file("document.pdf") is False
    assert file_upload_service._allowed_file("malicious") is False
    assert file_upload_service._allowed_file(".mp3") is True

@patch('pathlib.Path.unlink')
@patch('pathlib.Path.exists')
def test_cleanup_file_existing(mock_exists, mock_unlink, file_upload_service):
    mock_exists.return_value = True
    
    result = file_upload_service.cleanup_file("/tmp/fake.mp3")
    
    assert result is True
    mock_unlink.assert_called_once()

@patch('pathlib.Path.exists')
def test_cleanup_file_non_existent(mock_exists, file_upload_service):
    mock_exists.return_value = False
    
    result = file_upload_service.cleanup_file("/tmp/fake.mp3")
    
    assert result is False

@patch('pathlib.Path.unlink')
@patch('pathlib.Path.exists')
def test_cleanup_file_os_error(mock_exists, mock_unlink, file_upload_service):
    mock_exists.return_value = True
    mock_unlink.side_effect = OSError("Permission denied")
    
    result = file_upload_service.cleanup_file("/tmp/fake.mp3")
    
    assert result is False
