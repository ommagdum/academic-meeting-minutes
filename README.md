# Academic Meeting Minutes Extractor

AI-powered web application to automatically create academic meeting minutes from audio recordings.

## Project Structure

- `backend/` - Spring Boot application (Java)
- `ai-service/` - Flask AI service (Python) 
- `frontend/` - React application (TypeScript)

## Current Status

✅ **Phase 1 & 2 Complete**: Backend foundation with authentication
- Spring Boot with OAuth2 + JWT
- PostgreSQL + MongoDB hybrid database
- User/Meeting entity management
- Docker development environment

## Development

```bash
# Start development environment
docker-compose up -d

# Access applications
Backend: http://localhost:8080
Database: localhost:5432 (PostgreSQL)
