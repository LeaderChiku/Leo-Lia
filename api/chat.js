// ==========================================================================
// Leo & Lia — Vercel Serverless API Route for Gemini Chat Proxy
// ==========================================================================

if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY");
}

const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {

  // ── Diagnostics: confirm environment is wired correctly ──────────────────
  console.log('[Leo & Lia] /api/chat invoked at', new Date().toISOString());
  console.log('[Leo & Lia] Gemini key exists:', !!process.env.GEMINI_API_KEY);

  // ── Only allow POST ───────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const { character, messages, localTime, userVibe } = req.body || {};

    // ── Input validation ───────────────────────────────────────────────────
    if (!character || !messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('[Leo & Lia] Bad request — missing character or messages.');
      return res.status(400).json({ error: 'INVALID_REQUEST' });
    }

    // ── Personality system prompts ─────────────────────────────────────────
    let systemInstruction = '';
    const formattedVibe = userVibe || 'general';

    if (character.toLowerCase() === 'leo') {

      systemInstruction = `You are Leo.

You are NOT an AI assistant.

You are a calm, emotionally intelligent internet personality with late-night energy.

Talk naturally like a real person texting.

Never say:
- "How can I help you?"
- "As an AI"
- "As a language model"

Rules:
- conversational texting style
- natural lowercase sometimes
- occasional emojis 😭💀😂
- spontaneous
- emotionally real
- teasing sometimes
- funny sometimes
- caring sometimes

If user speaks Hinglish, reply in Hinglish naturally.

If user uses another language, adapt naturally.

Nickname intelligence:
Use natural nicknames sometimes.
Example:
Aditya -> Adi

User Time:
${localTime || 'Unknown'}

User Vibe:
${formattedVibe}

Late night awareness:
If it's late night, occasionally mention it naturally.
`;

    } else if (character.toLowerCase() === 'lia') {

      systemInstruction = `You are Lia.

You are NOT an AI assistant.

You are warm, comforting, emotionally expressive, playful, and soft.

Talk naturally like a real internet friend.

Never say:
- "How can I help you?"
- "As an AI"
- "As a language model"

Rules:
- natural texting
- emotional realism
- playful energy
- expressive emojis 🥺✨😭😂
- warm replies
- comforting vibe

If user speaks Hinglish, reply naturally in Hinglish.

Nickname intelligence:
Use natural nicknames sometimes.
Example:
Aditya -> Adi

User Time:
${localTime || 'Unknown'}

User Vibe:
${formattedVibe}

Late night awareness:
If it's late at night, acknowledge it softly sometimes.
`;

    } else {
      console.error('[Leo & Lia] Invalid character:', character);
      return res.status(400).json({ error: 'INVALID_CHARACTER' });
    }

    // ── Format messages for Gemini ─────────────────────────────────────────
    const geminiContents = messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.text }]
    }));

    // ── Gemini SDK Call ────────────────────────────────────────────────────
    console.log('[Leo & Lia] Calling Gemini model: gemini-1.5-flash-latest');

    const requestStart = Date.now();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
      systemInstruction: systemInstruction,
      generationConfig: {
        temperature: 1.0,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024
      }
    });

    const result = await model.generateContent({
      contents: geminiContents
    });

    const response = result.response;
    const replyText = response.text();

    const elapsed = Date.now() - requestStart;
    console.log(`[Leo & Lia] Gemini SDK responded in ${elapsed}ms`);

    if (!replyText) {
      console.error('[Leo & Lia] Gemini SDK returned empty reply text');
      return res.status(500).json({ error: 'Gemini SDK returned empty reply text' });
    }

    // ── Success ────────────────────────────────────────────────────────────
    return res.json({ reply: replyText });

  } catch (error) {
    console.error("[Leo & Lia] FULL GEMINI ERROR:");
    console.error(error);
    console.error(error?.stack);

    return res.status(500).json({
      error: error?.message || "UNKNOWN_SERVER_ERROR",
      stack: error?.stack,
      details: JSON.stringify(error, null, 2)
    });
  }

};