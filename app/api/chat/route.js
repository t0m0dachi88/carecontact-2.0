import { NextResponse } from "next/server";
const SYSTEM_PROMPT = require("../../../prompts/mediprep.js");

const HF_API_KEY = process.env.HF_API_KEY || "";

export async function POST(request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages array required" },
        { status: 400 }
      );
    }

    const result = await callHuggingFace(messages);

    if (!result.ok) {
      console.error("HF FAILED:", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ reply: wrapReport(result.reply) });

  } catch (err) {
    return NextResponse.json(
      { error: "Server error: " + err.message },
      { status: 500 }
    );
  }
}

// ✅ NEW HF CHAT API (OpenAI-style)
async function callHuggingFace(messages) {
  try {
    if (!HF_API_KEY) {
      return { ok: false, error: "Missing HuggingFace API key" };
    }

    const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/Meta-Llama-3-8B-Instruct", // ✅ reliable
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0.4,
        max_tokens: 1024,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("HF ERROR:", data);
      return { ok: false, error: data.error || "HF request failed" };
    }

    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      return { ok: false, error: "Empty response from HuggingFace" };
    }

    return { ok: true, reply };

  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Wrap report ─────────────────────────
function wrapReport(reply) {
  if (
    !reply.includes("===REPORT_START===") &&
    reply.includes("## Chief Complaint") &&
    reply.includes("## History of Present Illness")
  ) {
    return (
      "Thank you, I have all the information I need. Generating your report now.\n\n" +
      "===REPORT_START===\n" +
      reply +
      "\n===REPORT_END==="
    );
  }
  return reply;
}