import pytest
import os
from unittest.mock import MagicMock
from pathlib import Path

@pytest.fixture
def mock_file():
    file = MagicMock()
    file.filename = 'test.mp3'
    # Mocking standard file methods
    file.tell.return_value = 1024
    def mock_seek(offset, whence=0):
        pass
    file.seek.side_effect = mock_seek
    return file
