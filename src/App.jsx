import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabaseClient.js'

// Etape 1 : ecran de diagnostic. Il sert uniquement a verifier que le projet
// Vite + React tourne et que la connexion a Supabase fonctionne. On
// remplacera cet ecran par ta maquette aux etapes suivantes.
export default function App() {
  // 'pending' | 'ok' | 'bad'
  const [reach, setReach] = useState('pending')
  const [schema, setSchema] = useState('pending')
  const [detail, setDetail] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) return

    async function check() {
      // 1) Le projet est-il joignable avec l'URL + la cle ?
      const { error: authError } = await supabase.auth.getSession()
      if (authError) {
        setReach('bad')
        setDetail(authError.message)
        return
      }
      setReach('ok')

      // 2) Le schema SQL (table "panels") existe-t-il deja ?
      const { error: tableError } = await supabase
        .from('panels')
        .select('id')
        .limit(1)

      if (tableError) {
        setSchema('bad')
        setDetail(tableError.message)
      } else {
        setSchema('ok')
      }
    }

    check()
  }, [])

  return (
    <div className="center-screen">
      <div className="card">
        <h1>LE CONTRECHAMP</h1>
        <div className="subtitle">Étape 1 — Diagnostic de connexion</div>

        <div className="status-line">
          <span className="dot ok" />
          React + Vite démarrent correctement
        </div>

        {!isSupabaseConfigured ? (
          <div className="status-line">
            <span className="dot bad" />
            Variables Supabase manquantes
          </div>
        ) : (
          <>
            <div className="status-line">
              <span className={`dot ${reach}`} />
              {reach === 'pending' && 'Connexion à Supabase…'}
              {reach === 'ok' && 'Projet Supabase joignable'}
              {reach === 'bad' && 'Échec de connexion à Supabase'}
            </div>
            <div className="status-line">
              <span className={`dot ${schema}`} />
              {schema === 'pending' && 'Vérification du schéma…'}
              {schema === 'ok' && 'Table « panels » détectée'}
              {schema === 'bad' && 'Table « panels » introuvable'}
            </div>
          </>
        )}

        {detail && (
          <div className="hint">
            Détail technique : <code>{detail}</code>
          </div>
        )}

        {!isSupabaseConfigured && (
          <div className="hint">
            Crée un fichier <code>.env</code> à la racine (copie de{' '}
            <code>.env.example</code>) avec <code>VITE_SUPABASE_URL</code> et{' '}
            <code>VITE_SUPABASE_ANON_KEY</code>, puis relance{' '}
            <code>npm run dev</code>.
          </div>
        )}
      </div>
    </div>
  )
}
