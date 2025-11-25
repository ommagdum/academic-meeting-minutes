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
        
            # Build extraction prompt
            prompt = self._build_extraction_prompt(transcript, agenda_items, previous_context)
            
            # Call Mistral AI API
            response = self._call_mistral_api(prompt)
            
            # Parse and validate response
            extracted_data = self._parse_ai_response(response)
            
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
        
        prompt = f"""You are an expert academic meeting analyst. Extract structured information from this meeting transcript and return ONLY valid JSON.

                    {agenda_text}

                    {context_text}

                    MEETING TRANSCRIPT:
                    {transcript[:6000]}

                    Extract the following information and respond ONLY with valid JSON in this exact structure:

                    {{
                    "decisions": [
                        {{
                        "topic": "Brief topic description",
                        "decision": "Clear decision made",
                        "context": "Background context for decision",
                        "confidence": 0.95
                        }}
                    ],
                    "actionItems": [
                        {{
                        "description": "Clear, actionable task description",
                        "assignedTo": "Name or email mentioned",
                        "deadline": "YYYY-MM-DD or null if not specified",
                        "confidence": 0.95
                        }}
                    ],
                    "topicsDiscussed": [
                        {{
                        "agendaItem": "Matching agenda item title",
                        "summary": "Concise summary of discussion (2-3 sentences)",
                        "confidence": 0.95
                        }}
                    ],
                    "attendees": [
                        {{
                        "name": "Full name mentioned",
                        "email": "Email if mentioned, else null",
                        "confidence": 0.95
                        }}
                    ]
                    }}

                    IMPORTANT RULES:
                    1. Return ONLY valid JSON - no explanations, no markdown, no extra text
                    2. Only extract information explicitly mentioned in the transcript
                    3. Match topics to agenda items when possible
                    4. Use null for missing information (deadlines, emails)
                    5. Format dates as YYYY-MM-DD if mentioned
                    6. Use consistent confidence scores based on clarity of mention"""

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