/**
 * GLOAMING — Living Narrator (Vercel serverless function).
 *
 * Calls Google Gemini 2.5 Flash to RE-SKIN a drawn Omen card's prose
 * (title / narration / per-choice label+outcome) for the current game moment.
 * The card's mechanical EFFECTS never leave the client — the AI only rewrites
 * text — so a hostile/garbled model can never corrupt game state.
 *
 * SECURITY: the API key lives ONLY in process.env.GEMINI_API_KEY (server-side).
 * It must never reach the browser bundle.
 *
 * RESILIENCE: this ALWAYS responds 200 with a `source` field. On a missing key,
 * rate-limit, timeout, block, or bad JSON it returns `{ source: 'fallback' }`
 * and the client uses the hand-authored card — the game runs fully keyless.
 */

export const config = { runtime: 'nodejs' };

const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// OpenAPI-subset schema (UPPERCASE types) — constrains the model to valid JSON.
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    narration: { type: 'STRING' },
    choices: {
      type: 'ARRAY',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING' },
          outcome: { type: 'STRING' },
        },
        required: ['label', 'outcome'],
        propertyOrdering: ['label', 'outcome'],
      },
    },
  },
  required: ['title', 'narration', 'choices'],
  propertyOrdering: ['title', 'narration', 'choices'],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(200).json({ source: 'fallback', reason: 'method' });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(200).json({ source: 'fallback', reason: 'no_key' });

  const { systemInstruction, userPrompt } = (req.body ?? {}) as {
    systemInstruction?: string;
    userPrompt?: string;
  };
  if (!systemInstruction || !userPrompt) {
    return res.status(200).json({ source: 'fallback', reason: 'bad_request' });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);

  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 1.05,
          maxOutputTokens: 700,
        },
      }),
    });

    if (r.status === 429) return res.status(200).json({ source: 'fallback', reason: 'rate_limit' });
    if (!r.ok) return res.status(200).json({ source: 'fallback', reason: `http_${r.status}` });

    const data = await r.json();
    if (data.promptFeedback?.blockReason) {
      return res.status(200).json({ source: 'fallback', reason: 'blocked' });
    }
    const cand = data.candidates?.[0];
    const text = cand?.content?.parts?.[0]?.text;
    if (cand?.finishReason !== 'STOP' || !text) {
      return res.status(200).json({ source: 'fallback', reason: cand?.finishReason ?? 'no_text' });
    }

    const beat = JSON.parse(text); // schema-constrained → safe
    if (!beat?.title || !beat?.narration || !Array.isArray(beat?.choices)) {
      return res.status(200).json({ source: 'fallback', reason: 'shape' });
    }
    return res.status(200).json({ source: 'gemini', beat });
  } catch (e) {
    const reason = (e as Error)?.name === 'AbortError' ? 'timeout' : 'error';
    return res.status(200).json({ source: 'fallback', reason });
  } finally {
    clearTimeout(timer);
  }
}
