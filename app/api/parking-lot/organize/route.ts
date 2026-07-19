import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are helping turn a rambled, stream-of-consciousness voice note into a clean, organized parking lot list.

The speaker was thinking out loud — repeating themselves, trailing off, jumping between unrelated ideas. Your job is to split what they said into distinct, standalone entries: one per discrete thought, task, or idea. Each entry should be:
- A single, complete thought — not a fragment
- Cleaned of filler ("um", "like", "you know"), false starts, and repetition
- Written in the speaker's own words as closely as possible — don't invent, embellish, or add information that wasn't said
- Short: one sentence where possible

If the transcript only contains one thought, return a single entry. If it's genuinely empty or unintelligible, return an empty array.

Return ONLY a JSON array of strings, nothing else — no markdown fences, no commentary, no keys, just the array.`;

function extractJsonArray(text: string): string[] {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const parsed = JSON.parse(trimmed);
  if (!Array.isArray(parsed)) throw new Error('Model did not return an array');
  return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 20);
}

export async function POST(req: Request) {
  try {
    const { transcript } = await req.json();
    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return NextResponse.json({ error: 'transcript is required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set' }, { status: 500 });
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: transcript.trim() }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return NextResponse.json({ error: `Claude API ${res.status}: ${body}` }, { status: 502 });
    }

    const json = await res.json();
    const text = json.content?.[0]?.text;
    if (typeof text !== 'string') {
      return NextResponse.json({ error: 'Unexpected response shape from Claude' }, { status: 502 });
    }

    const entries = extractJsonArray(text);
    return NextResponse.json({ entries });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}
