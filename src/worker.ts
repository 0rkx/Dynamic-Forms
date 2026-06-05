type JsonBody = Record<string, unknown> | unknown[] | string | number | boolean | null;
type AssetsBinding = { fetch(request: Request): Promise<Response> };

interface Env {
  ASSETS: AssetsBinding;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  ALLOWED_ORIGINS?: string;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
}

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

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

const AUTH_REQUIRED_KINDS = new Set([
  "generate-form",
  "generate-manifesto",
  "analyze-form",
  "analyze-form-responses",
  "analyze-manifesto-responses",
  "analyze-dual-context-conversation",
]);

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("Authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function authenticateUser(request: Request, env: Env): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const token = bearerToken(request);
  if (!token) {
    return { ok: false, status: 401, message: "Sign in required." };
  }

  const supabaseUrl = env.SUPABASE_URL?.replace(/\/$/, "");
  const supabaseKey = env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return { ok: false, status: 500, message: "Supabase auth is not configured on the API worker." };
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseKey,
    },
  });

  if (response.status === 401 || response.status === 403) {
    return { ok: false, status: 401, message: "Invalid or expired session. Please sign in again." };
  }

  if (!response.ok) {
    console.error("Supabase auth verification failed", { status: response.status });
    return { ok: false, status: 502, message: "Could not verify your session. Please try again." };
  }

  const user = await response.json().catch(() => null);
  if (!user?.id) {
    return { ok: false, status: 401, message: "Invalid session user." };
  }

  return { ok: true };
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
  if (normalized.type === "multiple_choice") normalized.type = "multiple-choice";
  if (Array.isArray(normalized.options)) {
    normalized.options = normalized.options.map((option: any) =>
      typeof option === "string" ? { label: option, value: option } : option
    );
  }
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
      system: `Return only valid JSON for a dynamic form. Shape: {"id":"form_id","title":"string","description":"string","manifesto":"string","manifestoData":{"productVision":"string","targetAudience":"string","businessGoals":["string"],"keyQuestionAreas":["string"],"conversationTone":"friendly|professional|casual|expert"},"questions":[{"id":"welcome","type":"welcome","label":"string","description":"string"},{"id":"q1","type":"text|textarea|multiple-choice|rating|email","label":"string","description":"string","placeholder":"string","required":true,"options":[{"label":"string","value":"string"}]}]}. Include 3-8 strategic questions. First question must be welcome.`,
      user: `User request: ${prompt}`,
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
      system: `Return only valid JSON for one follow-up question. Shape: {"id":"followup_id","type":"textarea","label":"string","placeholder":"string","required":false}.`,
      user: `Original question: ${JSON.stringify(body.originalQuestion)}\nUser answer: ${body.userAnswer}`,
    };
  }

  if (kind === "generate-intelligent-followup-enhanced") {
    return {
      system: `Return only valid JSON for one intelligent follow-up. Shape: {"id":"enhanced_followup_id","type":"textarea","label":"string","placeholder":"string","required":false}.`,
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
  if (AUTH_REQUIRED_KINDS.has(kind)) {
    const auth = await authenticateUser(request, env);
    if (!auth.ok) {
      return json({ error: "Unauthorized", message: auth.message }, auth.status, headers);
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (error) {
    if (error instanceof Response) {
      const errorBody = await error.text();
      return new Response(errorBody, {
        status: error.status,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      });
    }
    throw error;
  }

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
