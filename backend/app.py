import os
import json
import secrets
import string
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def generate_secure_form_id():
    """
    Generates a secure random ID for forms
    Format: form_[12 character secure random string]
    Uses cryptographically secure random number generation
    """
    # Use secrets module for cryptographically strong random numbers
    alphabet = string.ascii_letters + string.digits  # A-Za-z0-9 (62 characters)
    
    # Generate timestamp-based component for uniqueness
    timestamp_component = str(int(time.time() * 1000))[-6:]  # Last 6 digits of millisecond timestamp
    
    # Generate random component (8 characters)
    random_component = ''.join(secrets.choice(alphabet) for _ in range(8))
    
    # Combine timestamp and random for 14 character ID
    secure_id = timestamp_component + random_component
    
    return f"form_{secure_id}"

app = Flask(__name__)

# Initialize rate limiter
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# Configure CORS to only allow same-origin requests in production
if os.getenv('FLASK_ENV') == 'production':
    CORS(app, origins=["https://your-domain.com"])  # Replace with your actual domain
else:
    CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174"])  # Development origins

# Gemini API configuration
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY environment variable is required")

@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        'error': 'Bad Request',
        'message': 'Invalid request format. Please check your input and try again.'
    }), 400

@app.errorhandler(429)
def rate_limit_exceeded(error):
    return jsonify({
        'error': 'Rate Limit Exceeded',
        'message': 'Too many requests to the AI service. Please wait a moment and try again. Rate limits: 10-20 requests per minute depending on the endpoint.',
        'retry_after': getattr(error, 'retry_after', 60)
    }), 429

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal Server Error',
        'message': 'Something went wrong on our end. Please try again later.'
    }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'dynamic-forms-api'})

@app.route('/api/ai/generate-form', methods=['POST'])
@limiter.limit("10 per minute, 100 per hour")
def generate_form():
    try:
        # Validate request
        if not request.is_json:
            return jsonify({
                'error': 'Invalid Content-Type',
                'message': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        if not data or 'prompt' not in data:
            return jsonify({
                'error': 'Missing Prompt',
                'message': 'Prompt is required'
            }), 400
        
        prompt = data.get('prompt', '').strip()
        if len(prompt) < 5:
            return jsonify({
                'error': 'Invalid Prompt',
                'message': 'Prompt must be at least 5 characters long'
            }), 400
        
        # System prompt for form generation
        system_prompt = f"""
You are an expert form designer and product strategist. Create a comprehensive form structure AND product manifesto based on the user's request.

The user wants: {prompt}

Return a JSON object with this exact structure:
```json
{{
  "id": "form_" + random_id,
  "title": "Form Title",
  "description": "Form Description", 
  "manifesto": "Product manifesto text for backward compatibility",
  "manifestoData": {{
    "productVision": "Clear, concise product vision statement",
    "targetAudience": "Specific description of the target users/customers", 
    "businessGoals": ["goal1", "goal2", "goal3"],
    "keyQuestionAreas": ["area1", "area2", "area3"],
    "conversationTone": "friendly"
  }},
  "questions": [
    {{
      "id": "welcome",
      "type": "welcome",
      "label": "Welcome message",
      "description": "Brief intro to the form"
    }},
    // ... other questions
  ]
}}
```

MANIFESTO REQUIREMENTS:
- productVision: 1-2 sentences describing the core purpose and value proposition
- targetAudience: Specific user demographics, behaviors, or characteristics  
- businessGoals: 3-5 specific business objectives this form helps achieve (e.g., "increase customer satisfaction", "reduce support tickets")
- keyQuestionAreas: 3-5 key topics the form should explore
- conversationTone: Either "friendly", "professional", "casual", or "expert" based on the target audience

FORM REQUIREMENTS:
- First question MUST be type "welcome"
- Include 3-8 strategic questions
- Use appropriate question types: text, textarea, multiple-choice, rating, email
- Questions should align with the manifesto's key question areas
- Make questions specific and actionable

Be strategic and ensure the form structure serves the manifesto's goals.
"""
        
        # Prepare request to Gemini API
        gemini_url = f"{GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent"
        headers = {
            'Content-Type': 'application/json',
        }
        
        payload = {
            'contents': [{
                'parts': [{
                    'text': f'User request: "{prompt}"'
                }]
            }],
            'systemInstruction': {
                'parts': [{
                    'text': system_prompt
                }]
            },
            'generationConfig': {
                'responseMimeType': 'application/json'
            }
        }
        
        # Make request to Gemini API
        response = requests.post(
            f"{gemini_url}?key={GEMINI_API_KEY}",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 429:
            return jsonify({
                'error': 'Rate Limit Exceeded',
                'message': 'AI service is currently busy. Please try again in a few moments.'
            }), 429
        
        if response.status_code != 200:
            return jsonify({
                'error': 'AI Service Error',
                'message': 'Failed to generate form. Please try again with a different prompt.'
            }), 500
        
        gemini_data = response.json()
        
        if 'candidates' not in gemini_data or not gemini_data['candidates']:
            return jsonify({
                'error': 'Generation Failed',
                'message': 'Could not generate form schema. Please try rephrasing your request.'
            }), 500
        
        content = gemini_data['candidates'][0]['content']['parts'][0]['text']
        
        # Clean and parse JSON
        json_str = content.strip()
        # Remove markdown fences if present
        if json_str.startswith('```'):
            lines = json_str.split('\n')
            json_str = '\n'.join(lines[1:-1])
        
        # Remove trailing commas
        json_str = json_str.replace(',}', '}').replace(',]', ']')
        
        try:
            schema = json.loads(json_str)
        except json.JSONDecodeError:
            return jsonify({
                'error': 'Invalid Response',
                'message': 'AI generated invalid form schema. Please try again.'
            }), 500
        
        # Add unique ID if missing
        if 'id' not in schema:
            schema['id'] = generate_secure_form_id()
        
        return jsonify(schema)
        
    except requests.Timeout:
        return jsonify({
            'error': 'Request Timeout',
            'message': 'AI service took too long to respond. Please try again.'
        }), 504
    except requests.RequestException:
        return jsonify({
            'error': 'Service Unavailable',
            'message': 'AI service is currently unavailable. Please try again later.'
        }), 503
    except Exception as e:
        app.logger.error(f"Unexpected error in generate_form: {str(e)}")
        return jsonify({
            'error': 'Unexpected Error',
            'message': 'An unexpected error occurred. Please try again.'
        }), 500

@app.route('/api/ai/generate-followup', methods=['POST'])
@limiter.limit("20 per minute, 200 per hour")
def generate_followup():
    try:
        # Validate request
        if not request.is_json:
            return jsonify({
                'error': 'Invalid Content-Type',
                'message': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        if not data or 'originalQuestion' not in data or 'userAnswer' not in data:
            return jsonify({
                'error': 'Missing Data',
                'message': 'originalQuestion and userAnswer are required'
            }), 400
        
        original_question = data.get('originalQuestion')
        user_answer = data.get('userAnswer', '').strip()
        
        if not user_answer or len(user_answer) == 0:
            return jsonify(None)
        
        # System prompt for follow-up generation
        followup_system_prompt = """
You are an expert conversational analyst. Your task is to generate a concise, relevant follow-up question when a user provides a vague, short, or incomplete answer in a form.

You will be given the original question and the user's answer.

Analyze the user's answer. If it is vague (e.g., "good", "fine"), non-specific, very short (<=3 words), or indicates uncertainty, create a single follow-up question to probe for more specific details.
- The follow-up question should be open-ended.
- It should be phrased politely and naturally.
- The goal is to get more context or a concrete example.

If the user's answer is already detailed, specific, and clear (e.g., a full sentence with specific information), DO NOT generate a follow-up question. In this case, respond with an empty JSON object: {}.

If a follow-up is needed, respond with a JSON object representing the question. The response MUST be ONLY the raw JSON object, without markdown fences or any other text.
The JSON object must follow this exact TypeScript interface:

interface QuestionFollowUp {
  label: string; // The text of the follow-up question.
  type: 'text' | 'textarea';
  placeholder?: string; // Optional placeholder text for the input.
}
"""
        
        # Prepare request to Gemini API
        gemini_url = f"{GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent"
        headers = {
            'Content-Type': 'application/json',
        }
        
        user_prompt = f'Original Question: "{original_question.get("label", "")}"\\nUser\'s Answer: "{user_answer}"'
        
        payload = {
            'contents': [{
                'parts': [{
                    'text': user_prompt
                }]
            }],
            'systemInstruction': {
                'parts': [{
                    'text': followup_system_prompt
                }]
            },
            'generationConfig': {
                'responseMimeType': 'application/json'
            }
        }
        
        # Make request to Gemini API
        response = requests.post(
            f"{gemini_url}?key={GEMINI_API_KEY}",
            headers=headers,
            json=payload,
            timeout=10
        )
        
        if response.status_code != 200:
            # Fail silently for follow-up questions
            return jsonify(None)
        
        gemini_data = response.json()
        
        if 'candidates' not in gemini_data or not gemini_data['candidates']:
            return jsonify(None)
        
        content = gemini_data['candidates'][0]['content']['parts'][0]['text']
        
        # Clean and parse JSON
        json_str = content.strip()
        if json_str.startswith('```'):
            lines = json_str.split('\n')
            json_str = '\n'.join(lines[1:-1])
        
        try:
            followup = json.loads(json_str)
            if followup and 'label' in followup:
                return jsonify(followup)
            else:
                return jsonify(None)
        except json.JSONDecodeError:
            return jsonify(None)
        
    except Exception as e:
        app.logger.error(f"Error in generate_followup: {str(e)}")
        return jsonify(None)

@app.route('/api/ai/generate-intelligent-followup', methods=['POST'])
@limiter.limit("20 per minute, 200 per hour")
def generate_intelligent_followup():
    # Legacy endpoint - redirect to enhanced version for backward compatibility
    try:
        if not request.is_json:
            return jsonify({
                'error': 'Invalid Content-Type',
                'message': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        required_fields = ['formManifesto', 'currentQuestion', 'userAnswer', 'previousAnswers']
        if not data or not all(field in data for field in required_fields):
            return jsonify({
                'error': 'Missing Data',
                'message': f'Required fields: {", ".join(required_fields)}'
            }), 400
        
        # Create minimal conversation context for legacy requests
        conversation_context = {
            'rootQuestion': data.get('currentQuestion'),
            'conversationHistory': []
        }
        
        # Transform to enhanced format
        enhanced_data = {
            'formManifesto': data.get('formManifesto'),
            'conversationContext': conversation_context,
            'currentQuestion': data.get('currentQuestion'),
            'userAnswer': data.get('userAnswer'),
            'previousAnswers': data.get('previousAnswers'),
            'conversationMetrics': {
                'threadLength': 0,
                'averageAnswerLength': len(data.get('userAnswer', '')),
                'hasDetailedAnswers': len(data.get('userAnswer', '')) > 50
            }
        }
        
        # Call enhanced function
        return generate_intelligent_followup_enhanced_impl(enhanced_data)
        
    except Exception as e:
        app.logger.error(f"Error in generate_intelligent_followup: {str(e)}")
        return jsonify(None)

@app.route('/api/ai/generate-intelligent-followup-enhanced', methods=['POST'])
@limiter.limit("20 per minute, 200 per hour")
def generate_intelligent_followup_enhanced():
    print("🔥 Backend: Received request to /api/ai/generate-intelligent-followup-enhanced")
    try:
        if not request.is_json:
            print("❌ Backend: Request is not JSON")
            return jsonify({
                'error': 'Invalid Content-Type',
                'message': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        print(f"📥 Backend: Request data received: {data}")
        result = generate_intelligent_followup_enhanced_impl(data)
        print(f"📤 Backend: Returning result: {result}")
        return result
        
    except Exception as e:
        print(f"❌ Backend: Error in generate_intelligent_followup_enhanced: {str(e)}")
        app.logger.error(f"Error in generate_intelligent_followup_enhanced: {str(e)}")
        return jsonify(None)

def generate_intelligent_followup_enhanced_impl(data):
    """Enhanced intelligent follow-up generation with conversation context and metrics"""
    print("🔧 Backend: Starting generate_intelligent_followup_enhanced_impl")
    
    required_fields = ['formManifesto', 'conversationContext', 'currentQuestion', 'userAnswer', 'previousAnswers']
    if not data or not all(field in data for field in required_fields):
        missing_fields = [field for field in required_fields if field not in data]
        print(f"❌ Backend: Missing required fields: {missing_fields}")
        return jsonify({
            'error': 'Missing Data',
            'message': f'Required fields: {", ".join(required_fields)}'
        })
    
    form_manifesto = data.get('formManifesto', '').strip()
    conversation_context = data.get('conversationContext')
    current_question = data.get('currentQuestion')
    user_answer = data.get('userAnswer', '').strip()
    previous_answers = data.get('previousAnswers', {})
    conversation_metrics = data.get('conversationMetrics', {})
    
    if not user_answer or len(user_answer) == 0:
        return jsonify(None)
    
    # Enhanced system prompt with BALANCED OBJECTIVES + ENGAGEMENT approach
    intelligent_system_prompt = f"""
You are an expert conversational AI that generates intelligent follow-up questions with deep contextual understanding.

🎯⚡ DUAL PRIORITY: ACHIEVE OBJECTIVES WHILE MAINTAINING ENGAGEMENT
Your mission is to balance manifesto objectives with user engagement for optimal results.

MANIFESTO OBJECTIVE DETECTION:
1. Parse the manifesto for SPECIFIC goals, tests, or information needs
2. Look for phrases like "want to check if...", "need to know...", "test whether...", "see if customers notice..."
3. Identify concrete business objectives or experiments mentioned
4. Rate objective importance: CRITICAL vs VALUABLE vs NICE-TO-HAVE

ENGAGEMENT QUALITY METRICS:
- Thread Length: {conversation_metrics.get('threadLength', 0)} exchanges
- Average Answer Length: {conversation_metrics.get('averageAnswerLength', 0)} characters  
- Quality Score: {conversation_metrics.get('qualityScore', 0)}/100
- Quality Insights: {', '.join(conversation_metrics.get('qualityInsights', []))}

ENGAGEMENT LEVEL: {"🔥 HIGH" if conversation_metrics.get('qualityScore', 0) > 70 else "⚡ MEDIUM" if conversation_metrics.get('qualityScore', 0) > 40 else "💭 LOW"}

🎯⚡ BALANCED DECISION FRAMEWORK:

1. **HIGH ENGAGEMENT (70+)**: 
   - ✅ Pursue ALL manifesto objectives (critical + valuable + nice-to-have)
   - ✅ Use complex, open-ended questions
   - ✅ Can ask 2-3 strategic follow-ups
   - ✅ Deep dive into interesting insights

2. **MEDIUM ENGAGEMENT (40-69)**:
   - ✅ Pursue CRITICAL + VALUABLE manifesto objectives
   - ✅ Use focused, specific questions
   - ✅ Ask 1-2 well-targeted follow-ups
   - ⚠️ Skip nice-to-have objectives to maintain engagement

3. **LOW ENGAGEMENT (<40)**:
   - ✅ Pursue CRITICAL manifesto objectives only
   - ✅ Use simple, multiple-choice questions
   - ✅ Ask 1 essential follow-up maximum
   - ⚠️ Skip valuable/nice-to-have objectives to avoid user fatigue

OBJECTIVE PRIORITY CLASSIFICATION:
- **CRITICAL**: Core business needs, A/B tests, essential data (ALWAYS pursue)
- **VALUABLE**: Important insights, secondary goals (pursue if engagement allows)
- **NICE-TO-HAVE**: Exploratory questions, bonus insights (only for high engagement)

ENGAGEMENT-ADAPTIVE QUESTION STYLES:
🔥 **High Engagement**: "I'm curious about the specific changes you noticed to our menu today - can you tell me more about what caught your attention?"

⚡ **Medium Engagement**: "Did you notice any changes to our menu items today? What stood out to you?"

💭 **Low Engagement**: "Did anything seem different about our menu today?"
   - Yes, I noticed changes
   - No, everything seemed the same
   - I'm not sure

SMART STOPPING CONDITIONS:
- ✅ Critical objectives achieved
- ✅ Engagement declining (respect user fatigue)
- ✅ Diminishing returns on information quality
- ✅ User showing signs of disengagement

RESPONSE FORMAT:
If NO follow-up needed (objectives satisfied OR engagement too low for remaining objectives):
Return {{}}

If follow-up needed (balancing objectives with engagement):
{{
  "type": "text" | "textarea" | "multiple-choice",
  "label": "Question optimized for current engagement level",
  "description": "Context if needed",
  "placeholder": "Encouraging hint",
  "options": [
    {{"value": "option1", "label": "First choice"}},
    {{"value": "option2", "label": "Second choice"}},
    {{"value": "option3", "label": "Third choice"}}
  ], // REQUIRED for multiple-choice type, omit for text/textarea
  "required": false
}}

MULTIPLE-CHOICE GENERATION GUIDELINES:
- For LOW engagement: Prefer multiple-choice questions to reduce cognitive load
- For rating/satisfaction follow-ups: Use options like "Very satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very dissatisfied"
- For frequency follow-ups: Use options like "Daily", "Weekly", "Monthly", "Rarely", "Never"
- For preference follow-ups: Use options like "Strongly prefer", "Prefer", "No preference", "Don't prefer"
- For yes/no + detail: Use options like "Yes, definitely", "Yes, somewhat", "No, not really", "No, definitely not"
- ALWAYS provide 3-5 meaningful options for multiple-choice questions
- Make options comprehensive and mutually exclusive

🎯⚡ CORE PRINCIPLE: Maximize objective achievement while respecting user engagement limits.
"""
    
    # Build enhanced conversation context
    conversation_history = ""
    if conversation_context and 'conversationHistory' in conversation_context:
        history_items = []
        for i, exchange in enumerate(conversation_context['conversationHistory']):
            question_label = exchange.get('question', {}).get('label', f'Question {i+1}')
            answer = exchange.get('answer', 'No answer')
            # Add answer quality indicators
            answer_quality = "📝 Brief" if len(answer) < 20 else "📄 Detailed" if len(answer) > 100 else "💬 Standard"
            history_items.append(f"Q{i+1}: {question_label}")
            history_items.append(f"A{i+1} ({answer_quality}): {answer}")
        
        if history_items:
            conversation_history = f"\n\n🗣️ CONVERSATION THREAD HISTORY:\n{chr(10).join(history_items)}"
    
    # Create context for AI including global previous answers
    previous_context = ""
    if previous_answers:
        prev_items = []
        for q_id, answer in previous_answers.items():
            if answer and str(answer).strip():
                prev_items.append(f"- {q_id}: {answer}")
        if prev_items:
            previous_context = f"\n\n📋 ALL PREVIOUS FORM ANSWERS:\n{chr(10).join(prev_items)}"
    
    root_question_info = ""
    if conversation_context and 'rootQuestion' in conversation_context:
        root_question_info = f"🎯 ROOT QUESTION: \"{conversation_context['rootQuestion'].get('label', '')}\"\n"
    
    user_prompt = f"""🎯 FORM MANIFESTO: "{form_manifesto}"

{root_question_info}{conversation_history}

❓ CURRENT QUESTION: "{current_question.get('label', '')}"
💭 USER'S LATEST ANSWER: "{user_answer}"{previous_context}

🎯⚡ BALANCED ANALYSIS REQUIRED:
1. 🔍 **Identify Manifesto Objectives**: Parse for specific goals, tests, or information needs
2. 📊 **Assess Engagement Level**: Current quality score indicates {"🔥 HIGH engagement - can pursue all objectives" if conversation_metrics.get('qualityScore', 0) > 70 else "⚡ MEDIUM engagement - focus on critical + valuable objectives" if conversation_metrics.get('qualityScore', 0) > 40 else "💭 LOW engagement - only pursue critical objectives"}
3. 🎯 **Classify Objective Priority**: Rate as CRITICAL (core business needs) vs VALUABLE vs NICE-TO-HAVE
4. ⚖️ **Balance Decision**: Generate follow-up that achieves highest-priority objectives within engagement limits
5. 📝 **Adapt Question Style**: Match complexity to engagement level

Should we ask a follow-up that balances manifesto objectives with current engagement level?"""
    
    # Prepare request to Gemini API
    gemini_url = f"{GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent"
    headers = {
        'Content-Type': 'application/json',
    }
    
    payload = {
        'contents': [{
            'parts': [{
                'text': user_prompt
            }]
        }],
        'systemInstruction': {
            'parts': [{
                'text': intelligent_system_prompt
            }]
        },
        'generationConfig': {
            'responseMimeType': 'application/json',
            'temperature': 0.7,  # Slightly more creative for better follow-ups
            'topP': 0.8
        }
    }
    
    # Make request to Gemini API
    response = requests.post(
        f"{gemini_url}?key={GEMINI_API_KEY}",
        headers=headers,
        json=payload,
        timeout=15
    )
    
    if response.status_code != 200:
        return jsonify(None)
    
    gemini_data = response.json()
    
    if 'candidates' not in gemini_data or not gemini_data['candidates']:
        return jsonify(None)
    
    content = gemini_data['candidates'][0]['content']['parts'][0]['text']
    
    # Clean and parse JSON
    json_str = content.strip()
    if json_str.startswith('```'):
        lines = json_str.split('\n')
        json_str = '\n'.join(lines[1:-1])
    
    try:
        followup = json.loads(json_str)
        if followup and 'label' in followup:
            return jsonify(followup)
        else:
            return jsonify(None)
    except json.JSONDecodeError:
        return jsonify(None)

@app.route('/api/ai/analyze-form', methods=['POST'])
@limiter.limit("15 per minute, 150 per hour")
def analyze_form():
    try:
        # Validate request
        if not request.is_json:
            return jsonify({
                'error': 'Invalid Content-Type',
                'message': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        if not data or 'form' not in data:
            return jsonify({
                'error': 'Missing Form Data',
                'message': 'Form schema is required'
            }), 400
        
        form_schema = data.get('form')
        
                 # System prompt for form analysis
        analysis_system_prompt = """
You are an expert form design analyst and UX consultant. Your task is to analyze a form schema and provide a quality score and actionable improvements.

CRITICAL INSTRUCTION: 
- First, assign an overall_score (1-100) for the form quality
- If the score is 80 or above, ONLY provide the score and return empty arrays for insights, recommendations, strengths, and weaknesses (the form is good enough)
- If the score is below 80, focus ONLY on problems and actionable improvements - no positive feedback

Analyze the provided form schema and provide this JSON structure:

{
  "overall_score": number, // 1-100 rating of the form
  "insights": [
    {
      "category": "Form Structure" | "Question Quality" | "User Experience" | "Conversion Optimization" | "Best Practices",
      "type": "warning" | "suggestion", // NO "positive" type - only problems
      "title": "Brief issue/improvement title",
      "description": "What's wrong and how to fix it",
      "impact": "high" | "medium" | "low"
    }
  ],
  "recommendations": [
    {
      "priority": "high" | "medium" | "low",
      "action": "Specific actionable fix",
      "reason": "Why this fix is needed"
    }
  ],
  "strengths": [], // Always empty - we don't need positive feedback
  "weaknesses": ["List of specific problems to fix"]
}

If overall_score >= 80: Return empty arrays for insights, recommendations, and weaknesses.
If overall_score < 80: Focus only on fixable problems, friction points, and conversion blockers.
"""
        
        # Prepare request to Gemini API
        gemini_url = f"{GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent"
        headers = {
            'Content-Type': 'application/json',
        }
        
        payload = {
            'contents': [{
                'parts': [{
                    'text': f'Form to analyze: {json.dumps(form_schema)}'
                }]
            }],
            'systemInstruction': {
                'parts': [{
                    'text': analysis_system_prompt
                }]
            },
            'generationConfig': {
                'responseMimeType': 'application/json'
            }
        }
        
        # Make request to Gemini API
        response = requests.post(
            f"{gemini_url}?key={GEMINI_API_KEY}",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 429:
            return jsonify({
                'error': 'Rate Limit Exceeded',
                'message': 'AI service is currently busy. Please try again in a few moments.'
            }), 429
        
        if response.status_code != 200:
            return jsonify({
                'error': 'AI Service Error',
                'message': 'Failed to analyze form. Please try again later.'
            }), 500
        
        gemini_data = response.json()
        
        if 'candidates' not in gemini_data or not gemini_data['candidates']:
            return jsonify({
                'error': 'Analysis Failed',
                'message': 'Could not analyze form. Please try again.'
            }), 500
        
        content = gemini_data['candidates'][0]['content']['parts'][0]['text']
        
        # Clean and parse JSON
        json_str = content.strip()
        # Remove markdown fences if present
        if json_str.startswith('```'):
            lines = json_str.split('\n')
            json_str = '\n'.join(lines[1:-1])
        
        # Remove trailing commas
        json_str = json_str.replace(',}', '}').replace(',]', ']')
        
        try:
            analysis = json.loads(json_str)
        except json.JSONDecodeError:
            return jsonify({
                'error': 'Invalid Response',
                'message': 'AI generated invalid analysis. Please try again.'
            }), 500
        
        return jsonify(analysis)
        
    except requests.Timeout:
        return jsonify({
            'error': 'Request Timeout',
            'message': 'AI service took too long to respond. Please try again.'
        }), 504
    except requests.RequestException:
        return jsonify({
            'error': 'Service Unavailable',
            'message': 'AI service is currently unavailable. Please try again later.'
        }), 503
    except Exception as e:
        app.logger.error(f"Unexpected error in analyze_form: {str(e)}")
        return jsonify({
            'error': 'Unexpected Error',
            'message': 'An unexpected error occurred. Please try again.'
        }), 500

@app.route('/api/ai/analyze-form-responses', methods=['POST'])
@limiter.limit("10 per minute, 100 per hour")
def analyze_form_responses():
    try:
        # Validate request
        if not request.is_json:
            return jsonify({
                'error': 'Invalid Content-Type',
                'message': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        if not data or 'formSchema' not in data or 'responses' not in data:
            return jsonify({
                'error': 'Missing Data',
                'message': 'Form schema and responses are required'
            }), 400
        
        form_schema = data.get('formSchema', {})
        responses = data.get('responses', [])
        
        if not responses:
            return jsonify({
                'error': 'No Responses',
                'message': 'At least one response is required for analysis'
            }), 400
        
        # System prompt for response analysis
        system_prompt = """
You are a data analyst specialized in form response analysis. Analyze the provided form responses and generate insights.

Your analysis should include:
1. **Response Patterns**: Common themes, trends, and patterns in responses
2. **User Behavior**: Engagement levels, completion rates, common drop-off points
3. **Content Insights**: Key insights from open-ended responses
4. **Recommendations**: Actionable suggestions for improving the form or understanding users better

Return a JSON object with this structure:
```json
{
  "summary": {
    "totalResponses": number,
    "completionRate": number,
    "avgResponseTime": number,
    "topInsights": string[]
  },
  "patterns": [
    {
      "pattern": string,
      "frequency": number,
      "examples": string[]
    }
  ],
  "insights": [
    {
      "category": string,
      "insight": string,
      "confidence": number
    }
  ],
  "recommendations": [
    {
      "type": "form_improvement" | "content_strategy" | "user_experience",
      "recommendation": string,
      "priority": "high" | "medium" | "low"
    }
  ]
}
```

Focus on actionable insights that can help improve the form or better understand user needs.
"""
        
        # Prepare context for analysis
        context = f"""
Form Schema:
{json.dumps(form_schema, indent=2)}

Responses to analyze:
{json.dumps(responses, indent=2)}

Please analyze these responses and provide insights.
"""
        
        # Prepare request to Gemini API
        gemini_url = f"{GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent"
        headers = {
            'Content-Type': 'application/json',
        }
        
        payload = {
            'contents': [{
                'parts': [{
                    'text': context
                }]
            }],
            'systemInstruction': {
                'parts': [{
                    'text': system_prompt
                }]
            },
            'generationConfig': {
                'responseMimeType': 'application/json'
            }
        }
        
        # Make request to Gemini API
        response = requests.post(
            f"{gemini_url}?key={GEMINI_API_KEY}",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 429:
            return jsonify({
                'error': 'Rate Limit Exceeded',
                'message': 'AI service is currently busy. Please try again in a few moments.'
            }), 429
        
        if response.status_code != 200:
            return jsonify({
                'error': 'AI Service Error',
                'message': 'Failed to analyze responses. Please try again.'
            }), 500
        
        result = response.json()
        
        if 'candidates' in result and result['candidates']:
            content = result['candidates'][0]['content']['parts'][0]['text']
            try:
                analysis = json.loads(content)
                return jsonify(analysis)
            except json.JSONDecodeError:
                return jsonify({
                    'error': 'Invalid AI Response',
                    'message': 'AI returned invalid response format'
                }), 500
        else:
            return jsonify({
                'error': 'No AI Response',
                'message': 'AI did not return a response'
            }), 500
    
    except Exception as e:
        return jsonify({
            'error': 'Server Error',
            'message': 'An unexpected error occurred during analysis'
        }), 500

# =============================================
# DUAL-CONTEXT SYSTEM ENDPOINTS
# =============================================

@app.route('/api/ai/generate-dual-context-question', methods=['POST'])
@limiter.limit("15 per minute, 150 per hour")
def generate_dual_context_question():
    """
    Generate a context-aware question using both User Manifesto and Form Context
    This is the production-critical endpoint that solves the AI question generation problem
    """
    try:
        # Validate request
        if not request.is_json:
            return jsonify({
                'error': 'Invalid Content-Type',
                'message': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        required_fields = ['contextPrompt', 'currentQuestion', 'userAnswer', 'manifestoContext']
        
        for field in required_fields:
            if not data or field not in data:
                return jsonify({
                    'error': 'Missing Data',
                    'message': f'{field} is required'
                }), 400
        
        context_prompt = data.get('contextPrompt', '').strip()
        current_question = data.get('currentQuestion', {})
        user_answer = data.get('userAnswer', '').strip()
        manifesto_context = data.get('manifestoContext', {})
        form_context = data.get('formContext', {})
        trigger_reason = data.get('triggerReason', 'user_interest')
        
        if len(user_answer) < 5:
            return jsonify({
                'error': 'Invalid Answer',
                'message': 'User answer must be at least 5 characters long'
            }), 400
        
        # Enhanced system prompt for dual-context question generation
        system_prompt = f"""
You are an expert product strategist and conversation designer. Your goal is to generate intelligent follow-up questions that feel natural, insightful, and strategically valuable.

**CONTEXT INTELLIGENCE:**
You have access to two types of context:
1. **User Manifesto Context**: Explicit product vision, goals, and strategy from the form creator
2. **Form Context**: AI-analyzed insights from previous conversations and user responses

**YOUR MISSION:**
Generate a follow-up question that:
- Feels like it comes from someone who deeply understands the product space
- Builds naturally on the user's specific response
- Aligns with the manifesto's business goals and product vision
- Leverages insights from previous conversations (if available)
- Uncovers actionable product insights
- Maintains the specified conversation tone
- Avoids redundancy with what's already been asked

**QUESTION QUALITY CRITERIA:**
✅ Contextually intelligent (shows you understand their situation)
✅ Strategically aligned (serves the manifesto's goals)
✅ Naturally curious (feels human, not robotic)
✅ Insight-generating (likely to reveal valuable information)
✅ Specific to their answer (couldn't be asked to anyone)

**RESPONSE FORMAT:**
Return a JSON object:
```json
{{
  "question": {{
    "id": "followup_" + random_id,
    "type": "textarea" | "multiple-choice" | "rating" | "text",
    "label": "The follow-up question text",
    "description": "Optional clarifying description",
    "placeholder": "Thoughtful placeholder text",
    "options": [/* if multiple-choice */],
    "required": false
  }},
  "generationContext": {{
    "triggeredBy": "Specific reason this question was generated",
    "manifestoAlignment": ["Which manifesto goals this serves"],
    "formContextUtilized": ["Which insights from form context were used"],
    "expectedInsights": ["What we hope to learn from this question"],
    "followUpPotential": 0-100 // Likelihood this will generate good follow-ups
  }}
}}
```

**EXAMPLES OF GREAT DUAL-CONTEXT QUESTIONS:**

*Bad*: "Can you tell me more about that?"
*Good*: "You mentioned [specific thing from their answer]. Given that your target users are [from manifesto], how do you think this impacts their daily workflow?"

*Bad*: "What features would you like?"
*Good*: "That pain point you described aligns with what we've heard from other [product category] creators. What's the one feature that would make the biggest difference for your [specific user type]?"

The question should make the user think: "Wow, this person really understands my situation and the broader context."

Trigger reason: {trigger_reason}
"""
        
        # Prepare request to Gemini API
        gemini_url = f"{GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent"
        headers = {
            'Content-Type': 'application/json',
        }
        
        payload = {
            'contents': [{
                'parts': [{
                    'text': context_prompt
                }]
            }],
            'systemInstruction': {
                'parts': [{
                    'text': system_prompt
                }]
            },
            'generationConfig': {
                'responseMimeType': 'application/json',
                'temperature': 0.8,  # Higher creativity for more natural questions
                'topP': 0.9
            }
        }
        
        # Make request to Gemini API
        response = requests.post(
            f"{gemini_url}?key={GEMINI_API_KEY}",
            headers=headers,
            json=payload,
            timeout=20
        )
        
        if response.status_code == 429:
            return jsonify({
                'error': 'Rate Limit Exceeded',
                'message': 'AI service is currently busy. Please try again in a few moments.'
            }), 429
        
        if response.status_code != 200:
            return jsonify({
                'error': 'AI Service Error',
                'message': 'Failed to generate contextual question. Please try again.'
            }), 500
        
        result = response.json()
        
        if 'candidates' in result and result['candidates']:
            content = result['candidates'][0]['content']['parts'][0]['text']
            try:
                generated_response = json.loads(content)
                
                # Ensure the response has the required structure
                if 'question' not in generated_response:
                    return jsonify({
                        'error': 'Invalid AI Response',
                        'message': 'AI did not return a valid question structure'
                    }), 500
                
                return jsonify(generated_response)
            except json.JSONDecodeError:
                return jsonify({
                    'error': 'Invalid AI Response',
                    'message': 'AI returned invalid JSON format'
                }), 500
        else:
            return jsonify({
                'error': 'No AI Response',
                'message': 'AI did not return a response'
            }), 500
    
    except Exception as e:
        return jsonify({
            'error': 'Server Error',
            'message': 'An unexpected error occurred during question generation'
        }), 500

@app.route('/api/ai/generate-manifesto-question', methods=['POST'])
@limiter.limit("15 per minute, 150 per hour")
def generate_manifesto_question():
    """
    Generate a question specifically aligned with the user's manifesto
    """
    try:
        if not request.is_json:
            return jsonify({
                'error': 'Invalid Content-Type',
                'message': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        if not data or 'prompt' not in data:
            return jsonify({
                'error': 'Missing Data',
                'message': 'Prompt is required'
            }), 400
        
        prompt = data.get('prompt', '').strip()
        
        system_prompt = """
You are a strategic product consultant. Generate a single, high-value question that directly serves the manifesto's business goals.

The question should:
- Be strategically aligned with the product vision
- Target insights about the specified audience
- Be specific and actionable
- Feel natural and conversational

Return a JSON object:
```json
{
  "question": {
    "id": "manifesto_" + random_id,
    "type": "textarea" | "multiple-choice" | "rating",
    "label": "Question text",
    "placeholder": "Helpful placeholder",
    "required": false
  }
}
```
"""
        
        # Prepare request to Gemini API
        gemini_url = f"{GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent"
        headers = {
            'Content-Type': 'application/json',
        }
        
        payload = {
            'contents': [{
                'parts': [{
                    'text': prompt
                }]
            }],
            'systemInstruction': {
                'parts': [{
                    'text': system_prompt
                }]
            },
            'generationConfig': {
                'responseMimeType': 'application/json'
            }
        }
        
        # Make request to Gemini API
        response = requests.post(
            f"{gemini_url}?key={GEMINI_API_KEY}",
            headers=headers,
            json=payload,
            timeout=15
        )
        
        if response.status_code != 200:
            return jsonify({
                'error': 'AI Service Error',
                'message': 'Failed to generate manifesto question'
            }), 500
        
        result = response.json()
        
        if 'candidates' in result and result['candidates']:
            content = result['candidates'][0]['content']['parts'][0]['text']
            try:
                return jsonify(json.loads(content))
            except json.JSONDecodeError:
                return jsonify({
                    'error': 'Invalid AI Response',
                    'message': 'AI returned invalid JSON'
                }), 500
        
        return jsonify({
            'error': 'No AI Response',
            'message': 'AI did not return a response'
        }), 500
    
    except Exception as e:
        return jsonify({
            'error': 'Server Error',
            'message': 'An unexpected error occurred'
        }), 500

@app.route('/api/ai/generate-manifesto', methods=['POST'])
@limiter.limit("10 per minute, 100 per hour")
def generate_manifesto():
    """
    Generate a comprehensive business manifesto for a form
    """
    try:
        if not request.is_json:
            return jsonify({
                'error': 'Invalid Content-Type',
                'message': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        if not data or 'prompt' not in data:
            return jsonify({
                'error': 'Missing Data',
                'message': 'Prompt is required'
            }), 400
        
        prompt = data.get('prompt', '').strip()
        
        system_prompt = """
You are a strategic business consultant. Create a comprehensive manifesto for intelligent form follow-up questions.

Analyze the form description and generate a structured manifesto that includes:

1. **Product Vision**: The core purpose and strategic goals (2-3 sentences)
2. **Target Audience**: Who this form serves (1-2 sentences)
3. **Business Goals**: 3-5 specific, actionable business objectives
4. **Key Question Areas**: 3-7 topic areas for intelligent follow-up questions
5. **Conversation Tone**: Communication style (friendly, professional, etc.)

The manifesto should guide AI to ask strategic follow-up questions that:
- Gather insights beyond basic form responses
- Align with business objectives
- Provide actionable data for decision-making
- Feel natural and conversational

Return a JSON object:
```json
{
  "manifesto": "Complete manifesto text for display",
  "manifestoData": {
    "productVision": "Strategic vision statement",
    "targetAudience": "Description of target users",
    "businessGoals": ["Goal 1", "Goal 2", "Goal 3"],
    "keyQuestionAreas": ["Area 1", "Area 2", "Area 3"],
    "conversationTone": "friendly|professional|casual|formal"
  }
}
```
"""
        
        # Prepare request to Gemini API
        gemini_url = f"{GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent"
        headers = {
            'Content-Type': 'application/json',
        }
        
        payload = {
            'contents': [{
                'parts': [{
                    'text': prompt
                }]
            }],
            'systemInstruction': {
                'parts': [{
                    'text': system_prompt
                }]
            },
            'generationConfig': {
                'responseMimeType': 'application/json',
                'temperature': 0.7,
                'topP': 0.8
            }
        }
        
        # Make request to Gemini API
        response = requests.post(
            f"{gemini_url}?key={GEMINI_API_KEY}",
            headers=headers,
            json=payload,
            timeout=20
        )
        
        if response.status_code != 200:
            return jsonify({
                'error': 'AI Service Error',
                'message': 'Failed to generate manifesto'
            }), 500
        
        result = response.json()
        
        if 'candidates' in result and result['candidates']:
            content = result['candidates'][0]['content']['parts'][0]['text']
            try:
                parsed_content = json.loads(content)
                
                # Ensure required fields exist
                if 'manifestoData' not in parsed_content:
                    parsed_content['manifestoData'] = {}
                
                # Validate manifestoData structure
                manifesto_data = parsed_content['manifestoData']
                if 'productVision' not in manifesto_data:
                    manifesto_data['productVision'] = 'Understanding user needs and providing valuable assistance'
                if 'targetAudience' not in manifesto_data:
                    manifesto_data['targetAudience'] = 'Users seeking information and assistance'
                if 'businessGoals' not in manifesto_data or not isinstance(manifesto_data['businessGoals'], list):
                    manifesto_data['businessGoals'] = ['understand user needs', 'provide value', 'gather insights']
                if 'keyQuestionAreas' not in manifesto_data or not isinstance(manifesto_data['keyQuestionAreas'], list):
                    manifesto_data['keyQuestionAreas'] = ['user needs', 'preferences', 'goals']
                if 'conversationTone' not in manifesto_data:
                    manifesto_data['conversationTone'] = 'friendly'
                
                # Create manifesto text if not provided
                if 'manifesto' not in parsed_content or not parsed_content['manifesto']:
                    manifesto_text = f"{manifesto_data['productVision']}\n\nTarget Audience: {manifesto_data['targetAudience']}"
                    if manifesto_data['businessGoals']:
                        manifesto_text += f"\n\nBusiness Goals: {', '.join(manifesto_data['businessGoals'])}"
                    if manifesto_data['keyQuestionAreas']:
                        manifesto_text += f"\n\nKey Question Areas: {', '.join(manifesto_data['keyQuestionAreas'])}"
                    parsed_content['manifesto'] = manifesto_text
                
                return jsonify(parsed_content)
                
            except json.JSONDecodeError:
                return jsonify({
                    'error': 'Invalid AI Response',
                    'message': 'AI returned invalid JSON'
                }), 500
        
        return jsonify({
            'error': 'No AI Response',
            'message': 'AI did not return a response'
        }), 500
    
    except Exception as e:
        return jsonify({
            'error': 'Server Error',
            'message': 'An unexpected error occurred'
        }), 500

@app.route('/api/ai/analyze-dual-context-conversation', methods=['POST'])
@limiter.limit("10 per minute, 100 per hour")
def analyze_dual_context_conversation():
    """
    Analyze conversation quality with dual-context awareness
    """
    try:
        if not request.is_json:
            return jsonify({
                'error': 'Invalid Content-Type',
                'message': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        if not data or 'conversationData' not in data:
            return jsonify({
                'error': 'Missing Data',
                'message': 'Conversation data is required'
            }), 400
        
        conversation_data = data.get('conversationData', {})
        form_id = data.get('formId', '')
        
        system_prompt = """
Analyze this conversation for quality, manifesto alignment, and context utilization.

Evaluate:
1. **Quality Score** (0-100): Overall conversation quality and depth
2. **Manifesto Alignment** (0-100): How well questions served the manifesto goals
3. **Context Utilization** (0-100): How effectively previous insights were used
4. **Insights**: Key observations about the conversation
5. **Recommendations**: Specific improvements for future conversations

Return JSON:
```json
{
  "qualityScore": 0-100,
  "manifestoAlignment": 0-100,
  "contextUtilization": 0-100,
  "insights": ["Key insight 1", "Key insight 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}
```
"""
        
        # Prepare request to Gemini API
        gemini_url = f"{GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent"
        headers = {
            'Content-Type': 'application/json',
        }
        
        payload = {
            'contents': [{
                'parts': [{
                    'text': f"Conversation data: {json.dumps(conversation_data, indent=2)}"
                }]
            }],
            'systemInstruction': {
                'parts': [{
                    'text': system_prompt
                }]
            },
            'generationConfig': {
                'responseMimeType': 'application/json'
            }
        }
        
        # Make request to Gemini API
        response = requests.post(
            f"{gemini_url}?key={GEMINI_API_KEY}",
            headers=headers,
            json=payload,
            timeout=20
        )
        
        if response.status_code != 200:
            # Return fallback analysis
            return jsonify({
                'qualityScore': 50,
                'manifestoAlignment': 30,
                'contextUtilization': 20,
                'insights': ['Analysis unavailable - AI service error'],
                'recommendations': ['Ensure AI service is running', 'Check network connection']
            })
        
        result = response.json()
        
        if 'candidates' in result and result['candidates']:
            content = result['candidates'][0]['content']['parts'][0]['text']
            try:
                return jsonify(json.loads(content))
            except json.JSONDecodeError:
                return jsonify({
                    'qualityScore': 50,
                    'manifestoAlignment': 30,
                    'contextUtilization': 20,
                    'insights': ['Analysis unavailable - response format error'],
                    'recommendations': ['Try again later']
                })
        else:
            return jsonify({
                'qualityScore': 50,
                'manifestoAlignment': 30,
                'contextUtilization': 20,
                'insights': ['Analysis unavailable - no AI response'],
                'recommendations': ['Try again later']
            })
    
    except Exception as e:
        return jsonify({
            'qualityScore': 50,
            'manifestoAlignment': 30,
            'contextUtilization': 20,
            'insights': ['Analysis unavailable - server error'],
            'recommendations': ['Try again later']
        })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') != 'production'
    app.run(host='0.0.0.0', port=port, debug=debug) 