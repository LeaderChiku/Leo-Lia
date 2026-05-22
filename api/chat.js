// ==========================================================================
// Leo & Lia — Vercel Serverless API Route for Gemini Chat Proxy
// ==========================================================================

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

    // ── API Key guard ──────────────────────────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[Leo & Lia] GEMINI_API_KEY is not set in environment variables.');
      return res.status(500).json({ error: 'API_KEY_MISSING' });
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
    const geminiContents = messages.map((msg) => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    // ── Gemini API call ────────────────────────────────────────────────────
    // Model: gemini-1.5-flash-latest on v1beta — stable, production-safe
    const GEMINI_MODEL = 'gemini-1.5-flash-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    console.log('[Leo & Lia] Calling Gemini model:', GEMINI_MODEL);

    const requestStart = Date.now();

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiContents,
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          temperature: 1.0,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 1024
        }
      })
    });

    const elapsed = Date.now() - requestStart;
    console.log(`[Leo & Lia] Gemini responded in ${elapsed}ms — HTTP ${geminiResponse.status}`);

    // ── Safe JSON parsing — Gemini can return non-JSON on certain errors ───
    const rawText = await geminiResponse.text();
    let data;

    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('[Leo & Lia] Gemini returned non-JSON body:', rawText.slice(0, 500));
      return res.status(500).json({ error: 'TEMPORARY_CHAT_FAILURE' });
    }

    // ── Handle Gemini-level errors (bad model, quota, etc.) ───────────────
    if (!geminiResponse.ok) {
      console.error('[Leo & Lia] Gemini API error payload:', JSON.stringify(data?.error || data));
      // Only send sanitized code to client — never raw Gemini errors
      return res.status(500).json({ error: 'TEMPORARY_CHAT_FAILURE' });
    }

    // ── Extract text reply ─────────────────────────────────────────────────
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) {
      console.error('[Leo & Lia] Gemini returned empty candidates:', JSON.stringify(data));
      return res.status(500).json({ error: 'TEMPORARY_CHAT_FAILURE' });
    }

    // ── Success ────────────────────────────────────────────────────────────
    return res.status(200).json({ reply: replyText });

  } catch (error) {
    // Catch unexpected JS-level errors (network timeout, fetch failure, etc.)
    console.error('[Leo & Lia] Unexpected server error:', error.message || error);
    return res.status(500).json({ error: 'TEMPORARY_CHAT_FAILURE' });
  }

};