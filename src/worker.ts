type JsonBody = Record<string, unknown> | unknown[] | string | number | boolean | null;
type AssetsBinding = { fetch(request: Request): Promise<Response> };

interface Env {
  ASSETS: AssetsBinding;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  ALLOWED_ORIGINS?: string;
}

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const SUPPORTED_QUESTION_TYPES = new Set(["welcome", "text", "textarea", "multiple-choice", "rating", "email"]);

function allowedOrigins(env: Env): string[] {
  return (
    env.ALLOWED_ORIGINS ??
    "https://forms.orkx.xyz,https://dynamic-form-9vd.pages.dev,http://localhost:5173,http://127.0.0.1:5173"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const origins = allowedOrigins(env);
  const allowedOrigin = origins.includes(origin) ? origin : origins[0] ?? "";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

function json(body: JsonBody, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return await request.json();
  } catch {
    throw new Response(JSON.stringify({ error: "Invalid Content-Type", message: "Request must be JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function askGemini(env: Env, systemPrompt: string, userText: string): Promise<unknown> {
  const apiKey = env.GEMINI_API_KEY;
  const model = env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
  if (!apiKey) {
    throw new Error("MISSING_GEMINI_API_KEY");
  }

  const response = await fetch(`${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userText }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (response.status === 429) {
    throw new Error("RATE_LIMIT");
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("Gemini request failed", {
      status: response.status,
      model,
      body: errorText.slice(0, 500),
    });
    throw new Error("GEMINI_REQUEST_FAILED");
  }

  const payload = await response.json();
  let content = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  content = String(content).trim();
  if (content.startsWith("```")) {
    const lines = content.split("\n");
    content = lines.slice(1, -1).join("\n");
  }
  content = content.replace(/,}/g, "}").replace(/,]/g, "]");

  return JSON.parse(content);
}

function normalizeQuestion(question: any): any {
  const normalized = { ...question };
  const rawType = String(normalized.type ?? "text").toLowerCase().replace(/_/g, "-");

  if (rawType === "multiple-choice" || rawType === "select" || rawType === "dropdown" || rawType === "radio") {
    normalized.type = "multiple-choice";
  } else if (rawType === "checkbox" || rawType === "checkboxes" || rawType === "boolean") {
    normalized.type = "multiple-choice";
    normalized.options ??= [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ];
  } else if (rawType === "scale" || rawType === "likert") {
    normalized.type = "rating";
  } else if (rawType === "long-text" || rawType === "longtext") {
    normalized.type = "textarea";
  } else if (rawType === "email") {
    normalized.type = "email";
  } else if (rawType === "welcome") {
    normalized.type = "welcome";
  } else if (!SUPPORTED_QUESTION_TYPES.has(rawType)) {
    normalized.type = "text";
  } else {
    normalized.type = rawType;
  }

  if (Array.isArray(normalized.options)) {
    normalized.options = normalized.options.map((option: any) =>
      typeof option === "string" ? { label: option, value: option } : option
    );
  }
  if (normalized.type === "multiple-choice" && (!Array.isArray(normalized.options) || normalized.options.length === 0)) {
    normalized.options = [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ];
  }
  if (normalized.type === "rating") {
    normalized.min = Number.isFinite(normalized.min) ? normalized.min : 1;
    normalized.max = Number.isFinite(normalized.max) ? normalized.max : 5;
    normalized.minLabel ??= "Low";
    normalized.maxLabel ??= "High";
  }
  normalized.id ??= `q_${crypto.randomUUID().replace(/-/g, "")}`;
  normalized.label ??= "Question";
  return normalized;
}

function normalizeFormSchema(schema: any): any {
  const normalized = { ...schema };
  normalized.id ??= `form_${crypto.randomUUID().replace(/-/g, "")}`;
  normalized.title ??= "Untitled Form";
  normalized.description ??= "";
  normalized.questions = Array.isArray(normalized.questions)
    ? normalized.questions.map(normalizeQuestion)
    : [];
  if (!normalized.questions.length || normalized.questions[0]?.type !== "welcome") {
    normalized.questions.unshift({
      id: "welcome",
      type: "welcome",
      label: "Welcome",
      description: "Thanks for taking the time to complete this form.",
    });
  }
  return normalized;
}

function promptFor(kind: string, body: Record<string, unknown>): { system: string; user: string } {
  const prompt = String(body.prompt ?? "").trim();

  if (kind === "generate-form") {
    return {
      system: `You are a senior form strategist. Return only valid JSON, no markdown.

Build forms that collect useful information with the fewest necessary questions.

Allowed question types only:
- welcome
- text
- textarea
- email
- multiple-choice
- rating

Never output unsupported types such as number, phone, date, time, url, select, checkbox, dropdown, file, signature, address, slider, or boolean. Convert them:
- counts, phone numbers, dates, URLs, names, company names: use text
- long explanations, goals, concerns, context: use textarea
- yes/no or fixed choices: use multiple-choice
- satisfaction, priority, importance, likelihood: use rating

Question rules:
- First question must be type welcome.
- Ask 3-7 real questions after welcome.
- Do not ask redundant confirmation questions.
- Do not ask follow-up style questions in the initial form.
- Do not ask "is this correct?" for names, emails, counts, or simple facts.
- For event attendance counts, use text with a clear label such as "How many people will be attending with you?"
- Use short, direct labels.
- multiple-choice questions must include 2-6 options as {"label":"string","value":"string"}.
- rating questions must include min, max, minLabel, maxLabel.

JSON shape:
{"id":"form_id","title":"string","description":"string","manifesto":"string","manifestoData":{"productVision":"string","targetAudience":"string","businessGoals":["string"],"keyQuestionAreas":["string"],"conversationTone":"friendly|professional|casual|expert"},"questions":[{"id":"welcome","type":"welcome","label":"string","description":"string"},{"id":"q1","type":"text|textarea|multiple-choice|rating|email","label":"string","description":"string","placeholder":"string","required":true,"options":[{"label":"string","value":"string"}],"min":1,"max":5,"minLabel":"string","maxLabel":"string"}]}`,
      user: `Create the form requested by the user. User request: ${prompt}`,
    };
  }

  if (kind === "generate-manifesto") {
    return {
      system: `Return only valid JSON. Shape: {"manifesto":"string","manifestoData":{"productVision":"string","targetAudience":"string","businessGoals":["string"],"keyQuestionAreas":["string"],"conversationTone":"friendly|professional|casual|expert"}}.`,
      user: `Create manifesto for: ${prompt}`,
    };
  }

  if (kind === "generate-followup") {
    return {
      system: `Return only valid JSON for one useful follow-up question, or null if no follow-up is needed.

Do not generate a follow-up for clear factual answers: names, emails, phone numbers, addresses, dates, counts, URLs, company names, or yes/no answers.
Do not ask confirmation questions like "Is Owais your full name?" or "Is this correct?"
Only ask a follow-up when the answer reveals ambiguity, motivation, pain, preference, tradeoff, or a detail that directly helps the form goal.
Allowed output question type: textarea.
Shape: {"id":"followup_id","type":"textarea","label":"string","placeholder":"string","required":false}`,
      user: `Original question: ${JSON.stringify(body.originalQuestion)}\nUser answer: ${body.userAnswer}`,
    };
  }

  if (kind === "generate-intelligent-followup-enhanced") {
    return {
      system: `Return only valid JSON for one intelligent follow-up, or null if the next best action is to continue.

Hard rules:
- Do not follow up on basic identity/contact/logistics fields: name, email, phone, address, date, time, attendee count, URL, company name.
- Do not follow up on short clear factual answers like "Owais", "2", "yes", "no", an email address, or a phone number.
- Never ask confirmation questions such as "Is Owais your correct full name?".
- Ask a follow-up only when it will uncover useful context, reasoning, constraints, preferences, pain points, or product insight.
- Follow-ups should feel natural and necessary, not nosy or repetitive.
- Allowed output question type: textarea.

Shape: {"id":"enhanced_followup_id","type":"textarea","label":"string","placeholder":"string","required":false}`,
      user: JSON.stringify(body),
    };
  }

  if (kind === "generate-dual-context-question") {
    return {
      system: `Return only valid JSON. Shape: {"question":{"id":"dual_context_id","type":"textarea","label":"string","placeholder":"string","required":false},"generationContext":{"triggeredBy":"string","manifestoAlignment":["string"],"formContextUtilized":["string"],"expectedInsights":["string"],"followUpPotential":80}}.`,
      user: JSON.stringify(body),
    };
  }

  if (kind === "generate-manifesto-question") {
    return {
      system: `Return only valid JSON. Shape: {"question":{"id":"manifesto_question_id","type":"textarea","label":"string","placeholder":"string","required":false},"reasoning":"string"}.`,
      user: JSON.stringify(body),
    };
  }

  if (kind === "analyze-form") {
    return {
      system: `Return only valid JSON. Shape: {"overall_score":85,"insights":[{"category":"string","type":"positive|warning|negative","title":"string","description":"string","impact":"low|medium|high"}],"recommendations":[{"priority":"low|medium|high","action":"string","reason":"string"}],"strengths":["string"],"weaknesses":["string"]}.`,
      user: JSON.stringify(body.formSchema ?? body),
    };
  }

  if (kind === "analyze-form-responses") {
    return {
      system: `Return only valid JSON. Shape: {"summary":{"totalResponses":0,"completionRate":0,"averageTimeSpent":"string"},"insights":["string"],"patterns":["string"],"recommendations":["string"]}.`,
      user: JSON.stringify(body),
    };
  }

  if (kind === "analyze-manifesto-responses") {
    return {
      system: `Return only valid JSON. Shape: {"overview":{"totalResponses":0,"manifestoAlignment":"low|medium|high","topPriority":"string"},"whatPeopleLike":[{"insight":"string","evidence":["string"],"impact":"low|medium|high","manifestoConnection":"string"}],"whatPeopleDislike":[{"problem":"string","evidence":["string"],"impact":"low|medium|high","manifestoConnection":"string"}],"actionableInsights":[{"title":"string","description":"string","action":"string","priority":"low|medium|high","effort":"low|medium|high","expectedImpact":"string"}],"recommendedActions":[{"action":"string","reason":"string","timeframe":"string","resources":["string"],"success_metric":"string"}]}.`,
      user: JSON.stringify(body),
    };
  }

  return {
    system: `Return only valid JSON. Shape: {"score":0,"insights":["string"],"recommendations":["string"]}.`,
    user: JSON.stringify(body),
  };
}

async function handleAi(
  env: Env,
  kind: string,
  request: Request,
  headers: Record<string, string>
): Promise<Response> {
  const body = await readJson(request);
  if ((kind === "generate-form" || kind === "generate-manifesto") && String(body.prompt ?? "").trim().length < 5) {
    return json({ error: "Invalid Prompt", message: "Prompt must be at least 5 characters long" }, 400, headers);
  }

  try {
    const { system, user } = promptFor(kind, body);
    const result = await askGemini(env, system, user);

    if (kind === "generate-form") return json(normalizeFormSchema(result), 200, headers);
    if (kind.includes("followup") && result && typeof result === "object" && !Array.isArray(result)) {
      return json({ id: `${kind}_${Date.now()}`, ...result }, 200, headers);
    }
    return json(result as JsonBody, 200, headers);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof Error && error.message === "MISSING_GEMINI_API_KEY") {
      return json({ error: "Configuration Error", message: "Service temporarily unavailable" }, 500, headers);
    }
    if (error instanceof Error && error.message === "RATE_LIMIT") {
      return json({ error: "Rate Limit Exceeded", message: "AI service is currently busy. Please try again later." }, 429, headers);
    }
    console.error("AI request failed", error instanceof Error ? error.message : String(error));
    return json({ error: "AI Service Error", message: "Failed to complete AI request. Please try again." }, 500, headers);
  }
}

const routes: Record<string, string> = {
  "/api/ai/generate-form": "generate-form",
  "/api/ai/generate-manifesto": "generate-manifesto",
  "/api/ai/generate-followup": "generate-followup",
  "/api/ai/generate-intelligent-followup-enhanced": "generate-intelligent-followup-enhanced",
  "/api/ai/analyze-form": "analyze-form",
  "/api/ai/analyze-form-responses": "analyze-form-responses",
  "/api/ai/analyze-manifesto-responses": "analyze-manifesto-responses",
  "/api/ai/generate-dual-context-question": "generate-dual-context-question",
  "/api/ai/generate-manifesto-question": "generate-manifesto-question",
  "/api/ai/analyze-dual-context-conversation": "analyze-dual-context-conversation",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response("ok", { headers });

    const pathname = new URL(request.url).pathname;
    if (request.method === "GET" && pathname === "/api/ai/health") {
      return json({ status: "healthy", service: "dynamic-forms-ai" }, 200, headers);
    }

    const matchedRoute = Object.keys(routes).find((route) => pathname === route);
    if (request.method === "POST" && matchedRoute) {
      return handleAi(env, routes[matchedRoute], request, headers);
    }

    if (pathname.startsWith("/api/")) {
      return json({ error: "Not Found", message: "Endpoint not found" }, 404, headers);
    }

    return env.ASSETS.fetch(request);
  },
};
