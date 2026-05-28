package com.meetingminutes.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class FileUploadServiceTest {

    @InjectMocks
    private FileUploadService fileUploadService;

    @Mock
    private MultipartFile multipartFile;

    @TempDir
    Path tempDir;

    private UUID meetingId;
    private long maxFileSize = 524288000L; // 500MB

    @BeforeEach
    void setUp() {
        meetingId = UUID.randomUUID();
        ReflectionTestUtils.setField(fileUploadService, "maxFileSize", maxFileSize);
        ReflectionTestUtils.setField(fileUploadService, "tempUploadDirectory", tempDir.toString());
    }

    // --- uploadAudioFile / validateAudioFile Tests ---

    @Test
    void uploadAudioFile_FileSizeExceedsMax_ThrowsException() {
        when(multipartFile.getSize()).thenReturn(maxFileSize + 1);

        Exception exception = assertThrows(RuntimeException.class, () -> 
                fileUploadService.uploadAudioFile(multipartFile, meetingId));
        assertTrue(exception.getMessage().contains("File size too large"));
    }

    @Test
    void uploadAudioFile_FileIsEmpty_ThrowsException() {
        when(multipartFile.getSize()).thenReturn(100L);
        when(multipartFile.isEmpty()).thenReturn(true);

        Exception exception = assertThrows(RuntimeException.class, () -> 
                fileUploadService.uploadAudioFile(multipartFile, meetingId));
        assertEquals("Uploaded file is empty", exception.getMessage());
    }

    @Test
    void uploadAudioFile_ContentTypeNull_ThrowsException() {
        when(multipartFile.getSize()).thenReturn(100L);
        when(multipartFile.isEmpty()).thenReturn(false);
        when(multipartFile.getContentType()).thenReturn(null);

        Exception exception = assertThrows(RuntimeException.class, () -> 
                fileUploadService.uploadAudioFile(multipartFile, meetingId));
        assertTrue(exception.getMessage().contains("Unsupported audio format"));
    }

    @Test
    void uploadAudioFile_ContentTypeVideo_ThrowsException() {
        when(multipartFile.getSize()).thenReturn(100L);
        when(multipartFile.isEmpty()).thenReturn(false);
        when(multipartFile.getContentType()).thenReturn("video/mp4");

        Exception exception = assertThrows(RuntimeException.class, () -> 
                fileUploadService.uploadAudioFile(multipartFile, meetingId));
        assertTrue(exception.getMessage().contains("Unsupported audio format"));
    }

    @Test
    void uploadAudioFile_FilenameNull_ThrowsException() {
        when(multipartFile.getSize()).thenReturn(100L);
        when(multipartFile.isEmpty()).thenReturn(false);
        when(multipartFile.getContentType()).thenReturn("audio/mpeg");
        when(multipartFile.getOriginalFilename()).thenReturn(null);

        Exception exception = assertThrows(RuntimeException.class, () -> 
                fileUploadService.uploadAudioFile(multipartFile, meetingId));
        assertEquals("Invalid filename", exception.getMessage());
    }

    @Test
    void uploadAudioFile_FilenameBlank_ThrowsException() {
        when(multipartFile.getSize()).thenReturn(100L);
        when(multipartFile.isEmpty()).thenReturn(false);
        when(multipartFile.getContentType()).thenReturn("audio/mpeg");
        when(multipartFile.getOriginalFilename()).thenReturn("   ");

        Exception exception = assertThrows(RuntimeException.class, () -> 
                fileUploadService.uploadAudioFile(multipartFile, meetingId));
        assertEquals("Invalid filename", exception.getMessage());
    }

    @Test
    void uploadAudioFile_ValidMp3_FileSaved() throws IOException {
        when(multipartFile.getSize()).thenReturn(100L);
        when(multipartFile.isEmpty()).thenReturn(false);
        when(multipartFile.getContentType()).thenReturn("audio/mpeg");
        when(multipartFile.getOriginalFilename()).thenReturn("test.mp3");
        when(multipartFile.getInputStream()).thenReturn(new ByteArrayInputStream("test".getBytes()));

        String result = fileUploadService.uploadAudioFile(multipartFile, meetingId);

        assertNotNull(result);
        assertTrue(result.contains(meetingId.toString()));
        assertTrue(result.endsWith(".mp3"));
        assertTrue(Files.exists(Path.of(result)));
    }

    @Test
    void uploadAudioFile_ValidWav_FileSaved() throws IOException {
        when(multipartFile.getSize()).thenReturn(100L);
        when(multipartFile.isEmpty()).thenReturn(false);
        when(multipartFile.getContentType()).thenReturn("audio/wav");
        when(multipartFile.getOriginalFilename()).thenReturn("recording.wav");
        when(multipartFile.getInputStream()).thenReturn(new ByteArrayInputStream("test".getBytes()));

        String result = fileUploadService.uploadAudioFile(multipartFile, meetingId);

        assertNotNull(result);
        assertTrue(result.contains(meetingId.toString()));
        assertTrue(result.endsWith(".wav"));
        assertTrue(Files.exists(Path.of(result)));
    }

    // --- getFileSizeReadable Tests ---

    @Test
    void getFileSizeReadable_FormatsCorrectly() {
        assertEquals("500 B", fileUploadService.getFileSizeReadable(500));
        assertEquals("1.0 KB", fileUploadService.getFileSizeReadable(1024));
        assertEquals("1.0 MB", fileUploadService.getFileSizeReadable(1048576));
        assertEquals("0 B", fileUploadService.getFileSizeReadable(0));
    }

    // --- isValidFilePath Tests ---

    @Test
    void isValidFilePath_ExistingFile_ReturnsTrue() throws IOException {
        Path newFile = tempDir.resolve("testfile.txt");
        Files.write(newFile, "content".getBytes());

        assertTrue(fileUploadService.isValidFilePath(newFile.toString()));
    }

    @Test
    void isValidFilePath_NonExistentFile_ReturnsFalse() {
        assertFalse(fileUploadService.isValidFilePath(tempDir.resolve("missing.txt").toString()));
    }

    @Test
    void isValidFilePath_NullOrMalformed_ReturnsFalse() {
        assertFalse(fileUploadService.isValidFilePath(null));
        assertFalse(fileUploadService.isValidFilePath(""));
    }
}
