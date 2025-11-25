# test_mistral_integration.py
import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_mistral_integration():
    """Test the complete pipeline with Mistral AI"""
    base_url = "http://localhost:5001"
    
    print("🧪 Starting Mistral AI Integration Test...")
    
    # First, check if the service is running
    try:
        health_response = requests.get(f"{base_url}/ai/health", timeout=10)
        if health_response.status_code == 200:
            print("✅ AI Service is healthy and running")
        else:
            print(f"❌ AI Service health check failed: {health_response.status_code}")
            return
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to AI Service. Make sure it's running on localhost:5001")
        print("💡 Run: python app.py in another terminal")
        return
    
    # Test with a sample audio file
    test_audio_path = "meeting.mp3"  # Replace with your test file
    
    if not os.path.exists(test_audio_path):
        print(f"❌ Test audio file not found: {test_audio_path}")
        print("💡 Please provide a test audio file or use the example below")
        
        # You can create a small test file programmatically for demo
        create_dummy_audio = input("Create a dummy test file? (y/n): ")
        if create_dummy_audio.lower() == 'y':
            # This would require additional dependencies
            print("⚠️  Audio file creation requires pydub. Install with: pip install pydub")
        return
    
    print(f"📁 Using test audio file: {test_audio_path}")
    
    try:
        with open(test_audio_path, 'rb') as audio_file:
            files = {'file': (os.path.basename(test_audio_path), audio_file, 'audio/mpeg')}
            data = {
                'meeting_id': 'test-mistral-001',
                'language': 'en'
            }
            
            print("🎵 Starting transcription...")
            
            # Test transcription endpoint
            transcribe_response = requests.post(
                f"{base_url}/ai/transcribe",
                files=files,
                data=data,
                timeout=120  # Longer timeout for audio processing
            )
            
            if transcribe_response.status_code == 200:
                transcript_data = transcribe_response.json()
                print("✅ Transcription successful!")
                print(f"   📝 Transcript length: {len(transcript_data['raw_text'])} characters")
                print(f"   ⏱️  Processing time: {transcript_data['processing_time']}s")
                print(f"   🎯 Confidence: {transcript_data['confidence_score']}")
                
                # Show first 200 chars of transcript
                preview = transcript_data['raw_text'][:200] + "..." if len(transcript_data['raw_text']) > 200 else transcript_data['raw_text']
                print(f"   📄 Preview: {preview}")
                
                print("\n🤖 Starting Mistral AI extraction...")
                
                # Test extraction with Mistral AI
                extraction_payload = {
                    "transcript_text": transcript_data['raw_text'],
                    "meeting_id": "test-mistral-001",
                    "agenda_items": [
                        {"title": "Budget Review", "description": "Q1 financial report discussion"},
                        {"title": "Project Updates", "description": "Team progress reports and milestones"}
                    ],
                    "previous_context": {
                        "pending_actions": ["Finalize budget proposal", "Schedule client meeting"]
                    }
                }
                
                extract_response = requests.post(
                    f"{base_url}/ai/extract",
                    json=extraction_payload,
                    timeout=60
                )
                
                if extract_response.status_code == 200:
                    result = extract_response.json()
                    print("✅ Mistral AI extraction successful!")
                    print(f"   🤖 Model: {result['model_version']}")
                    print(f"   ⏱️  Processing time: {result['processing_time']}s")
                    print(f"   📊 Decisions found: {len(result['extracted_data']['decisions'])}")
                    print(f"   ✅ Action items: {len(result['extracted_data']['actionItems'])}")
                    print(f"   👥 Attendees identified: {len(result['extracted_data']['attendees'])}")
                    print(f"   📝 Topics discussed: {len(result['extracted_data']['topicsDiscussed'])}")
                    
                    # Show some extracted data
                    if result['extracted_data']['decisions']:
                        print(f"\n   🎯 Sample decision: {result['extracted_data']['decisions'][0]['decision']}")
                    
                    if result['extracted_data']['actionItems']:
                        print(f"   ✅ Sample action: {result['extracted_data']['actionItems'][0]['description']}")
                        
                else:
                    print(f"❌ Extraction failed with status {extract_response.status_code}")
                    print(f"   Error: {extract_response.text}")
                    
            else:
                print(f"❌ Transcription failed with status {transcribe_response.status_code}")
                print(f"   Error: {transcribe_response.text}")
                
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")

def test_mistral_api_directly():
    """Test Mistral API directly without Flask service"""
    import requests
    import os
    
    api_key = os.getenv('MISTRAL_API_KEY')
    if not api_key:
        print("❌ MISTRAL_API_KEY not found in environment variables")
        return
    
    url = "https://api.mistral.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": "mistral-medium-latest",
        "messages": [
            {"role": "user", "content": "Respond with 'Mistral AI is working!'"}
        ],
        "max_tokens": 50
    }
    
    try:
        print("🔍 Testing Mistral API directly...")
        response = requests.post(url, json=data, headers=headers, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        message = result["choices"][0]["message"]["content"]
        print(f"✅ Mistral API is working! Response: {message}")
        
    except Exception as e:
        print(f"❌ Mistral API test failed: {str(e)}")

if __name__ == "__main__":
    print("Mistral AI Integration Test Suite")
    print("=" * 50)
    
    # Test Mistral API directly first
    test_mistral_api_directly()
    
    print("\n" + "=" * 50)
    
    # Test the full integration
    test_mistral_integration()