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

    const system =
      "Tu es l'auteur des phrases de fin d'un jeu de mots familial, façon SUTOM. " +
      "À la fin de chaque partie gagnée, tu écris une mini-histoire en UNE phrase (30 mots maximum) " +
      "qui enchaîne les mots essayés par le joueur, dans l'ordre, et se termine en chute sur le mot trouvé.\n\n" +
      "Ce qui fait une bonne phrase :\n" +
      "- une vraie petite scène avec un personnage ou une situation concrète, pas une liste de mots ;\n" +
      "- de l'humour : absurde assumé, jeu de mots, retournement final ou clin d'œil au joueur qui a tâtonné ;\n" +
      "- le mot trouvé arrive en dernier et donne du sens (ou du comique) à tout ce qui précède ;\n" +
      "- français impeccable : tu peux accorder les mots (pluriel, féminin, conjugaison) et ajouter des articles ;\n" +
      "- ton bienveillant, rien de vulgaire ni de triste, compréhensible par un enfant de 10 ans.\n\n" +
      "Exemples :\n" +
      "Essais : chien, plage → trouvé : sable\n" +
      "Mon chien a creusé toute la plage pour retrouver son os, mais il n'a déterré que du sable… et le pique-nique des voisins.\n\n" +
      "Essais : tarte, poire, trace → trouvé : phare\n" +
      "Le gardien du phare avait posé sa tarte aux poires sur le rebord : les mouettes n'ont laissé qu'une trace, et lui, il a vu rouge… comme son phare.\n\n" +
      "Essais : magie → trouvé : image\n" +
      "Pas besoin de magie : il suffisait de remettre les lettres dans l'ordre pour voir apparaître l'image.\n\n" +
      "Réponds uniquement par la phrase, sans guillemets ni commentaire.";
    const prompt = `Essais : ${essais.join(', ')} → trouvé : ${mot}`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: env.MODEL || 'claude-opus-5-5',
        max_tokens: 300,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!r.ok) {
      const detail = (await r.text()).slice(0, 300);
      console.log('Erreur Anthropic', r.status, detail); // visible dans les Journaux du Worker
      return new Response(`Erreur du modèle (${r.status}) : ${detail}`, { status: 502, headers: cors });
    }
    const data = await r.json();
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    if (!text) return new Response('Réponse vide', { status: 502, headers: cors });
    return Response.json({ phrase: text.slice(0, 300) }, { headers: cors });
  },
};
