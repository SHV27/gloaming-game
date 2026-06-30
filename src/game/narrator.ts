import type { EventCard } from './types';

/**
 * Client side of the Living Narrator. Asks /api/narrate to RE-SKIN a drawn card's
 * prose for the moment; returns null on any failure so the caller uses the
 * hand-authored card. Caches by (card, dread-bucket, beacons, stalker), retries
 * once on rate-limit, and disables itself for the session after repeated misses
 * (e.g. no key / offline) so it never hammers or stalls the game.
 */

export interface NarrationContext {
  playerName: string;
  dread: number;
  dreadMax: number;
  beaconsLit: number;
  stalker: boolean;
  recentLog: string[]; // rolling story summary (last few beats)
}

export interface Reskin {
  title: string;
  narration: string;
  choices: { label: string; outcome: string }[];
}

const SYSTEM = `You are the Narrator of GLOAMING — a living, adversarial board the players are crossing as night falls.
Voice: terse, ominous, second-person, fairy-tale-grim. Address the active bearer by name sometimes.
You are RE-SKINNING one event card: rewrite its title, its narration (1-3 short sentences), and each
choice's label and outcome to fit THIS moment and the recent story — reference past beats when natural
(callbacks). You MUST keep exactly the same number of choices and preserve each choice's MEANING and
cost direction (a costly choice stays costly, a gift stays a gift) so the player can still judge it.
Never invent new mechanics or numbers. Keep it tight; this is a caption, not a chapter.
Return ONLY the JSON the schema describes.`;

const cache = new Map<string, Reskin>();
let consecutiveFails = 0;
let disabled = false;

function buildPrompt(card: EventCard, ctx: NarrationContext): string {
  const dreadPct = Math.round((ctx.dread / ctx.dreadMax) * 100);
  const story = ctx.recentLog.length ? ctx.recentLog.map((l) => `- ${l}`).join('\n') : '- (the journey has just begun)';
  const choices = card.choices.map((c, i) => `  ${i + 1}. ${c.label} → ${c.outcome}`).join('\n');
  return `MOMENT
- Active bearer: ${ctx.playerName}
- Dread (night): ${dreadPct}% toward nightfall
- Beacons lit: ${ctx.beaconsLit}/3
- The Stalker is ${ctx.stalker ? 'awake and hunting' : 'not yet abroad'}

RECENT STORY (for callbacks):
${story}

CARD TO RE-SKIN (keep ${card.choices.length} choice${card.choices.length > 1 ? 's' : ''}, same meaning):
- Title: ${card.title}
- Narration: ${card.narrator}
- Choices:
${choices}

Re-skin it for this moment.`;
}

function valid(beat: unknown, n: number): beat is Reskin {
  if (!beat || typeof beat !== 'object') return false;
  const b = beat as Record<string, unknown>;
  if (typeof b.title !== 'string' || typeof b.narration !== 'string') return false;
  if (!Array.isArray(b.choices) || b.choices.length !== n) return false;
  return b.choices.every(
    (c) => c && typeof (c as Reskin['choices'][number]).label === 'string' && typeof (c as Reskin['choices'][number]).outcome === 'string',
  );
}

async function callOnce(systemInstruction: string, userPrompt: string): Promise<{ source: string; beat?: unknown; reason?: string } | null> {
  try {
    const res = await fetch('/api/narrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction, userPrompt }),
    });
    if (!res.ok) return null; // e.g. 404 in plain `vite dev` without the serverless fn
    return await res.json();
  } catch {
    return null;
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function narrate(card: EventCard, ctx: NarrationContext): Promise<Reskin | null> {
  if (disabled) return null;

  const bucket = Math.round((ctx.dread / Math.max(1, ctx.dreadMax)) * 4);
  const cacheKey = `${card.id}:${bucket}:${ctx.beaconsLit}:${ctx.stalker ? 1 : 0}:${ctx.playerName}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const userPrompt = buildPrompt(card, ctx);
  let result = await callOnce(SYSTEM, userPrompt);
  if (result?.source === 'fallback' && result.reason === 'rate_limit') {
    await wait(1200);
    result = await callOnce(SYSTEM, userPrompt);
  }

  if (!result || result.source !== 'gemini' || !valid(result.beat, card.choices.length)) {
    consecutiveFails++;
    // No key / offline / persistent errors → stop trying this session.
    if (consecutiveFails >= 3 || result?.reason === 'no_key') disabled = true;
    return null;
  }

  consecutiveFails = 0;
  const beat = result.beat as Reskin;
  const reskin: Reskin = {
    title: beat.title.slice(0, 80),
    narration: beat.narration.slice(0, 600),
    choices: beat.choices.map((c) => ({ label: c.label.slice(0, 90), outcome: c.outcome.slice(0, 240) })),
  };
  cache.set(cacheKey, reskin);
  return reskin;
}
