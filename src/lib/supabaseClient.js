import { createClient } from '@supabase/supabase-js'

// Les variables sont lues depuis le fichier .env (prefixe VITE_ obligatoire
// pour que Vite les expose au navigateur). La cle "anon" est publique par
// design cote client : la securite reelle se fera plus tard avec les regles
// de la base (RLS). Ne mets JAMAIS de cle secrete ici.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Vrai uniquement si les deux variables sont renseignees.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Email(s) administrateur(s) du site, lus depuis une variable d'environnement
// (VITE_ADMIN_EMAILS, séparés par des virgules) pour ne pas figer l'email dans le code.
export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .toLowerCase().split(',').map((s) => s.trim()).filter(Boolean)
export function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
}

// On ne cree le client que si la config est presente, pour eviter une erreur
// au demarrage tant que tu n'as pas encore tes cles Supabase.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
