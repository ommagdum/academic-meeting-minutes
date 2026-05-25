package com.meetingminutes.backend.exception;

public class EmailNotVerifiedException extends RuntimeException {

    private static final String ERROR_CODE = "EMAIL_NOT_VERIFIED";

    public EmailNotVerifiedException(String message) {
        super(message);
    }

    public String getErrorCode() {
        return ERROR_CODE;
    }
}
