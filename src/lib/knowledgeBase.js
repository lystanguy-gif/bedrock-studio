// Base documentaire locale (issue de Contrechamp Fédéral).
// Recherche de mots-clés dans la transcription, SANS IA ni clé API :
// quand un terme connu est prononcé, on retrouve la fiche correspondante
// (définition / résumé / réexplication / points-clés / dossier).

let cache = null

// minuscules, sans accents, ponctuation -> espaces, espaces compactés
export function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Charge la base une seule fois et pré-normalise les mots-clés de chaque fiche.
export async function loadKnowledgeBase() {
  if (cache) return cache
  const res = await fetch('/base-documentaire.json')
  if (!res.ok) throw new Error('base introuvable')
  const data = await res.json()
  const fiches = (data.fiches || []).map((f) => ({
    ...f,
    _kw: Array.from(new Set((f.motsCles || []).map(normalize).filter((k) => k.length >= 3))),
  }))
  cache = { fiches }
  return cache
}

// Cherche dans un texte les fiches dont au moins un mot-clé apparaît.
// Renvoie [{ fiche, matched }]. On borne l'analyse au texte récent.
export function scanForFiches(kb, text, limit = 12) {
  if (!kb) return []
  const padded = ' ' + normalize(text).slice(-4000) + ' '
  const found = []
  for (const f of kb.fiches) {
    const matched = f._kw.find((kw) => padded.includes(' ' + kw + ' '))
    if (matched) found.push({ fiche: f, matched })
    if (found.length >= limit) break
  }
  return found
}
