// Relais Cloudflare Worker : écrit la phrase de fin du SUTOM avec Claude.
// La clé ANTHROPIC_API_KEY est un secret du Worker, jamais dans le dépôt.
// Variables : ALLOWED_ORIGIN (ex. https://bvialade.github.io), MODEL (facultatif).

const WORD = /^[a-zàâäçéèêëîïôöùûüÿœæ-]{2,12}$/i;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN || 'https://bvialade.github.io';
    const cors = {
      'Access-Control-Allow-Origin': allowed,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      Vary: 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST' || origin !== allowed) return new Response('Interdit', { status: 403, headers: cors });

    let body;
    try { body = await request.json(); } catch { return new Response('JSON invalide', { status: 400, headers: cors }); }
    const { essais, mot } = body || {};
    if (!Array.isArray(essais) || essais.length < 1 || essais.length > 5 || ![...essais, mot].every((w) => typeof w === 'string' && WORD.test(w))) {
      return new Response('Mots invalides', { status: 400, headers: cors });
    }

    const prompt =
      `Mots essayés dans l'ordre : ${essais.join(', ')}. Mot trouvé à la fin : ${mot}.\n` +
      `Écris UNE seule phrase en français (25 mots maximum), drôle et grammaticalement correcte, ` +
      `qui raconte une petite histoire en utilisant chacun de ces mots tels quels, le mot trouvé en dernier. ` +
      `Ton bienveillant, adapté à toute la famille. Réponds uniquement par la phrase, sans guillemets.`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: env.MODEL || 'claude-opus-5-5',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!r.ok) return new Response('Erreur du modèle', { status: 502, headers: cors });
    const data = await r.json();
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    if (!text) return new Response('Réponse vide', { status: 502, headers: cors });
    return Response.json({ phrase: text.slice(0, 300) }, { headers: cors });
  },
};
