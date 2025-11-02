package com.meetingminutes.backend.service;

import com.meetingminutes.backend.document.AIExtraction;
import com.meetingminutes.backend.document.GeneratedDocument;
import com.meetingminutes.backend.entity.Attendee;
import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.repository.MeetingRepository;
import com.meetingminutes.backend.repository.mongo.GeneratedDocumentRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsOperations;
import org.springframework.data.mongodb.gridfs.GridFsResource;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.xhtmlrenderer.pdf.ITextRenderer;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentGenerationService {


    private final TemplateEngine templateEngine;
    private final GridFsTemplate gridFsTemplate;
    private final GridFsOperations gridFsOperations;
    private final GeneratedDocumentRepo generatedDocumentRepository;
    private final MeetingRepository meetingRepository;

    /**
     * Generates meeting minutes in PDF format and stores in GridFS
     */
    public String generateMinutesPDF(Meeting meeting, AIExtraction extraction, User user) {
        log.info("Generating PDF minutes for meeting: {}", meeting.getId());

        try {
            // Prepare template data
            Map<String, Object> templateData = prepareTemplateData(meeting, extraction, user);

            // Generate HTML from template
            String htmlContent = generateHTMLContent(templateData);

            // Convert HTML to PDF
            byte[] pdfBytes = generatePDFFromHTML(htmlContent);

            // Generate filename and store in GridFS
            String filename = generateFilename(meeting, "pdf");
            String fileId = storeInGridFS(pdfBytes, filename, "application/pdf");

            // Save document metadata
            saveDocumentMetadata(meeting, fileId, filename, GeneratedDocument.DocumentType.MINUTES_PDF,
                    pdfBytes.length, templateData);

            log.info("PDF minutes generated successfully for meeting: {}, fileId: {}", meeting.getId(), fileId);
            return fileId;

        } catch (Exception e) {
            log.error("Failed to generate PDF minutes for meeting: {}", meeting.getId(), e);
            throw new RuntimeException("PDF generation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Generates meeting minutes in DOCX format and stores in GridFS
     */
    public String generateMinutesDOCX(Meeting meeting, AIExtraction extraction, User user) {
        log.info("Generating DOCX minutes for meeting: {}", meeting.getId());

        try {
            // Prepare template data
            Map<String, Object> templateData = prepareTemplateData(meeting, extraction, user);

            // Generate DOCX content
            byte[] docxBytes = generateDOCXContent(templateData);

            // Generate filename and store in GridFS
            String filename = generateFilename(meeting, "docx");
            String fileId = storeInGridFS(docxBytes, filename,
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

            // Save document metadata
            saveDocumentMetadata(meeting, fileId, filename, GeneratedDocument.DocumentType.MINUTES_DOCX,
                    docxBytes.length, templateData);

            log.info("DOCX minutes generated successfully for meeting: {}, fileId: {}", meeting.getId(), fileId);
            return fileId;

        } catch (Exception e) {
            log.error("Failed to generate DOCX minutes for meeting: {}", meeting.getId(), e);
            throw new RuntimeException("DOCX generation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Prepares template data for document generation
     */
    private Map<String, Object> prepareTemplateData(Meeting meeting, AIExtraction extraction, User user) {
        Map<String, Object> data = new HashMap<>();

        // Basic meeting info
        data.put("meeting", meeting);
        data.put("attendees", getConfirmedAttendees(meeting));
        data.put("actionItems", meeting.getActionItems());
        data.put("generatedAt", LocalDateTime.now());
        data.put("version", getNextVersion(meeting.getId()));

        // AI extraction data
        boolean hasAIExtraction = extraction != null && extraction.getExtractedData() != null;
        data.put("hasAIExtraction", hasAIExtraction);

        if (hasAIExtraction) {
            data.put("extraction", extraction);
        }

        // Fallback content for when AI extraction is missing or incomplete
        data.put("fallbackContent", getFallbackContent(meeting, extraction));

        return data;
    }

    /**
     * Generates HTML content from Thymeleaf template
     */
    private String generateHTMLContent(Map<String, Object> templateData) {
        Context context = new Context();
        context.setVariables(templateData);
        return templateEngine.process("documents/meeting-minutes", context);
    }

    /**
     * Converts HTML to PDF using Flying Saucer
     */
    private byte[] generatePDFFromHTML(String htmlContent) throws Exception {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            ITextRenderer renderer = new ITextRenderer();
            renderer.setDocumentFromString(htmlContent);
            renderer.layout();
            renderer.createPDF(outputStream);
            return outputStream.toByteArray();
        }
    }

    /**
     * Generates DOCX content using Apache POI
     */
    private byte[] generateDOCXContent(Map<String, Object> templateData) throws Exception {
        try (XWPFDocument document = new XWPFDocument();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            Meeting meeting = (Meeting) templateData.get("meeting");
            List<Attendee> attendees = (List<Attendee>) templateData.get("attendees");
            boolean hasAIExtraction = (Boolean) templateData.get("hasAIExtraction");
            AIExtraction extraction = (AIExtraction) templateData.get("extraction");

            // Title
            XWPFParagraph title = document.createParagraph();
            title.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun titleRun = title.createRun();
            titleRun.setText(meeting.getTitle());
            titleRun.setBold(true);
            titleRun.setFontSize(16);

            // Meeting metadata
            addDOCXKeyValue(document, "Date", formatDateTime(meeting.getScheduledTime()));
            addDOCXKeyValue(document, "Organizer", meeting.getCreatedBy().getName());

            // Attendees section
            addDOCXHeading(document, "Attendees");
            for (Attendee attendee : attendees) {
                XWPFParagraph attendeePara = document.createParagraph();
                XWPFRun attendeeRun = attendeePara.createRun();
                String attendeeName = attendee.getUser() != null ?
                        attendee.getUser().getName() : "External Participant";
                attendeeRun.setText("• " + attendeeName + " - " + attendee.getInviteEmail() + " (" + attendee.getStatus() + ")");
            }
            document.createParagraph().createRun().addBreak();

            // Agenda section
            if (meeting.getAgendaItems() != null && !meeting.getAgendaItems().isEmpty()) {
                addDOCXHeading(document, "Meeting Agenda");
                for (int i = 0; i < meeting.getAgendaItems().size(); i++) {
                    var agendaItem = meeting.getAgendaItems().get(i);
                    XWPFParagraph agendaPara = document.createParagraph();
                    XWPFRun agendaRun = agendaPara.createRun();
                    agendaRun.setText((i + 1) + ". " + agendaItem.getTitle());
                    if (agendaItem.getDescription() != null && !agendaItem.getDescription().isEmpty()) {
                        agendaRun.addBreak();
                        agendaRun.setText("   " + agendaItem.getDescription());
                        agendaRun.setItalic(true);
                    }
                }
                document.createParagraph().createRun().addBreak();
            }

            // AI Extracted decisions
            if (hasAIExtraction && extraction.getExtractedData().getDecisions() != null) {
                addDOCXHeading(document, "Key Decisions");
                for (var decision : extraction.getExtractedData().getDecisions()) {
                    XWPFParagraph decisionPara = document.createParagraph();
                    XWPFRun decisionRun = decisionPara.createRun();
                    decisionRun.setText("• " + decision.getTopic() + ": " + decision.getDecision());
                    decisionRun.setBold(true);
                }
                document.createParagraph().createRun().addBreak();
            }

            // Action items table
            if (meeting.getActionItems() != null && !meeting.getActionItems().isEmpty()) {
                addDOCXHeading(document, "Action Items");
                XWPFTable table = document.createTable(meeting.getActionItems().size() + 1, 4);

                // Table header
                table.getRow(0).getCell(0).setText("Description");
                table.getRow(0).getCell(1).setText("Assigned To");
                table.getRow(0).getCell(2).setText("Deadline");
                table.getRow(0).getCell(3).setText("Status");

                // Table rows
                for (int i = 0; i < meeting.getActionItems().size(); i++) {
                    var actionItem = meeting.getActionItems().get(i);
                    table.getRow(i + 1).getCell(0).setText(actionItem.getDescription());
                    table.getRow(i + 1).getCell(1).setText(
                            actionItem.getAssignedToUser() != null ?
                                    actionItem.getAssignedToUser().getName() :
                                    actionItem.getAssignedToEmail() != null ?
                                            actionItem.getAssignedToEmail() : "Unassigned"
                    );
                    table.getRow(i + 1).getCell(2).setText(
                            actionItem.getDeadline() != null ?
                                    formatDateTime(actionItem.getDeadline()) : "Not set"
                    );
                    table.getRow(i + 1).getCell(3).setText(actionItem.getStatus().toString());
                }
            }

            // Footer
            XWPFParagraph footer = document.createParagraph();
            footer.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun footerRun = footer.createRun();
            footerRun.setText("Generated on " + formatDateTime(LocalDateTime.now()) +
                    " by Academic Meeting Minutes Extractor");
            footerRun.setItalic(true);
            footerRun.setFontSize(8);

            document.write(outputStream);
            return outputStream.toByteArray();
        }
    }

    /**
     * Stores file in GridFS and returns file ID
     */
    private String storeInGridFS(byte[] content, String filename, String contentType) {
        try (InputStream inputStream = new ByteArrayInputStream(content)) {
            // Store in GridFS and return the file ID
            return gridFsTemplate.store(inputStream, filename, contentType).toString();
        } catch (IOException e) {
            throw new RuntimeException("Failed to store document in GridFS", e);
        }
    }

    /**
     * Saves document metadata in our collection
     */
    private void saveDocumentMetadata(Meeting meeting, String fileId, String filename,
                                      GeneratedDocument.DocumentType documentType, long fileSize,
                                      Map<String, Object> templateData) {

        GeneratedDocument document = GeneratedDocument.builder()
                .id(fileId)
                .filename(filename)
                .meetingId(meeting.getId())
                .documentType(documentType)
                .contentType(documentType == GeneratedDocument.DocumentType.MINUTES_PDF ?
                        "application/pdf" :
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                .fileSize(fileSize)
                .version((Integer) templateData.get("version"))
                .generatedAt(LocalDateTime.now())
                .metadata(GeneratedDocument.DocumentMetadata.builder()
                        .meetingTitle(meeting.getTitle())
                        .organizerName(meeting.getCreatedBy().getName())
                        .meetingDate(meeting.getScheduledTime())
                        .attendeeCount(((List<?>) templateData.get("attendees")).size())
                        .actionItemCount(meeting.getActionItems() != null ? meeting.getActionItems().size() : 0)
                        .hasAIExtraction((Boolean) templateData.get("hasAIExtraction"))
                        .build())
                .build();

        generatedDocumentRepository.save(document);
    }

    public String getDocumentUrl(UUID meetingId) {
        try {
            List<GeneratedDocument> documents = getMeetingDocuments(meetingId);
            if (documents.isEmpty()) {
                return null;
            }

            // Return URL for the latest PDF document
            Optional<GeneratedDocument> latestPdf = documents.stream()
                    .filter(doc -> doc.getDocumentType() == GeneratedDocument.DocumentType.MINUTES_PDF)
                    .max(Comparator.comparing(GeneratedDocument::getGeneratedAt)
                            .thenComparing(GeneratedDocument::getVersion));

            return latestPdf.map(doc ->
                    "/api/v1/meetings/" + meetingId + "/documents/" + doc.getId() + "/download"
            ).orElse(null);

        } catch (Exception e) {
            log.warn("Failed to generate document URL for meeting: {}", meetingId, e);
            return null;
        }
    }

    // ============ HELPER METHODS ============

    private List<Attendee> getConfirmedAttendees(Meeting meeting) {
        return meeting.getAttendees().stream()
                .filter(attendee -> attendee.getStatus().name().equals("CONFIRMED") ||
                        attendee.getStatus().name().equals("ATTENDED"))
                .collect(Collectors.toList());
    }

    private String getFallbackContent(Meeting meeting, AIExtraction extraction) {
        if (extraction == null || extraction.getExtractedData() == null) {
            return "Meeting minutes generated from agenda and participant list. " +
                    "AI extraction was not available for detailed discussion analysis.";
        }

        boolean hasDecisions = extraction.getExtractedData().getDecisions() != null &&
                !extraction.getExtractedData().getDecisions().isEmpty();
        boolean hasTopics = extraction.getExtractedData().getTopicsDiscussed() != null &&
                !extraction.getExtractedData().getTopicsDiscussed().isEmpty();

        if (!hasDecisions && !hasTopics) {
            return "AI extraction completed but no specific decisions or topics were identified. " +
                    "Minutes include basic meeting structure and action items.";
        }

        return null; // No fallback needed - AI data is good
    }

    private String generateFilename(Meeting meeting, String format) {
        String safeTitle = meeting.getTitle().replaceAll("[^a-zA-Z0-9.-]", "_");
        String date = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        Integer version = getNextVersion(meeting.getId());
        return String.format("minutes_%s_%s_v%d.%s", safeTitle, date, version, format.toLowerCase());
    }

    private Integer getNextVersion(UUID meetingId) {
        List<GeneratedDocument> existingDocs = generatedDocumentRepository.findByMeetingId(meetingId);
        return existingDocs.stream()
                .map(GeneratedDocument::getVersion)
                .max(Integer::compareTo)
                .orElse(0) + 1;
    }

    private String formatDateTime(LocalDateTime dateTime) {
        if (dateTime == null) return "Not specified";
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMMM dd, yyyy 'at' hh:mm a");
        return dateTime.format(formatter);
    }

    private void addDOCXHeading(XWPFDocument document, String text) {
        XWPFParagraph heading = document.createParagraph();
        XWPFRun headingRun = heading.createRun();
        headingRun.setText(text);
        headingRun.setBold(true);
        headingRun.setFontSize(12);
        headingRun.addBreak();
    }

    private void addDOCXKeyValue(XWPFDocument document, String key, String value) {
        XWPFParagraph paragraph = document.createParagraph();
        XWPFRun run = paragraph.createRun();
        run.setText(key + ": " + (value != null ? value : "Not specified"));
        run.addBreak();
    }

    /**
     * Retrieves a document from GridFS by file ID
     */
    public GridFsResource getDocumentById(String fileId) {
        return gridFsOperations.getResource(
                gridFsOperations.findOne(new Query(Criteria.where("_id").is(fileId)))
        );
    }

    /**
     * Gets document metadata by file ID
     */
    public Optional<GeneratedDocument> getDocumentMetadata(String fileId) {
        return generatedDocumentRepository.findById(fileId);
    }

    /**
     * Gets all documents for a meeting
     */
    public List<GeneratedDocument> getMeetingDocuments(UUID meetingId) {
        return generatedDocumentRepository.findByMeetingId(meetingId);
    }

    /**
     * Deletes all documents for a meeting
     */
    public void cleanupMeetingDocuments(UUID meetingId) {
        log.info("Cleaning up documents for meeting: {}", meetingId);

        // Delete from GridFS
        gridFsTemplate.delete(new Query(Criteria.where("metadata.meetingId").is(meetingId)));

        // Delete metadata
        generatedDocumentRepository.deleteByMeetingId(meetingId);

        log.info("Documents cleaned up for meeting: {}", meetingId);
    }
}
