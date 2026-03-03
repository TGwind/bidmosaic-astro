const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };

function pickText(result: any): string {
  if (!result) return '';
  const choice = result?.choices?.[0];
  const msg = choice?.message?.content;
  if (typeof msg === 'string') return msg;
  const text = choice?.text;
  if (typeof text === 'string') return text;
  if (typeof result?.output_text === 'string') return result.output_text;
  if (typeof result?.text === 'string') return result.text;
  return '';
}

export async function translateWithOpenclaw(options: {
  text: string;
  from: 'zh' | 'en' | 'auto';
  to: 'zh' | 'en';
  format: 'md' | 'html';
}): Promise<string> {
  const apiKey = import.meta.env.OPENCLAW_API_KEY;
  const endpoint = import.meta.env.OPENCLAW_API_URL || 'http://47.85.84.92/agents/website/chat/completions';
  const model = import.meta.env.OPENCLAW_MODEL || 'deepseek-chat';

  if (!apiKey) {
    throw new Error('Missing OPENCLAW_API_KEY on server');
  }

  const system = [
    'You are a professional translator for a marketing website blog.',
    'Translate accurately and fluently.',
    'Keep the original formatting.',
    'Do NOT translate URLs, code blocks, or inline code.',
    options.format === 'md' ? 'Output MUST be Markdown.' : 'Output MUST be HTML.',
    options.to === 'zh' ? 'Target language: Simplified Chinese.' : 'Target language: English.',
  ].join(' ');

  const payload = {
    model,
    stream: false,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: options.text },
    ],
  };

  const upstream = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000),
  });

  const raw = await upstream.text();
  if (!upstream.ok) {
    throw new Error(`Upstream translation failed (${upstream.status}): ${raw.slice(0, 400)}`);
  }

  let parsed: any = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Some upstreams might return plain text.
    return raw;
  }

  const out = pickText(parsed).trim();
  if (!out) throw new Error('Empty translation result');
  return out;
}

export { jsonHeaders };

