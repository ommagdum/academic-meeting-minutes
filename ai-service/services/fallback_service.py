# services/fallback_service.py
import re
from typing import Dict, List

class FallbackExtractionService:
    """Fallback service if Together AI fails"""
    
    @staticmethod
    def basic_extraction(transcript: str) -> Dict:
        """Basic rule-based extraction as fallback"""
        return {
            "decisions": FallbackExtractionService._extract_decisions(transcript),
            "actionItems": FallbackExtractionService._extract_action_items(transcript),
            "topicsDiscussed": FallbackExtractionService._extract_topics(transcript),
            "attendees": []  # Too complex for rule-based
        }
    
    @staticmethod
    def _extract_decisions(transcript: str) -> List[Dict]:
        decisions = []
        # Simple pattern matching for decisions
        decision_patterns = [
            r"decided to (.+?)(?:\.|$)",
            r"agreed that (.+?)(?:\.|$)", 
            r"approved the (.+?)(?:\.|$)",
            r"resolved to (.+?)(?:\.|$)"
        ]
        
        for pattern in decision_patterns:
            matches = re.finditer(pattern, transcript, re.IGNORECASE)
            for match in matches:
                decisions.append({
                    "topic": "General",
                    "decision": match.group(1).strip(),
                    "context": "Extracted from transcript",
                    "confidence": 0.5
                })
        
        return decisions
    
    @staticmethod
    def _extract_action_items(transcript: str) -> List[Dict]:
        action_items = []
        action_patterns = [
            r"will (.+?)(?:\.|$)",
            r"to do (.+?)(?:\.|$)",
            r"action: (.+?)(?:\.|$)",
            r"task: (.+?)(?:\.|$)"
        ]
        
        for pattern in action_patterns:
            matches = re.finditer(pattern, transcript, re.IGNORECASE)
            for match in matches:
                action_items.append({
                    "description": match.group(1).strip(),
                    "assignedTo": None,
                    "deadline": None,
                    "confidence": 0.4
                })
        
        return action_items
    
    @staticmethod
    def _extract_topics(transcript: str) -> List[Dict]:
        # Simple sentence-based topic extraction
        sentences = re.split(r'[.!?]+', transcript)
        topics = []
        
        for sentence in sentences[:10]:  # First 10 sentences as topics
            sentence = sentence.strip()
            if len(sentence) > 20:  # Meaningful sentences only
                topics.append({
                    "agendaItem": "General Discussion",
                    "summary": sentence[:100] + "..." if len(sentence) > 100 else sentence,
                    "confidence": 0.3
                })
        
        return topics