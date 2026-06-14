// Gestion des lobbys (salons de débat partagés) via Supabase.
import { supabase } from './supabaseClient.js'

// Code de salle court, sans caractères ambigus (pas de O/0/I/1).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function genCode(n = 5) {
  let s = ''
  for (let i = 0; i < n; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return s
}

// Crée un panel et renvoie sa ligne. Réessaie si le code est déjà pris.
export async function createPanel(cfg, ownerId) {
  const minutes = Number(cfg.minutes) || 5
  const maxPerCamp = cfg.maxPerCamp === 2 ? 2 : 1
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = genCode()
    const base = {
      code, topic: cfg.topic, camps: cfg.camps, minutes,
      visibility: cfg.visibility, comments_allowed: cfg.comments, owner_id: ownerId,
      floor: null, clock_running: false, remaining: [minutes * 60, minutes * 60],
    }
    let { data, error } = await supabase.from('panels')
      .insert({ ...base, seats: { '0': [], '1': [] }, max_per_camp: maxPerCamp }).select().single()
    // Si les colonnes sièges n'existent pas encore (migration non faite), on insère sans.
    if (error && /seats|max_per_camp/.test(error.message || '')) {
      ;({ data, error } = await supabase.from('panels').insert(base).select().single())
    }
    if (!error) return { panel: data }
    if (error.code !== '23505') return { error: error.message } // 23505 = code déjà utilisé
  }
  return { error: 'Impossible de générer un code unique, réessaie.' }
}

// Met à jour l'occupation des sièges (camp -> liste d'identifiants de débatteurs).
export async function setSeats(panelId, seats) {
  const { error } = await supabase.from('panels').update({ seats }).eq('id', panelId)
  return { error: error?.message }
}

export async function getPanelByCode(code) {
  const { data, error } = await supabase.from('panels').select('*')
    .eq('code', (code || '').trim().toUpperCase()).maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: 'Aucun débat trouvé avec ce code.' }
  return { panel: data }
}

export async function joinAsParticipant(panelId, pseudo, role = 'spectateur') {
  const { error } = await supabase.from('participants').insert({ panel_id: panelId, pseudo, role })
  return { error: error?.message }
}

// Met à jour l'état partagé du débat (parole, chrono, temps restant).
export async function pushPanelState(panelId, partial) {
  const { error } = await supabase.from('panels').update(partial).eq('id', panelId)
  return { error: error?.message }
}

export async function postMessage(panelId, msg) {
  let { error } = await supabase.from('messages').insert({ panel_id: panelId, ...msg })
  // Si la colonne author_id n'existe pas encore (migration non faite), on réessaie sans.
  if (error && /author_id/.test(error.message || '')) {
    const { author_id, ...rest } = msg
    ;({ error } = await supabase.from('messages').insert({ panel_id: panelId, ...rest }))
  }
  return { error: error?.message }
}

// Profils publics (identité visible par les autres).
export async function upsertProfile(p) {
  const { error } = await supabase.from('profiles').upsert({ ...p, updated_at: new Date().toISOString() })
  return { error: error?.message }
}
export async function getProfile(id) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
  if (error) return { error: error.message }
  return { profile: data }
}
export async function getProfiles(ids) {
  const list = [...new Set((ids || []).filter(Boolean))]
  if (!list.length) return { profiles: {} }
  const { data, error } = await supabase.from('profiles').select('*').in('id', list)
  if (error) return { error: error.message, profiles: {} }
  const map = {}; (data || []).forEach((p) => { map[p.id] = p })
  return { profiles: map }
}

// Liste les débats publics (pour L'Agora), les plus récents d'abord.
export async function listPublicPanels(limit = 24) {
  const { data, error } = await supabase.from('panels').select('*')
    .eq('visibility', 'public').order('created_at', { ascending: false }).limit(limit)
  if (error) return { error: error.message, panels: [] }
  return { panels: data || [] }
}

export async function loadMessages(panelId) {
  const { data, error } = await supabase.from('messages').select('*')
    .eq('panel_id', panelId).order('created_at', { ascending: true })
  if (error) return { error: error.message, messages: [] }
  return { messages: data || [] }
}
