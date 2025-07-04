// @ts-nocheck
import { serve } from "https://deno.land/std@0.171.0/http/server.ts";

// =============================================
// CORS CONFIGURATION
// =============================================
// Allow all origins for development. In production you can
// replace "*" with your domain, e.g. "https://myapp.com"
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Helper: generate a secure random form ID (mirrors Python implementation)
function generateSecureFormId(): string {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  
  // Use crypto.getRandomValues for better randomness if available
  const getRandomBytes = (length: number) => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      return Array.from(array);
    } else {
      return Array.from({ length }, () => Math.floor(Math.random() * 256));
    }
  };
  
  // Generate high-entropy ID using timestamp + random data
  const timestamp = Date.now();
  const performanceNow = typeof performance !== 'undefined' ? performance.now() : Math.random() * 1000000;
  const randomBytes = getRandomBytes(20); // High entropy
  
  // Create multiple seeds for better distribution
  let seed1 = timestamp;
  let seed2 = Math.floor(performanceNow * 1000);
  
  // Mix in random bytes
  for (let i = 0; i < randomBytes.length; i++) {
    if (i % 2 === 0) {
      seed1 = (seed1 * 256 + randomBytes[i]) % Number.MAX_SAFE_INTEGER;
    } else {
      seed2 = (seed2 * 256 + randomBytes[i]) % Number.MAX_SAFE_INTEGER;
    }
  }
  
  // Generate parts and combine
  const generatePart = (seed: number, minLength: number) => {
    let result = '';
    let num = seed;
    while (result.length < minLength || num > 0) {
      result = alphabet[num % 62] + result;
      num = Math.floor(num / 62);
    }
    return result;
  };
  
  const part1 = generatePart(seed1, 8);
  const part2 = generatePart(seed2, 8);
  
  // Add final random suffix
  const suffix = getRandomBytes(4).map(byte => alphabet[byte % 62]).join('');
  
  return `form_${part1}${part2}${suffix}`;
}

// Generic JSON response helper (adds CORS headers)
function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

// Build the system prompt exactly as in the Flask backend
function buildSystemPrompt(userPrompt: string): string {
  return `You are an expert form designer and product strategist. Create a comprehensive form structure AND product manifesto based on the user's request.

The user wants: ${userPrompt}

Return a JSON object with this exact structure:
\`\`\`json
{
  "id": "form_" + random_id,
  "title": "Form Title",
  "description": "Form Description", 
  "manifesto": "Product manifesto text for backward compatibility",
  "manifestoData": {
    "productVision": "Clear, concise product vision statement",
    "targetAudience": "Specific description of the target users/customers", 
    "businessGoals": ["goal1", "goal2", "goal3"],
    "keyQuestionAreas": ["area1", "area2", "area3"],
    "conversationTone": "friendly"
  },
  "questions": [
    {
      "id": "welcome",
      "type": "welcome",
      "label": "Welcome message",
      "description": "Brief intro to the form"
    }
    // ... other questions
  ]
}
\`\`\`

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

Be strategic and ensure the form structure serves the manifesto's goals.`;
}

// Main request handler
serve(async (req: Request) => {
  console.log("=== Function Request ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("GEMINI_API_KEY available:", !!GEMINI_API_KEY);
  console.log("GEMINI_API_KEY length:", GEMINI_API_KEY?.length || 0);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight");
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathname = url.pathname;
  console.log("Pathname:", pathname);

  // Health check: GET /health
  if (req.method === "GET" && pathname.endsWith("/health")) {
    console.log("Health check endpoint hit");
    return jsonResponse({ status: "healthy", service: "dynamic-forms-ai" });
  }

  // Generate form: POST /api/ai/generate-form
  if (req.method === "POST" && pathname.endsWith("/api/ai/generate-form")) {
    console.log("Generate form endpoint hit");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not found in environment");
      return jsonResponse({ error: "Configuration Error", message: "GEMINI_API_KEY is not set" }, 500);
    }

    let body: any;
    try {
      body = await req.json();
    } catch (_e) {
      return jsonResponse({ error: "Invalid Content-Type", message: "Request must be JSON" }, 400);
    }

    const prompt: string = (body?.prompt ?? "").trim();
    if (prompt.length < 5) {
      return jsonResponse({ error: "Invalid Prompt", message: "Prompt must be at least 5 characters long" }, 400);
    }

    // Build Gemini request payload
    const systemPrompt = buildSystemPrompt(prompt);
    const geminiPayload = {
      contents: [
        {
          parts: [{ text: `User request: \"${prompt}\"` }],
        },
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    try {
      console.log("Calling Gemini API with key:", GEMINI_API_KEY ? "SET" : "NOT SET");
      console.log("Gemini payload:", JSON.stringify(geminiPayload, null, 2));

      const geminiRes = await fetch(`${GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiPayload),
        },
      );

      console.log("Gemini response status:", geminiRes.status);
      console.log("Gemini response headers:", Object.fromEntries(geminiRes.headers.entries()));

      if (geminiRes.status === 429) {
        return jsonResponse({ error: "Rate Limit Exceeded", message: "AI service is currently busy. Please try again later." }, 429);
      }
      if (!geminiRes.ok) {
        const errorText = await geminiRes.text();
        console.log("Gemini error response:", errorText);
        return jsonResponse({ error: "AI Service Error", message: "Failed to generate form. Please try again." }, 500);
      }

      const geminiData = await geminiRes.json();
      const candidates = geminiData?.candidates ?? [];
      if (candidates.length === 0) {
        return jsonResponse({ error: "Generation Failed", message: "Could not generate form schema. Please try again." }, 500);
      }

      let content: string = candidates[0]?.content?.parts?.[0]?.text ?? "";
      content = content.trim();
      if (content.startsWith("```")) {
        // Strip markdown fences
        const lines = content.split("\n");
        content = lines.slice(1, -1).join("\n");
      }
      // Remove trailing commas that break JSON
      content = content.replace(/,}/g, "}").replace(/,]/g, "]");

      let schema: Record<string, unknown>;
      try {
        schema = JSON.parse(content);
      } catch (_e) {
        return jsonResponse({ error: "Invalid Response", message: "AI generated invalid form schema. Please try again." }, 500);
      }

      // Ensure schema has an ID
      if (!schema["id"]) {
        schema["id"] = generateSecureFormId();
      }

      // Fix validation issues: normalize question types
      if (schema["questions"] && Array.isArray(schema["questions"])) {
        schema["questions"] = schema["questions"].map((q: any) => {
          // Fix multiple_choice -> multiple-choice
          if (q.type === "multiple_choice") {
            q.type = "multiple-choice";
          }
          // Fix options format: ensure they're objects with label/value
          if (q.options && Array.isArray(q.options)) {
            q.options = q.options.map((opt: any) => {
              if (typeof opt === "string") {
                return { label: opt, value: opt };
              }
              return opt;
            });
          }
          return q;
        });
      }

      return jsonResponse(schema);
    } catch (e) {
      // Handle timeout / network
      return jsonResponse({ error: "Unexpected Error", message: e instanceof Error ? e.message : "Unknown error" }, 500);
    }
  }

  // Generate manifesto only: POST /api/ai/generate-manifesto
  if (req.method === "POST" && pathname.endsWith("/api/ai/generate-manifesto")) {
    console.log("Generate manifesto endpoint hit");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not found in environment");
      return jsonResponse({ error: "Configuration Error", message: "GEMINI_API_KEY is not set" }, 500);
    }

    let body: any;
    try {
      body = await req.json();
    } catch (_e) {
      return jsonResponse({ error: "Invalid Content-Type", message: "Request must be JSON" }, 400);
    }

    const prompt: string = (body?.prompt ?? "").trim();
    if (prompt.length < 5) {
      return jsonResponse({ error: "Invalid Prompt", message: "Prompt must be at least 5 characters long" }, 400);
    }

    // Build manifesto-only system prompt
    const manifestoPrompt = `You are an expert product strategist. Create a comprehensive product manifesto based on the user's request.

The user wants: ${prompt}

Return a JSON object with this exact structure:
\`\`\`json
{
  "manifesto": "Product manifesto text for backward compatibility",
  "manifestoData": {
    "productVision": "Clear, concise product vision statement",
    "targetAudience": "Specific description of the target users/customers", 
    "businessGoals": ["goal1", "goal2", "goal3"],
    "keyQuestionAreas": ["area1", "area2", "area3"],
    "conversationTone": "friendly"
  }
}
\`\`\`

MANIFESTO REQUIREMENTS:
- productVision: 1-2 sentences describing the core purpose and value proposition
- targetAudience: Specific user demographics, behaviors, or characteristics  
- businessGoals: 3-5 specific business objectives this helps achieve
- keyQuestionAreas: 3-5 key topics that should be explored
- conversationTone: Either "friendly", "professional", "casual", or "expert" based on the target audience`;

    const geminiPayload = {
      contents: [
        {
          parts: [{ text: `User request: \"${prompt}\"` }],
        },
      ],
      systemInstruction: {
        parts: [{ text: manifestoPrompt }],
      },
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    try {
      const geminiRes = await fetch(`${GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiPayload),
        },
      );

      if (geminiRes.status === 429) {
        return jsonResponse({ error: "Rate Limit Exceeded", message: "AI service is currently busy. Please try again later." }, 429);
      }
      if (!geminiRes.ok) {
        const errorText = await geminiRes.text();
        console.log("Gemini error response:", errorText);
        return jsonResponse({ error: "AI Service Error", message: "Failed to generate manifesto. Please try again." }, 500);
      }

      const geminiData = await geminiRes.json();
      const candidates = geminiData?.candidates ?? [];
      if (candidates.length === 0) {
        return jsonResponse({ error: "Generation Failed", message: "Could not generate manifesto. Please try again." }, 500);
      }

      let content: string = candidates[0]?.content?.parts?.[0]?.text ?? "";
      content = content.trim();
      if (content.startsWith("```")) {
        const lines = content.split("\n");
        content = lines.slice(1, -1).join("\n");
      }
      content = content.replace(/,}/g, "}").replace(/,]/g, "]");

      let manifesto: Record<string, unknown>;
      try {
        manifesto = JSON.parse(content);
      } catch (_e) {
        return jsonResponse({ error: "Invalid Response", message: "AI generated invalid manifesto. Please try again." }, 500);
      }

      return jsonResponse(manifesto);
    } catch (e) {
      return jsonResponse({ error: "Unexpected Error", message: e instanceof Error ? e.message : "Unknown error" }, 500);
    }
  }

  // Generate follow-up question: POST /api/ai/generate-followup
  if (req.method === "POST" && pathname.endsWith("/api/ai/generate-followup")) {
    console.log("Generate followup endpoint hit");
    if (!GEMINI_API_KEY) {
      return jsonResponse({ error: "Configuration Error", message: "GEMINI_API_KEY is not set" }, 500);
    }

    let body: any;
    try {
      body = await req.json();
    } catch (_e) {
      return jsonResponse({ error: "Invalid Content-Type", message: "Request must be JSON" }, 400);
    }

    const { originalQuestion, userAnswer } = body;
    if (!originalQuestion || !userAnswer || typeof userAnswer !== 'string' || userAnswer.trim().length === 0) {
      return jsonResponse(null);
    }

    const followupPrompt = `Generate a thoughtful follow-up question based on the user's answer.

Original Question: ${originalQuestion.label}
User's Answer: ${userAnswer}

Return a JSON object with this structure:
\`\`\`json
{
  "id": "followup_" + timestamp,
  "type": "textarea",
  "label": "Follow-up question text",
  "placeholder": "Please elaborate...",
  "required": false
}
\`\`\`

Make the follow-up question:
- Relevant to their answer
- Encouraging deeper insight
- Natural and conversational
- Brief but meaningful`;

    const geminiPayload = {
      contents: [{ parts: [{ text: followupPrompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    };

    try {
      const geminiRes = await fetch(`${GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      });

      if (!geminiRes.ok) {
        return jsonResponse(null);
      }

      const geminiData = await geminiRes.json();
      const candidates = geminiData?.candidates ?? [];
      if (candidates.length === 0) {
        return jsonResponse(null);
      }

      let content = candidates[0]?.content?.parts?.[0]?.text ?? "";
      content = content.trim();
      if (content.startsWith("```")) {
        const lines = content.split("\n");
        content = lines.slice(1, -1).join("\n");
      }
      content = content.replace(/,}/g, "}").replace(/,]/g, "]");

      try {
        const followup = JSON.parse(content);
        followup.id = `followup_${Date.now()}`;
        return jsonResponse(followup);
      } catch (_e) {
        return jsonResponse(null);
      }
    } catch (e) {
      return jsonResponse(null);
    }
  }

  // Enhanced follow-up: POST /api/ai/generate-intelligent-followup-enhanced
  if (req.method === "POST" && pathname.endsWith("/api/ai/generate-intelligent-followup-enhanced")) {
    console.log("Generate intelligent followup enhanced endpoint hit");
    if (!GEMINI_API_KEY) {
      return jsonResponse({ error: "Configuration Error", message: "GEMINI_API_KEY is not set" }, 500);
    }

    let body: any;
    try {
      body = await req.json();
    } catch (_e) {
      return jsonResponse({ error: "Invalid Content-Type", message: "Request must be JSON" }, 400);
    }

    const { formManifesto, conversationContext, currentQuestion, userAnswer, allPreviousAnswers } = body;

    const enhancedPrompt = `You are an expert conversation designer. Generate an intelligent follow-up question.

CONTEXT:
Form Purpose: ${formManifesto}
Current Question: ${currentQuestion.label}
User's Answer: ${userAnswer}
Previous Answers: ${JSON.stringify(allPreviousAnswers)}

Generate a follow-up that:
- Builds on their specific answer
- Aligns with the form's purpose
- Encourages deeper insights
- Feels natural and conversational

Return JSON:
\`\`\`json
{
  "id": "enhanced_followup_" + timestamp,
  "type": "textarea",
  "label": "Your intelligent follow-up question",
  "placeholder": "Share more details...",
  "required": false
}
\`\`\``;

    const geminiPayload = {
      contents: [{ parts: [{ text: enhancedPrompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    };

    try {
      const geminiRes = await fetch(`${GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      });

      if (!geminiRes.ok) {
        return jsonResponse(null);
      }

      const geminiData = await geminiRes.json();
      const candidates = geminiData?.candidates ?? [];
      if (candidates.length === 0) {
        return jsonResponse(null);
      }

      let content = candidates[0]?.content?.parts?.[0]?.text ?? "";
      content = content.trim();
      if (content.startsWith("```")) {
        const lines = content.split("\n");
        content = lines.slice(1, -1).join("\n");
      }
      content = content.replace(/,}/g, "}").replace(/,]/g, "]");

      try {
        const followup = JSON.parse(content);
        followup.id = `enhanced_followup_${Date.now()}`;
        return jsonResponse(followup);
      } catch (_e) {
        return jsonResponse(null);
      }
    } catch (e) {
      return jsonResponse(null);
    }
  }

  // Analyze form: POST /api/ai/analyze-form
  if (req.method === "POST" && pathname.endsWith("/api/ai/analyze-form")) {
    console.log("Analyze form endpoint hit");
    if (!GEMINI_API_KEY) {
      return jsonResponse({ error: "Configuration Error", message: "GEMINI_API_KEY is not set" }, 500);
    }

    let body: any;
    try {
      body = await req.json();
    } catch (_e) {
      return jsonResponse({ error: "Invalid Content-Type", message: "Request must be JSON" }, 400);
    }

    const { formSchema } = body;
    
    const analysisPrompt = `Analyze this form schema and provide insights.

Form: ${JSON.stringify(formSchema)}

Provide analysis in this EXACT JSON format:
\`\`\`json
{
  "overall_score": 85,
  "insights": [
    {
      "category": "Form Structure",
      "type": "positive",
      "title": "Well-organized question flow",
      "description": "Questions follow a logical progression",
      "impact": "high"
    },
    {
      "category": "Question Quality",
      "type": "warning",
      "title": "Some questions may be unclear",
      "description": "Consider simplifying complex questions",
      "impact": "medium"
    }
  ],
  "recommendations": [
    {
      "priority": "high",
      "action": "Add progress indicator",
      "reason": "Users benefit from knowing their progress"
    }
  ],
  "strengths": [
    "Clear question labels",
    "Good use of different question types",
    "Logical flow"
  ],
  "weaknesses": [
    "Some questions could be shorter",
    "Missing validation on key fields"
  ]
}
\`\`\``;

    const geminiPayload = {
      contents: [{ parts: [{ text: analysisPrompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    };

    try {
      const geminiRes = await fetch(`${GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      });

      if (!geminiRes.ok) {
        return jsonResponse({ error: "AI Service Error", message: "Failed to analyze form" }, 500);
      }

      const geminiData = await geminiRes.json();
      const candidates = geminiData?.candidates ?? [];
      if (candidates.length === 0) {
        return jsonResponse({ error: "Analysis Failed", message: "Could not analyze form" }, 500);
      }

      let content = candidates[0]?.content?.parts?.[0]?.text ?? "";
      content = content.trim();
      if (content.startsWith("```")) {
        const lines = content.split("\n");
        content = lines.slice(1, -1).join("\n");
      }
      content = content.replace(/,}/g, "}").replace(/,]/g, "]");

      const analysis = JSON.parse(content);
      return jsonResponse(analysis);
    } catch (e) {
      return jsonResponse({ error: "Unexpected Error", message: e instanceof Error ? e.message : "Unknown error" }, 500);
    }
  }

  // Analyze form responses: POST /api/ai/analyze-form-responses
  if (req.method === "POST" && pathname.endsWith("/api/ai/analyze-form-responses")) {
    console.log("Analyze form responses endpoint hit");
    if (!GEMINI_API_KEY) {
      return jsonResponse({ error: "Configuration Error", message: "GEMINI_API_KEY is not set" }, 500);
    }

    let body: any;
    try {
      body = await req.json();
    } catch (_e) {
      return jsonResponse({ error: "Invalid Content-Type", message: "Request must be JSON" }, 400);
    }

    const { formSchema, responses } = body;
    
    const analysisPrompt = `Analyze these form responses and provide insights.

Form: ${formSchema.title}
Responses: ${JSON.stringify(responses.slice(0, 10))} // Limit for token efficiency

Provide analysis in this JSON format:
\`\`\`json
{
  "summary": {
    "totalResponses": ${responses.length},
    "completionRate": 85,
    "averageTimeSpent": "5 minutes"
  },
  "insights": [
    "Most users prefer option A",
    "Common theme: ease of use"
  ],
  "patterns": [
    "Users who answer X tend to also answer Y"
  ],
  "recommendations": [
    "Consider adding follow-up questions"
  ]
}
\`\`\``;

    const geminiPayload = {
      contents: [{ parts: [{ text: analysisPrompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    };

    try {
      const geminiRes = await fetch(`${GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      });

      if (!geminiRes.ok) {
        return jsonResponse({ error: "AI Service Error", message: "Failed to analyze responses" }, 500);
      }

      const geminiData = await geminiRes.json();
      const candidates = geminiData?.candidates ?? [];
      if (candidates.length === 0) {
        return jsonResponse({ error: "Analysis Failed", message: "Could not analyze responses" }, 500);
      }

      let content = candidates[0]?.content?.parts?.[0]?.text ?? "";
      content = content.trim();
      if (content.startsWith("```")) {
        const lines = content.split("\n");
        content = lines.slice(1, -1).join("\n");
      }
      content = content.replace(/,}/g, "}").replace(/,]/g, "]");

      const analysis = JSON.parse(content);
      return jsonResponse(analysis);
    } catch (e) {
      return jsonResponse({ error: "Unexpected Error", message: e instanceof Error ? e.message : "Unknown error" }, 500);
    }
  }

  // Analyze manifesto responses: POST /api/ai/analyze-manifesto-responses
  if (req.method === "POST" && pathname.endsWith("/api/ai/analyze-manifesto-responses")) {
    console.log("Analyze manifesto responses endpoint hit");
    if (!GEMINI_API_KEY) {
      return jsonResponse({ error: "Configuration Error", message: "GEMINI_API_KEY is not set" }, 500);
    }

    let body: any;
    try {
      body = await req.json();
    } catch (_e) {
      return jsonResponse({ error: "Invalid Content-Type", message: "Request must be JSON" }, 400);
    }

    const { formSchema, responses } = body;
    
    const analysisPrompt = `Analyze how well these responses align with the form's manifesto and goals. Focus on what people like vs dislike and provide actionable insights.

Form Manifesto: ${formSchema.manifesto}
Business Goals: ${JSON.stringify(formSchema.manifestoData?.businessGoals)}
Responses: ${JSON.stringify(responses.slice(0, 10))}

Provide analysis in this EXACT JSON format:
\`\`\`json
{
  "overview": {
    "totalResponses": ${responses.length},
    "manifestoAlignment": "high",
    "topPriority": "Main priority based on analysis"
  },
  "whatPeopleLike": [
    {
      "insight": "What users appreciate",
      "evidence": ["Specific quotes or data points"],
      "impact": "high",
      "manifestoConnection": "How this relates to your manifesto"
    }
  ],
  "whatPeopleDislike": [
    {
      "problem": "What users find problematic",
      "evidence": ["Specific quotes or data points"],
      "impact": "medium",
      "manifestoConnection": "How this relates to your manifesto"
    }
  ],
  "actionableInsights": [
    {
      "title": "Insight title",
      "description": "Detailed description",
      "action": "Specific action to take",
      "priority": "high",
      "effort": "low",
      "expectedImpact": "What you can expect from this change"
    }
  ],
  "recommendedActions": [
    {
      "action": "Specific recommendation",
      "reason": "Why this is important",
      "timeframe": "1-2 weeks",
      "resources": ["Resource 1", "Resource 2"],
      "success_metric": "How to measure success"
    }
  ]
}
\`\`\``;

    const geminiPayload = {
      contents: [{ parts: [{ text: analysisPrompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    };

    try {
      const geminiRes = await fetch(`${GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      });

      if (!geminiRes.ok) {
        return jsonResponse({ error: "AI Service Error", message: "Failed to analyze manifesto alignment" }, 500);
      }

      const geminiData = await geminiRes.json();
      const candidates = geminiData?.candidates ?? [];
      if (candidates.length === 0) {
        return jsonResponse({ error: "Analysis Failed", message: "Could not analyze manifesto alignment" }, 500);
      }

      let content = candidates[0]?.content?.parts?.[0]?.text ?? "";
      content = content.trim();
      if (content.startsWith("```")) {
        const lines = content.split("\n");
        content = lines.slice(1, -1).join("\n");
      }
      content = content.replace(/,}/g, "}").replace(/,]/g, "]");

      const analysis = JSON.parse(content);
      return jsonResponse(analysis);
    } catch (e) {
      return jsonResponse({ error: "Unexpected Error", message: e instanceof Error ? e.message : "Unknown error" }, 500);
    }
  }

  // Generate dual context question: POST /api/ai/generate-dual-context-question
  if (req.method === "POST" && pathname.endsWith("/api/ai/generate-dual-context-question")) {
    console.log("Generate dual context question endpoint hit");
    if (!GEMINI_API_KEY) {
      return jsonResponse({ error: "Configuration Error", message: "GEMINI_API_KEY is not set" }, 500);
    }

    let body: any;
    try {
      body = await req.json();
    } catch (_e) {
      return jsonResponse({ error: "Invalid Content-Type", message: "Request must be JSON" }, 400);
    }

    const { currentQuestion, userAnswer, manifestoContext, formContext, triggerReason } = body;
    
    const dualContextPrompt = `Generate a context-aware follow-up question using dual context analysis.

CURRENT QUESTION: ${currentQuestion.label}
USER'S ANSWER: ${userAnswer}
MANIFESTO CONTEXT: ${JSON.stringify(manifestoContext)}
FORM CONTEXT: ${JSON.stringify(formContext)}
TRIGGER REASON: ${triggerReason}

Generate a follow-up question that:
- Leverages both manifesto and form context
- Builds naturally on the user's answer
- Aligns with business goals
- Provides valuable insights

Return JSON:
\`\`\`json
{
  "question": {
    "id": "dual_context_" + timestamp,
    "type": "textarea",
    "label": "Your context-aware question",
    "placeholder": "Please share more...",
    "required": false
  },
  "generationContext": {
    "triggeredBy": "${triggerReason}",
    "manifestoAlignment": ["relevant goals"],
    "formContextUtilized": ["utilized themes"],
    "expectedInsights": ["expected insights"],
    "followUpPotential": 85
  }
}
\`\`\``;

    const geminiPayload = {
      contents: [{ parts: [{ text: dualContextPrompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    };

    try {
      const geminiRes = await fetch(`${GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      });

      if (!geminiRes.ok) {
        return jsonResponse(null);
      }

      const geminiData = await geminiRes.json();
      const candidates = geminiData?.candidates ?? [];
      if (candidates.length === 0) {
        return jsonResponse(null);
      }

      let content = candidates[0]?.content?.parts?.[0]?.text ?? "";
      content = content.trim();
      if (content.startsWith("```")) {
        const lines = content.split("\n");
        content = lines.slice(1, -1).join("\n");
      }
      content = content.replace(/,}/g, "}").replace(/,]/g, "]");

      try {
        const result = JSON.parse(content);
        if (result.question) {
          result.question.id = `dual_context_${Date.now()}`;
        }
        return jsonResponse(result);
      } catch (_e) {
        return jsonResponse(null);
      }
    } catch (e) {
      return jsonResponse(null);
    }
  }

  // Generate manifesto question: POST /api/ai/generate-manifesto-question
  if (req.method === "POST" && pathname.endsWith("/api/ai/generate-manifesto-question")) {
    console.log("Generate manifesto question endpoint hit");
    if (!GEMINI_API_KEY) {
      return jsonResponse({ error: "Configuration Error", message: "GEMINI_API_KEY is not set" }, 500);
    }

    let body: any;
    try {
      body = await req.json();
    } catch (_e) {
      return jsonResponse({ error: "Invalid Content-Type", message: "Request must be JSON" }, 400);
    }

    const { manifestoContext, conversationHistory } = body;
    
    const manifestoPrompt = `Generate a question that aligns with the manifesto and conversation context.

MANIFESTO CONTEXT: ${JSON.stringify(manifestoContext)}
CONVERSATION HISTORY: ${JSON.stringify(conversationHistory)}

Generate a question that:
- Aligns with the product vision and business goals
- Builds on the conversation history
- Targets the specified audience
- Explores key question areas

Return JSON:
\`\`\`json
{
  "question": {
    "id": "manifesto_aligned_" + timestamp,
    "type": "textarea",
    "label": "Your manifesto-aligned question",
    "placeholder": "Please elaborate...",
    "required": false
  }
}
\`\`\``;

    const geminiPayload = {
      contents: [{ parts: [{ text: manifestoPrompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    };

    try {
      const geminiRes = await fetch(`${GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      });

      if (!geminiRes.ok) {
        return jsonResponse(null);
      }

      const geminiData = await geminiRes.json();
      const candidates = geminiData?.candidates ?? [];
      if (candidates.length === 0) {
        return jsonResponse(null);
      }

      let content = candidates[0]?.content?.parts?.[0]?.text ?? "";
      content = content.trim();
      if (content.startsWith("```")) {
        const lines = content.split("\n");
        content = lines.slice(1, -1).join("\n");
      }
      content = content.replace(/,}/g, "}").replace(/,]/g, "]");

      try {
        const result = JSON.parse(content);
        if (result.question) {
          result.question.id = `manifesto_aligned_${Date.now()}`;
        }
        return jsonResponse(result);
      } catch (_e) {
        return jsonResponse(null);
      }
    } catch (e) {
      return jsonResponse(null);
    }
  }

  // Analyze dual context conversation: POST /api/ai/analyze-dual-context-conversation
  if (req.method === "POST" && pathname.endsWith("/api/ai/analyze-dual-context-conversation")) {
    console.log("Analyze dual context conversation endpoint hit");
    if (!GEMINI_API_KEY) {
      return jsonResponse({ error: "Configuration Error", message: "GEMINI_API_KEY is not set" }, 500);
    }

    let body: any;
    try {
      body = await req.json();
    } catch (_e) {
      return jsonResponse({ error: "Invalid Content-Type", message: "Request must be JSON" }, 400);
    }

    const { formId, conversationData } = body;
    
    const analysisPrompt = `Analyze this dual-context conversation for quality and alignment.

FORM ID: ${formId}
CONVERSATION DATA: ${JSON.stringify(conversationData)}

Analyze:
- Quality score based on depth and engagement
- Manifesto alignment score
- Context utilization effectiveness
- Actionable insights discovered
- Recommendations for improvement

Return JSON:
\`\`\`json
{
  "qualityScore": 85,
  "manifestoAlignment": 78,
  "contextUtilization": 92,
  "insights": [
    "Strong engagement with product vision",
    "User responses align with target audience"
  ],
  "recommendations": [
    "Explore business goal #2 more deeply",
    "Add follow-up on key theme X"
  ]
}
\`\`\``;

    const geminiPayload = {
      contents: [{ parts: [{ text: analysisPrompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    };

    try {
      const geminiRes = await fetch(`${GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      });

      if (!geminiRes.ok) {
        return jsonResponse({ error: "AI Service Error", message: "Failed to analyze conversation" }, 500);
      }

      const geminiData = await geminiRes.json();
      const candidates = geminiData?.candidates ?? [];
      if (candidates.length === 0) {
        return jsonResponse({ error: "Analysis Failed", message: "Could not analyze conversation" }, 500);
      }

      let content = candidates[0]?.content?.parts?.[0]?.text ?? "";
      content = content.trim();
      if (content.startsWith("```")) {
        const lines = content.split("\n");
        content = lines.slice(1, -1).join("\n");
      }
      content = content.replace(/,}/g, "}").replace(/,]/g, "]");

      const analysis = JSON.parse(content);
      return jsonResponse(analysis);
    } catch (e) {
      return jsonResponse({ error: "Unexpected Error", message: e instanceof Error ? e.message : "Unknown error" }, 500);
    }
  }

  // Default 404 for other routes
  return jsonResponse({ error: "Not Found" }, 404);
}); 