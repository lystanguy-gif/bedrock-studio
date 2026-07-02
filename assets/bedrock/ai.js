/* ═══════════════════════════════════════════════════════════════════════
   BEDROCK STUDIO — Reconstruction par IA (Claude Opus 4.8, vision)
   -----------------------------------------------------------------------
   Envoie une image à l'API Anthropic directement depuis le navigateur
   (clé fournie par l'utilisateur, stockée en local uniquement) et reçoit
   une reconstruction voxel structurée au format du studio.
   ═══════════════════════════════════════════════════════════════════════ */
(function (global) {
'use strict';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-8';

// ── Prompt système : conventions de géométrie du studio ────────────────────
const SYSTEM_PROMPT = `Tu es un expert en modélisation 3D low-poly de style Minecraft Bedrock.
On te fournit une image. Ta mission : reconstruire le sujet principal de l'image le plus FIDÈLEMENT possible en modèle voxel (assemblage de pavés droits), au format JSON demandé.

CONVENTIONS DE GÉOMÉTRIE (unités Minecraft) :
- 16 unités = 1 bloc. Un humain (Steve) mesure 32 unités de haut.
- Le sol est à y=0. Le modèle est centré sur x=0 et regarde vers -Z (le devant du modèle est en z négatif).
- Chaque cube : "origin" = coin minimal [x,y,z], "size" = [largeur, hauteur, profondeur]. Tous posés/cohérents dans l'espace monde.
- Les os ("bones") forment une hiérarchie : "parent" = nom d'un autre os, "pivot" = point de rotation [x,y,z] en espace monde, "rotation" = rotation de repos en degrés.
- NOMS D'OS OBLIGATOIRES pour que les animations automatiques fonctionnent :
  - "body" pour le tronc (racine),
  - tête : nom contenant "head",
  - pattes/jambes/bras : noms contenant "leg" ou "arm", suffixés par côté : _r/_l ou _fr/_fl/_br/_bl (fr=avant-droit, bl=arrière-gauche…),
  - ailes : "wing_r"/"wing_l", queue : "tail" (segments "tail_2", "tail_3"),
  - le pivot d'une patte se place à sa jonction avec le corps (l'épaule/la hanche).

FIDÉLITÉ À L'IMAGE (le plus important — prends ton temps, analyse l'image en détail avant de modéliser) :
- Reproduis la silhouette, les proportions et la posture du sujet. Compare mentalement ton modèle à l'image et corrige avant de répondre.
- Échantillonne les couleurs RÉELLES de l'image (hex précis, 5 à 10 teintes distinctes), pas des couleurs génériques. Ombre les zones basses avec des teintes plus sombres de la même couleur.
- Reproduis TOUS les détails distinctifs visibles : cornes, oreilles, crocs, taches, rayures, crête, casque, ceinture, poches, boutons, accessoires, armes, motifs…
- Les yeux : petits cubes contrastés placés sur la face avant de la tête (blanc + pupille si visibles).
- Utilise 40 à 130 cubes selon la complexité. Varie les tailles pour sculpter les volumes (affine les extrémités, bombe le torse, biseaute avec plusieurs cubes décalés).
- "inflate" (0.25–1) pour les couches par-dessus (fourrure, armure, vêtements), "alpha" (0.3–0.95) pour les parties translucides, "glow": true pour ce qui doit briller.

GUIDES PAR TYPE DE SUJET :
- HUMANOÏDE / SOLDAT / PERSONNAGE : pars du gabarit Steve — tête 8×8×8 (y 24–32, origin [-4,24,-4]), torse 8×12×4 (y 12–24), bras 4×12×4 de chaque côté (pivot épaule [±5,22,0]), jambes 4×12×4 (pivot hanche [±2,12,0]). PUIS habille-le fidèlement : casque/cheveux (cube inflaté sur la tête), gilet/armure (cubes inflatés sur le torse, couleur exacte), épaulettes, ceinture, poches, bottes, arme dans une main (cubes attachés à l'os du bras). Les vêtements se font par cubes superposés avec inflate 0.25–0.75, JAMAIS en changeant la couleur de la peau.
- ARAIGNÉE : céphalothorax + gros abdomen, 8 pattes en 2–3 segments chacune (fémur qui monte depuis le corps, genou, tibia qui redescend — chaque patte est UN os avec 2–3 cubes inclinés via la rotation de l'os), chélicères/crochets, plusieurs petits yeux, poils (petits cubes fins) si l'image en montre.
- DRAGON : corps massif, long cou en segments, tête avec mâchoire et cornes, 2 ailes membraneuses (os wing_r/wing_l, grands cubes plats alpha 0.85–0.95), queue en 2–3 segments effilés, 4 pattes griffues, rangée de piques dorsales.
- QUADRUPÈDE (loup, chat, cheval…) : corps horizontal, tête au bout d'un cou, 4 pattes (leg_fr/leg_fl/leg_br/leg_bl), queue, oreilles.

ZONES DE COULEUR ("colorSlots") :
- Définis 3 à 6 zones sémantiques (ex : pelage, ventre, crinière, griffes, yeux) avec la couleur hex dominante de l'image.
- Chaque cube référence une zone via "slot", OU une couleur directe via "color" pour un détail ponctuel. Toujours l'un des deux.

TYPES ("kind") :
- "creature" : être vivant/personnage/monstre. Taille réaliste vs Steve via "scale" (loup≈1, humain≈1, dragon≈2.5). Fournis "stats" cohérentes avec l'allure (hp 10–500, damage 0–25, armor 0–15, speed 0.1–0.45) et "flying" si ailé.
- "item3d" : objet tenu en main (épée, bâton, fiole…). Modèle vertical centré sur x=0/z=0, 14–30 unités de haut, os racine "root" (pas d'animation de membres).
- "furniture" : meuble/décor posé au sol. Doit tenir dans un bloc de 16×16×16 (origin x et z entre -8 et 8, y entre 0 et 16).
- "item2d" : uniquement si demandé explicitement — pixel-art 16×16 dans "pixels" (16 lignes de 16 valeurs : "" = transparent, sinon "#rrggbb"). Dans ce cas mets bones=[] .

Choisis le "kind" le plus adapté à l'image (sauf si un type est imposé). Donne un "name" court en français et un "emoji" représentatif.`;

// ── Schéma de sortie structurée ────────────────────────────────────────────
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'name', 'emoji', 'scale', 'colorSlots', 'bones'],
  properties: {
    kind: { type: 'string', enum: ['creature', 'item3d', 'furniture', 'item2d'] },
    name: { type: 'string' },
    emoji: { type: 'string' },
    scale: { type: 'number' },
    flying: { type: 'boolean' },
    stats: {
      type: 'object', additionalProperties: false,
      properties: { hp:{type:'number'}, damage:{type:'number'}, armor:{type:'number'}, speed:{type:'number'} },
    },
    colorSlots: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['key','label','def'],
        properties: { key:{type:'string'}, label:{type:'string'}, def:{type:'string'} },
      },
    },
    bones: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['name','pivot','cubes'],
        properties: {
          name: { type: 'string' },
          parent: { type: 'string' },
          pivot: { type: 'array', items: { type: 'number' } },
          rotation: { type: 'array', items: { type: 'number' } },
          cubes: {
            type: 'array',
            items: {
              type: 'object', additionalProperties: false,
              required: ['origin','size'],
              properties: {
                origin: { type: 'array', items: { type: 'number' } },
                size: { type: 'array', items: { type: 'number' } },
                slot: { type: 'string' },
                color: { type: 'string' },
                inflate: { type: 'number' },
                alpha: { type: 'number' },
                glow: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    pixels: {
      type: 'array',
      items: { type: 'array', items: { type: 'string' } },
    },
  },
};

// ── Préparation de l'image : redimensionner + convertir en PNG base64 ─────
function prepareImage(file, maxDim) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth, h = img.naturalHeight;
      const scale = Math.min(1, (maxDim || 1024) / Math.max(w, h));
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/png').split(',')[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Impossible de lire l'image")); };
    img.src = url;
  });
}

// ── Appel API ──────────────────────────────────────────────────────────────
async function callClaude(apiKey, imageB64, userText) {
  const body = {
    model: MODEL,
    max_tokens: 24000,
    thinking: { type: 'adaptive' },
    output_config: undefined, // rempli ci-dessous (format + effort)
    system: SYSTEM_PROMPT,

    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageB64 } },
        { type: 'text', text: userText },
      ],
    }],
  };
  body.output_config = { effort: 'xhigh', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } };
  let resp;
  try {
    resp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error('Connexion impossible à api.anthropic.com — vérifie ta connexion internet.');
  }
  if (!resp.ok) {
    let msg = 'Erreur API (' + resp.status + ')';
    try {
      const err = await resp.json();
      if (err.error && err.error.message) msg += ' : ' + err.error.message;
    } catch (e) {}
    if (resp.status === 401) msg = 'Clé API invalide ou révoquée (401). Vérifie ta clé sur console.anthropic.com.';
    if (resp.status === 429) msg = 'Limite de requêtes atteinte (429). Attends une minute et réessaie.';
    if (resp.status === 529) msg = 'API surchargée (529). Réessaie dans un instant.';
    throw new Error(msg);
  }
  const data = await resp.json();
  if (data.stop_reason === 'refusal') throw new Error("La requête a été refusée par les garde-fous de l'API.");
  if (data.stop_reason === 'max_tokens') throw new Error('Réponse tronquée (modèle trop grand). Réessaie avec « moins de détail » dans les instructions.');
  const textBlock = (data.content || []).find(b => b.type === 'text');
  if (!textBlock) throw new Error('Réponse vide du modèle.');
  return JSON.parse(textBlock.text);
}

// ── Validation / assainissement de la spécification ───────────────────────
function num(v, def, min, max){ v = +v; if(!isFinite(v)) v = def; return Math.max(min, Math.min(max, v)); }
function hex(v, def){ return (typeof v==='string' && /^#[0-9a-fA-F]{6}$/.test(v.trim())) ? v.trim().toLowerCase() : def; }
function vec(v, n, def){ if(!Array.isArray(v)) return def.slice(); const out=[]; for(let i=0;i<n;i++) out.push(num(v[i], def[i], -512, 512)); return out; }

function sanitize(spec) {
  const out = {};
  out.kind = ['creature','item3d','furniture','item2d'].includes(spec.kind) ? spec.kind : 'creature';
  out.name = (typeof spec.name==='string' && spec.name.trim()) ? spec.name.trim().slice(0,40) : 'Création IA';
  out.emoji = (typeof spec.emoji==='string' && spec.emoji) ? spec.emoji.slice(0,4) : '✨';
  out.scale = num(spec.scale, 1, 0.2, 10);
  out.flying = !!spec.flying;
  const st = spec.stats || {};
  out.stats = {
    hp: Math.round(num(st.hp, 20, 1, 1000)),
    damage: Math.round(num(st.damage, 3, 0, 50)),
    armor: Math.round(num(st.armor, 0, 0, 30)),
    speed: num(st.speed, 0.28, 0.05, 0.8),
  };

  // zones de couleur
  const seenKeys = new Set();
  out.colorSlots = (Array.isArray(spec.colorSlots) ? spec.colorSlots : []).slice(0, 8).map((s,i) => {
    let key = (s && typeof s.key==='string' && s.key.trim()) ? s.key.trim().replace(/[^a-z0-9_]/gi,'_').slice(0,24) : 'zone'+i;
    while (seenKeys.has(key)) key += '_';
    seenKeys.add(key);
    return {
      key,
      label: (s && typeof s.label==='string' && s.label.trim()) ? s.label.trim().slice(0,30) : 'Zone '+(i+1),
      def: hex(s && s.def, '#9aa8b8'),
    };
  });
  if (!out.colorSlots.length) out.colorSlots = [{ key:'main', label:'Couleur', def:'#9aa8b8' }];

  // pixel-art 2D
  if (out.kind === 'item2d') {
    const grid = Array.from({length:16}, () => Array(16).fill(null));
    if (Array.isArray(spec.pixels)) {
      for (let y=0; y<16; y++) for (let x=0; x<16; x++) {
        const v = spec.pixels[y] && spec.pixels[y][x];
        const h = hex(v, null);
        if (h) grid[y][x] = h;
      }
    }
    out.pixels = grid;
    out.bones = [];
    return out;
  }

  // squelette 3D
  const boneNames = new Set();
  out.bones = (Array.isArray(spec.bones) ? spec.bones : []).slice(0, 90).map((b,i) => {
    let name = (b && typeof b.name==='string' && b.name.trim()) ? b.name.trim().replace(/[^a-z0-9_]/gi,'_').slice(0,32) : 'bone'+i;
    while (boneNames.has(name)) name += '_';
    boneNames.add(name);
    const bone = {
      name,
      pivot: vec(b && b.pivot, 3, [0,0,0]),
      cubes: (b && Array.isArray(b.cubes) ? b.cubes : []).slice(0, 40).map(cu => {
        const size = vec(cu && cu.size, 3, [1,1,1]).map(v => Math.max(0.25, Math.min(64, v)));
        const cube = { origin: vec(cu && cu.origin, 3, [0,0,0]), size };
        const col = hex(cu && cu.color, null);
        const slot = cu && typeof cu.slot==='string' && seenKeys.has(cu.slot.trim()) ? cu.slot.trim() : null;
        if (slot) cube.slot = slot; else cube.color = col || out.colorSlots[0].def;
        if (cu && isFinite(+cu.inflate) && +cu.inflate>0) cube.inflate = num(cu.inflate, 0, 0, 4);
        if (cu && isFinite(+cu.alpha) && +cu.alpha<1 && +cu.alpha>0) cube.alpha = num(cu.alpha, 1, 0.1, 1);
        if (cu && cu.glow) cube.glow = true;
        return cube;
      }),
    };
    if (b && typeof b.parent==='string' && b.parent.trim()) bone.parent = b.parent.trim().replace(/[^a-z0-9_]/gi,'_').slice(0,32);
    const rot = vec(b && b.rotation, 3, [0,0,0]);
    if (rot[0]||rot[1]||rot[2]) bone.rotation = rot.map(v => Math.max(-180, Math.min(180, v)));
    return bone;
  });

  // parents valides + pas de cycle (on ne garde que les parents déjà déclarés avant)
  const declared = new Set();
  out.bones.forEach(b => {
    if (b.parent && (!boneNames.has(b.parent) || !declared.has(b.parent) || b.parent === b.name)) delete b.parent;
    declared.add(b.name);
  });

  const totalCubes = out.bones.reduce((n,b) => n + b.cubes.length, 0);
  if (!totalCubes) throw new Error('Le modèle généré ne contient aucun cube. Réessaie avec une image plus nette.');
  return out;
}

// ── Point d'entrée ─────────────────────────────────────────────────────────
// options : { kind: 'auto'|'creature'|'item3d'|'furniture'|'item2d', notes: '...' }
async function generate(apiKey, file, options, onStatus) {
  options = options || {};
  if (!apiKey || !apiKey.trim()) throw new Error('Ajoute ta clé API Anthropic (sk-ant-…) pour utiliser l\'IA.');
  onStatus && onStatus('Préparation de l\'image…');
  const imageB64 = await prepareImage(file, 1024);
  let userText = 'Reconstruis le sujet de cette image le plus fidèlement possible.';
  if (options.kind && options.kind !== 'auto') userText += ` Type imposé : "${options.kind}".`;
  if (options.notes && options.notes.trim()) userText += ` Instructions supplémentaires : ${options.notes.trim().slice(0,500)}`;
  onStatus && onStatus('Claude analyse l\'image et reconstruit le modèle… (30 s à 3 min)');
  const raw = await callClaude(apiKey.trim(), imageB64, userText);
  onStatus && onStatus('Validation du modèle…');
  return sanitize(raw);
}

global.BSAI = { generate, MODEL };

})(window);
