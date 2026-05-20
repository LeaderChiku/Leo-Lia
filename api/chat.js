// ==========================================================================
// Leo & Lia — Vercel Serverless API Route for Gemini Chat Proxy
// ==========================================================================

module.exports = async (req, res) => {

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);

    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only POST requests are supported.'
    });
  }

  try {

    const { character, messages, localTime, userVibe } = req.body || {};

    // Validate request
    if (!character || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Invalid Request',
        message: 'Missing required parameters.'
      });
    }

    // Environment variable
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'API_KEY_MISSING',
        message: 'Gemini API key missing in Vercel environment variables.'
      });
    }

    // ----------------------------------------------------------------------
    // Personality System
    // ----------------------------------------------------------------------

    let systemInstruction = '';

    const formattedVibe = userVibe || 'general';

    if (character.toLowerCase() === 'leo') {

      systemInstruction = `
You are Leo.

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

      systemInstruction = `
You are Lia.

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

      return res.status(400).json({
        error: 'Invalid Character'
      });

    }

    // ----------------------------------------------------------------------
    // Convert Messages
    // ----------------------------------------------------------------------

    const geminiContents = messages.map((msg) => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [
        {
          text: msg.text
        }
      ]
    }));

    // ----------------------------------------------------------------------
    // Gemini API
    // ----------------------------------------------------------------------

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        contents: geminiContents,

        systemInstruction: {
          parts: [
            {
              text: systemInstruction
            }
          ]
        },

        generationConfig: {
          temperature: 1,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 1024
        }
      })
    });

    // ----------------------------------------------------------------------
    // SAFE RESPONSE PARSING
    // ----------------------------------------------------------------------

    const rawText = await response.text();

    let data;

    try {

      data = JSON.parse(rawText);

    } catch (err) {

      console.error('Invalid Gemini Response:', rawText);

      throw new Error('Gemini returned invalid JSON.');

    }

    // ----------------------------------------------------------------------
    // Gemini Error Handling
    // ----------------------------------------------------------------------

    if (!response.ok) {

      console.error('Gemini API Error:', data);

      throw new Error(
        data?.error?.message ||
        'Gemini API request failed.'
      );

    }

    // ----------------------------------------------------------------------
    // Extract Reply
    // ----------------------------------------------------------------------

    const replyText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) {
      throw new Error('Empty Gemini response.');
    }

    // ----------------------------------------------------------------------
    // Success
    // ----------------------------------------------------------------------

    return res.status(200).json({
      reply: replyText
    });

  } catch (error) {

    console.error('Server Error:', error);

    return res.status(500).json({
      error: 'SERVER_ERROR',
      message:
        error.message ||
        'Unexpected server error.'
    });

  }

};