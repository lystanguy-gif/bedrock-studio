import { createClient } from '@supabase/supabase-js'

// Les variables sont lues depuis le fichier .env (prefixe VITE_ obligatoire
// pour que Vite les expose au navigateur). La cle "anon" est publique par
// design cote client : la securite reelle se fera plus tard avec les regles
// de la base (RLS). Ne mets JAMAIS de cle secrete ici.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Vrai uniquement si les deux variables sont renseignees.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// On ne cree le client que si la config est presente, pour eviter une erreur
// au demarrage tant que tu n'as pas encore tes cles Supabase.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
