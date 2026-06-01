# services/extraction_service.py - COMPLETELY UPDATED
import requests
import json
import time
import logging
from typing import Dict, List, Optional
from config.config import settings

logger = logging.getLogger(__name__)

class ExtractionService:
    def __init__(self):
        self.api_key = settings.MISTRAL_API_KEY  # ⚡ Updated
        self.base_url = settings.MISTRAL_BASE_URL  # ⚡ Updated
        self.model = settings.EXTRACTION_MODEL  # ⚡ Updated
    
    def extract_structured_data(self, 
                              transcript: str, 
                              agenda_items: List[Dict] = None,
                              previous_context: Dict = None) -> Dict:
        """Extract structured meeting data using Mistral AI API"""
        start_time = time.time()
        
        try:

            if not transcript:
                raise ValueError("Transcript cannot be None or empty")
            
            if agenda_items is None:
                agenda_items = []
            
            if previous_context is None:
                previous_context = {}
        
            # FIX 1: chunk long transcripts and merge results
            chunks = self._chunk_transcript(transcript)
            response = None  # will hold raw AI response for debugging
            if len(chunks) == 1:
                prompt = self._build_extraction_prompt(transcript, agenda_items, previous_context)
                response = self._call_mistral_api(prompt)
                extracted_data = self._parse_ai_response(response)
            else:
                logger.info(f"Transcript split into {len(chunks)} chunks for full coverage")
                chunk_results = []
                for i, chunk in enumerate(chunks):
                    logger.info(f"Processing chunk {i + 1}/{len(chunks)}")
                    chunk_prompt = self._build_extraction_prompt(chunk, agenda_items, previous_context)
                    chunk_response = self._call_mistral_api(chunk_prompt)
                    chunk_data = self._parse_ai_response(chunk_response)
                    chunk_results.append(chunk_data)
                    response = chunk_response  # keep last chunk response for debugging
                extracted_data = self._merge_chunk_results(chunk_results)
            
            processing_time = time.time() - start_time
            
            return {
                "extracted_data": extracted_data,
                "processing_time": round(processing_time, 2),
                "model_version": self.model,
                "confidence_score": 0.9,
                "success": True,
                "raw_ai_response": response  # For debugging
            }
            
        except Exception as e:
            logger.error(f"Extraction failed: {str(e)}")
            return {
                "success": False,
                "error_message": f"Extraction failed: {str(e)}",
                "processing_time": round(time.time() - start_time, 2)
            }

    # ── FIX 1: chunking helper ────────────────────────────────────────────────
    def _chunk_transcript(self, transcript: str, chunk_size: int = 6000, overlap: int = 500) -> List[str]:
        """Split transcript into overlapping chunks so long meetings are fully processed."""
        if len(transcript) <= chunk_size:
            return [transcript]

        chunks = []
        start = 0
        while start < len(transcript):
            end = start + chunk_size
            chunks.append(transcript[start:end])
            if end >= len(transcript):
                break
            start = end - overlap  # step back by overlap so context carries over
        return chunks

    def _merge_chunk_results(self, results: List[Dict]) -> Dict:
        """Merge extraction results from multiple chunks, deduplicating by text similarity."""
        merged = {
            "decisions": [],
            "actionItems": [],
            "topicsDiscussed": [],
            "attendees": []
        }

        def _normalise(text: str) -> str:
            return text.lower().strip() if text else ""

        def _already_seen(new_text: str, existing: List[Dict], field: str) -> bool:
            norm = _normalise(new_text)
            for item in existing:
                existing_norm = _normalise(item.get(field, ""))
                # simple overlap check: if 60 %+ of shorter string is in longer, treat as duplicate
                shorter, longer = (norm, existing_norm) if len(norm) <= len(existing_norm) else (existing_norm, norm)
                if shorter and shorter in longer:
                    return True
                # word overlap ratio
                words_new = set(norm.split())
                words_old = set(existing_norm.split())
                if words_new and words_old:
                    overlap_ratio = len(words_new & words_old) / len(words_new | words_old)
                    if overlap_ratio >= 0.6:
                        return True
            return False

        for result in results:
            for item in result.get("decisions", []):
                if not _already_seen(item.get("decision", ""), merged["decisions"], "decision"):
                    merged["decisions"].append(item)

            for item in result.get("actionItems", []):
                if not _already_seen(item.get("description", ""), merged["actionItems"], "description"):
                    merged["actionItems"].append(item)

            for item in result.get("topicsDiscussed", []):
                if not _already_seen(item.get("summary", ""), merged["topicsDiscussed"], "summary"):
                    merged["topicsDiscussed"].append(item)

            for item in result.get("attendees", []):
                if not _already_seen(item.get("name", ""), merged["attendees"], "name"):
                    merged["attendees"].append(item)

        return merged
    
    def _build_extraction_prompt(self, 
                               transcript: str, 
                               agenda_items: List[Dict],
                               previous_context: Dict) -> str:
        """Build comprehensive prompt for structured extraction"""
        
        # Prepare agenda text
        agenda_text = ""
        if agenda_items:
            agenda_text = "MEETING AGENDA:\n"
            for i, item in enumerate(agenda_items, 1):
                agenda_text += f"{i}. {item.get('title', '')}: {item.get('description', '')}\n"
        
        # Prepare context text
        context_text = ""
        if previous_context:
            context_text = "PREVIOUS MEETING CONTEXT:\n"
            if previous_context.get('decisions'):
                context_text += f"Previous Decisions: {json.dumps(previous_context['decisions'], indent=2)}\n"
            if previous_context.get('action_items'):
                context_text += f"Pending Actions: {json.dumps(previous_context['action_items'], indent=2)}\n"
        
        prompt = f"""You are an expert meeting analyst. Extract structured information from this meeting transcript and return ONLY valid JSON.

                    {agenda_text}

                    {context_text}

                    MEETING TRANSCRIPT:
                    {transcript}

                    Extract the following information and respond ONLY with valid JSON in this exact structure:

                    {{
                    "decisions": [
                        {{
                        "topic": "Brief topic description",
                        "decision": "Clear decision made",
                        "context": "Background context for decision",
                        "confidence": "<float between 0.0 and 1.0 based on clarity>"
                        }}
                    ],
                    "actionItems": [
                        {{
                        "description": "Clear, actionable task description",
                        "assignedTo": "Full name of the person who explicitly committed to doing this task at this meeting. Must be someone who said they would do it, not just someone mentioned nearby in the conversation. Use null if no specific person committed.",
                        "deadline": "Copy the exact words used in the transcript e.g. 'next week', 'tomorrow morning', 'end of month'. Do not convert vague language to specific dates. Use null if no deadline was mentioned.",
                        "confidence": "<float between 0.0 and 1.0 based on clarity>"
                        }}
                    ],
                    "topicsDiscussed": [
                        {{
                        "agendaItem": "Matching agenda item title",
                        "summary": "Concise summary of discussion (2-3 sentences)",
                        "confidence": "<float between 0.0 and 1.0 based on clarity>"
                        }}
                    ],
                    "attendees": [
                        {{
                        "name": "Full name mentioned",
                        "email": "Email if mentioned, else null",
                        "confidence": "<float between 0.0 and 1.0 based on clarity>"
                        }}
                    ]
                    }}

                    IMPORTANT RULES:
                    1. Return ONLY valid JSON - no explanations, no markdown, no extra text
                    2. Only extract action items where a specific person made an explicit verbal commitment to complete a task at THIS meeting. Process descriptions, background context, ongoing work already in progress, and future planned steps described by a speaker are NOT action items unless someone was explicitly assigned to them during this meeting.
                    3. Match topics to agenda items when possible
                    4. Use null for missing information (deadlines, emails)
                    5. Use consistent confidence scores based on clarity of mention"""

        return prompt
    
    def _call_mistral_api(self, prompt: str) -> str:
        """Call Mistral AI API with proper error handling"""
        url = f"{self.base_url}/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",  # ⚡ Updated header
            "Content-Type": "application/json"
        }
        
        data = {
            "model": self.model,  # ⚡ Using Mistral model
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": 2048,
            "temperature": 0.1,  # Low temperature for consistent JSON
            "top_p": 0.9,
            # ⚡ Mistral specific parameters (if any)
        }
        
        try:
            logger.info(f"Calling Mistral API with model: {self.model}")
            response = requests.post(url, json=data, headers=headers, timeout=120)
            
            # Log response for debugging
            logger.info(f"Mistral API Response Status: {response.status_code}")
            
            response.raise_for_status()
            
            result = response.json()
            
            # Extract content from Mistral response format
            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"]
                logger.info(f"Mistral API Response Length: {len(content)}")
                return content
            else:
                raise Exception("No choices in Mistral API response")
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Mistral API request failed: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response content: {e.response.text}")
            raise Exception(f"Mistral API request failed: {str(e)}")
        except KeyError as e:
            logger.error(f"Unexpected Mistral API response format: {str(e)}")
            logger.error(f"Full response: {result}")
            raise Exception("Invalid Mistral API response format")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Mistral API response: {str(e)}")
            raise Exception("Invalid JSON response from Mistral API")
    
    def _parse_ai_response(self, ai_response: str) -> Dict:
        """Parse and validate AI response JSON"""
        try:
            # Clean response - remove any potential markdown code blocks
            cleaned_response = ai_response.strip()
            
            # Remove JSON code blocks if present
            if cleaned_response.startswith('```json'):
                cleaned_response = cleaned_response[7:]
            elif cleaned_response.startswith('```'):
                cleaned_response = cleaned_response[3:]
            
            if cleaned_response.endswith('```'):
                cleaned_response = cleaned_response[:-3]
            
            # Parse JSON
            extracted_data = json.loads(cleaned_response)
            
            # Validate structure
            self._validate_extraction_schema(extracted_data)
            
            return extracted_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {str(e)}")
            logger.error(f"Raw AI response: {ai_response}")
            raise Exception("Mistral AI returned invalid JSON format")
        except Exception as e:
            logger.error(f"Validation failed: {str(e)}")
            raise
    
    def _validate_extraction_schema(self, data: Dict):
        """Validate extracted data matches expected schema"""
        required_sections = ["decisions", "actionItems", "topicsDiscussed", "attendees"]
        
        for section in required_sections:
            if section not in data:
                raise ValueError(f"Missing required section: {section}")
            
            if not isinstance(data[section], list):
                raise ValueError(f"Section {section} must be a list")