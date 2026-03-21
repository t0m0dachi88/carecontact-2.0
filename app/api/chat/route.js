import { NextResponse } from "next/server";
const SYSTEM_PROMPT = require("../../../prompts/mediprep.js");

const OLLAMA_URL        = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL             = process.env.MODEL      || "qwen2";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(request) {
  try {
    const { messages } = await request.json();
    if (!messages || !Array.isArray(messages))
      return NextResponse.json({ error: "messages array required" }, { status: 400 });

    let reply;

    // Only use Claude if key is set AND non-empty
    const useClaud = ANTHROPIC_API_KEY && ANTHROPIC_API_KEY.trim().length > 10;

    if (useClaud) {
      // ── Claude API ──────────────────────────────
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Claude API error:", data);
        // Fall back to Ollama if Claude fails
        return callOllama(messages, SYSTEM_PROMPT, OLLAMA_URL, MODEL);
      }
      reply = data.content?.[0]?.text || "I could not generate a response.";

    } else {
      // ── Ollama (default) ────────────────────────
      const result = await callOllama(messages, SYSTEM_PROMPT, OLLAMA_URL, MODEL);
      return result;
    }

    return NextResponse.json({ reply: wrapReport(reply) });

  } catch (err) {
    console.error("Chat API error:", err.message);
    return NextResponse.json({ error: "Server error: " + err.message }, { status: 500 });
  }
}

async function callOllama(messages, systemPrompt, ollamaUrl, model) {
  try {
    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: false,
        options: { temperature: 0.4, num_predict: 2048 },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Ollama error:", err);
      return NextResponse.json({
        error: `Ollama failed: ${err}. Make sure Ollama is running on ${ollamaUrl} and model '${model}' is installed. Run: ollama pull ${model}`,
      }, { status: 500 });
    }

    const data = await res.json();
    const reply = data.message?.content || "I could not generate a response.";
    return NextResponse.json({ reply: wrapReport(reply) });

  } catch (err) {
    return NextResponse.json({
      error: `Cannot connect to Ollama at ${ollamaUrl}. Make sure Ollama is running.`,
    }, { status: 500 });
  }
}

function wrapReport(reply) {
  if (
    !reply.includes("===REPORT_START===") &&
    reply.includes("## Chief Complaint") &&
    reply.includes("## History of Present Illness")
  ) {
    return "Thank you, I have all the information I need. Generating your report now.\n\n===REPORT_START===\n" + reply + "\n===REPORT_END===";
  }
  return reply;
}
