import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, Mic, MicOff, Search, Loader2, ExternalLink, AlertTriangle,
  HelpCircle, XCircle, CheckCircle2, Video, VideoOff, ImagePlus, X,
  MessageSquare, Lock, Globe, ArrowRight, RotateCcw, Send, Hand, Flag, BookOpen, ChevronDown,
  LogIn, LogOut, UserPlus, ArrowLeft, Loader2 as Spinner, Users, Copy, Settings as SettingsIcon, KeyRound, Check
} from "lucide-react";
import { loadKnowledgeBase, scanForFiches } from "./lib/knowledgeBase.js";
import { supabase, isSupabaseConfigured, isAdminEmail } from "./lib/supabaseClient.js";
import { createPanel, getPanelByCode, joinAsParticipant, pushPanelState, postMessage, loadMessages, listPublicPanels, upsertProfile, getProfile } from "./lib/lobby.js";

const C = {
  bg: "#08090b", panel: "#111318", panel2: "#171a21", line: "#30343d",
  text: "#eee8dd", mute: "#a9a59d", gold: "#b08a4a", pill: "#12151b",
  red: "#8d2b2b", blue: "#254f83", green: "#2e6a44", greyblue: "#536878",
  field: "#0c0e12",
};
const CAMP = [C.red, C.blue];
const MAX_ROOM = 15; // Capacité d'un débat (limite "maison", vidéo gratuite).
const STATUS = {
  correct:           { label: "Plausible",        color: C.green,     Icon: CheckCircle2 },
  a_nuancer:         { label: "À nuancer",         color: C.gold,      Icon: AlertTriangle },
  verifiable:        { label: "À vérifier",        color: C.greyblue,  Icon: HelpCircle },
  douteux:           { label: "Douteux",           color: "#9a6b3a",   Icon: AlertTriangle },
  probablement_faux: { label: "Probablement faux", color: C.red,       Icon: XCircle },
};
const BANNED = ["connard","conard","connasse","pute","salope","encule","enculé","enculer",
  "ntm","fdp","tg","ta gueule","pd","pédé","batard","bâtard","nègre","bougnoule","pétasse"];

const fmt = (s) => (s < 0 ? "-" : "") + String(Math.floor(Math.abs(s) / 60)).padStart(2, "0") + ":" + String(Math.abs(s) % 60).padStart(2, "0");
const other = (i) => (i === 0 ? 1 : 0);
const hhmm = (iso) => { try { return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
const hhmmDate = (iso) => { try { return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); } catch { return ""; } };
const mergeSegments = (list) => { const out = []; for (const s of list) { if (out.length && out[out.length - 1].side === s.side) out[out.length - 1].text = (out[out.length - 1].text + " " + s.text).trim(); else out.push({ side: s.side, text: s.text }); } return out; };
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Inter, Arial, system-ui, sans-serif";

const cardStyle = { background: C.panel, border: "1px solid " + C.line, borderRadius: 18 };
const fieldStyle = { background: C.field, border: "1px solid " + C.line, color: C.text, borderRadius: 14 };

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [view, setView] = useState("home"); // home | auth | create | join | live
  const [lobby, setLobby] = useState(null); // { panel, isHost, pseudo }

  useEffect(() => {
    if (!isSupabaseConfigured) { setAuthReady(true); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Synchronise le profil public (table profils) depuis le compte, à chaque changement.
  useEffect(() => {
    if (!session?.user) return;
    const u = session.user;
    upsertProfile({ id: u.id, pseudo: pseudoOf(session), avatar: u.user_metadata?.avatar || null, interests: u.user_metadata?.interests || [] }).catch(() => {});
  }, [session]);

  const goHome = () => { setLobby(null); setView("home"); };
  const enterLobby = (panel, isHost, pseudo) => { setLobby({ panel, isHost, pseudo }); setView("live"); };
  const openPanel = async (panel) => {
    const p = pseudoOf(session) || "Spectateur";
    await joinAsParticipant(panel.id, p, "spectateur");
    enterLobby(panel, !!(session && panel.owner_id === session.user.id), p);
  };

  return (
    <Shell>
      {view === "auth" ? (
        <AuthScreen onBack={() => setView("home")} onDone={() => setView("home")} />
      ) : view === "create" ? (
        <CreateFlow session={session} onHome={goHome} onLaunched={(panel) => enterLobby(panel, true, pseudoOf(session))} />
      ) : view === "join" ? (
        <JoinScreen session={session} onHome={goHome}
          onJoined={(panel, pseudo) => enterLobby(panel, !!(session && panel.owner_id === session.user.id), pseudo)} />
      ) : view === "live" && lobby ? (
        <Live lobby={lobby} session={session} onHome={goHome} />
      ) : view === "settings" && session ? (
        <Settings session={session} onHome={goHome} onLegal={() => setView("legal")} onTrophies={() => setView("trophies")} />
      ) : view === "trophies" && session ? (
        <TrophyGallery session={session} onHome={goHome} />
      ) : view === "agora" ? (
        <Agora onHome={goHome} onOpenPanel={openPanel} />
      ) : view === "legal" ? (
        <Legal onBack={() => setView("home")} />
      ) : (
        <Home
          session={session}
          authReady={authReady}
          onCreate={() => setView(session ? "create" : "auth")}
          onJoin={() => setView("join")}
          onSignIn={() => setView("auth")}
          onSettings={() => setView("settings")}
          onLegal={() => setView("legal")}
          onAgora={() => setView("agora")}
        />
      )}
    </Shell>
  );
}

// Création d'un lobby : configuration (Setup) puis enregistrement dans Supabase.
function CreateFlow({ session, onHome, onLaunched }) {
  const [cfg, setCfg] = useState({
    panel: "Le contrechamp", topic: "L'État doit-il encadrer les prix de l'énergie ?",
    camps: ["Pour", "Contre"], minutes: 5, visibility: "prive", comments: true,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function start() {
    if (!session) { setErr("Tu dois être connecté pour créer un débat."); return; }
    setBusy(true); setErr("");
    const { panel, error } = await createPanel(cfg, session.user.id);
    setBusy(false);
    if (error) { setErr(error); return; }
    onLaunched(panel);
  }
  return <Setup cfg={cfg} setCfg={setCfg} onStart={start} onHome={onHome} busy={busy} error={err} />;
}

// Pseudo affichable d'une session (métadonnée "pseudo" sinon début de l'email).
function pseudoOf(session) {
  if (!session?.user) return null;
  return session.user.user_metadata?.pseudo || (session.user.email || "").split("@")[0] || "Compte";
}

/* ----------------------------- ACCUEIL ----------------------------- */
function Home({ session, authReady, onCreate, onJoin, onSignIn, onSettings, onLegal, onAgora }) {
  const pseudo = pseudoOf(session);
  const admin = isAdminEmail(session?.user?.email);
  const avatar = session?.user?.user_metadata?.avatar;
  const accountRight = !authReady ? null : (session ? (
    <div className="flex items-center gap-2">
      {admin && <span className="inline-flex items-center gap-1 uppercase" style={{ borderRadius: 999, border: "1px solid " + C.gold, color: C.gold, fontSize: 10, letterSpacing: "0.08em", padding: "3px 9px", fontWeight: 700 }}><AdminSeal size={13} /> Admin</span>}
      <button onClick={onSettings} className="flex items-center gap-2" style={{ background: "none", border: "none", cursor: "pointer", color: C.mute, fontSize: 13 }} title="Mon compte">
        {avatar ? <span style={{ width: 26, height: 26, borderRadius: "50%", overflow: "hidden", border: "1px solid " + C.gold, display: "inline-block" }}><img src={"/avatars/" + avatar + ".svg"} alt="" style={{ width: "100%", height: "100%" }} /></span> : <SettingsIcon size={14} />}
        <span>Bonjour, <strong style={{ color: C.text }}>{pseudo}</strong></span>
      </button>
      <button onClick={() => supabase.auth.signOut()} className="pill inline-flex items-center gap-1.5" style={{ padding: "8px 12px", fontSize: 12 }}><LogOut size={13} /> Déconnexion</button>
    </div>
  ) : (
    <button onClick={onSignIn} className="pill inline-flex items-center gap-1.5" style={{ padding: "8px 14px", fontSize: 12 }}><LogIn size={13} /> Se connecter</button>
  ));
  return (
    <>
      <Header right={accountRight} />
      <div className="mx-auto" style={{ maxWidth: 1180, padding: "48px 18px 60px" }}>
        <Kicker>Régie de débat</Kicker>
        <h1 className="uppercase" style={{ fontFamily: SERIF, fontSize: "clamp(40px,8vw,76px)", lineHeight: 0.92, margin: "10px 0 14px", fontWeight: 700 }}>Le contrechamp</h1>
        <p style={{ color: C.mute, maxWidth: 720, lineHeight: 1.6, marginBottom: 36 }}>
          Deux camps, face à face. Le champ et le contrechamp. Pour regarder, c'est libre. Pour participer ou héberger, un compte suffit.
        </p>
        <div className="flex flex-wrap gap-3">
          <button onClick={onCreate} className="inline-flex items-center gap-2 uppercase" style={{ borderRadius: 999, background: C.gold, color: C.bg, border: "1px solid " + C.gold, padding: "13px 26px", fontWeight: 700, letterSpacing: "0.12em", fontSize: 13, cursor: "pointer" }}>
            Créer un débat <ArrowRight size={16} />
          </button>
          <button onClick={onJoin} className="pill inline-flex items-center gap-2 uppercase" style={{ borderRadius: 999, padding: "13px 26px", fontWeight: 700, letterSpacing: "0.12em", fontSize: 13 }}>
            Rejoindre un débat
          </button>
          <button onClick={onAgora} className="pill inline-flex items-center gap-2 uppercase" style={{ borderRadius: 999, padding: "13px 26px", fontWeight: 700, letterSpacing: "0.12em", fontSize: 13, color: C.gold }}>
            L'Agora <ArrowRight size={16} />
          </button>
        </div>
        {authReady && !session && <p style={{ color: "#6f6b63", fontSize: 12, marginTop: 16 }}>Créer un débat nécessite un compte (gratuit, rapide).</p>}
        {!isSupabaseConfigured && <p style={{ color: C.gold, fontSize: 12, marginTop: 16 }}>⚠️ Connexion à la base non configurée sur ce site (variables d'environnement manquantes).</p>}
        <p style={{ marginTop: 36 }}><button onClick={onLegal} style={{ background: "none", border: "none", color: "#6f6b63", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Mentions légales & conditions</button></p>
      </div>
      <Footer />
    </>
  );
}

/* ----------------------------- COMPTES ----------------------------- */
function traduireErreur(msg) {
  const m = (msg || "").toLowerCase();
  if (m.includes("invalid login")) return "Email ou mot de passe incorrect.";
  if (m.includes("email not confirmed")) return "Email pas encore confirmé. Vérifie ta boîte mail.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Un compte existe déjà avec cet email.";
  if (m.includes("password should be")) return "Mot de passe trop court (6 caractères minimum).";
  if (m.includes("is invalid")) return "Cette adresse email semble invalide.";
  return msg || "Une erreur est survenue.";
}

function AuthScreen({ onBack, onDone }) {
  const [mode, setMode] = useState("signup"); // signup | signin
  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function submit() {
    setError(""); setInfo("");
    if (!isSupabaseConfigured) { setError("La connexion n'est pas configurée sur ce site."); return; }
    if (!email.trim() || !password) { setError("Email et mot de passe requis."); return; }
    if (mode === "signup" && !pseudo.trim()) { setError("Choisis un pseudo."); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { pseudo: pseudo.trim() } } });
        if (error) setError(traduireErreur(error.message));
        else if (!data.session) { setInfo("Compte créé ! Vérifie ta boîte mail pour confirmer, puis connecte-toi."); setMode("signin"); }
        else onDone();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setError(traduireErreur(error.message));
        else onDone();
      }
    } finally { setBusy(false); }
  }

  const back = <button onClick={onBack} className="pill inline-flex items-center gap-1.5" style={{ padding: "8px 12px", fontSize: 12, color: C.mute }}><ArrowLeft size={13} /> Accueil</button>;
  return (
    <>
      <Header right={back} />
      <div className="mx-auto" style={{ maxWidth: 1180, padding: "48px 18px 60px" }}>
        <Kicker>Ton compte</Kicker>
        <h1 className="uppercase" style={{ fontFamily: SERIF, fontSize: "clamp(32px,6vw,56px)", lineHeight: 0.95, margin: "10px 0 24px", fontWeight: 700 }}>
          {mode === "signup" ? "Créer un compte" : "Se connecter"}
        </h1>

        <div style={{ ...cardStyle, padding: 24, maxWidth: 460 }}>
          <div className="flex gap-2" style={{ marginBottom: 20 }}>
            <Toggle on={mode === "signup"} onClick={() => { setMode("signup"); setError(""); }} icon={<UserPlus size={14} />} label="Créer un compte" />
            <Toggle on={mode === "signin"} onClick={() => { setMode("signin"); setError(""); }} icon={<LogIn size={14} />} label="Se connecter" />
          </div>

          {mode === "signup" && (<>
            <Label>Pseudo</Label>
            <input value={pseudo} onChange={(e) => setPseudo(e.target.value)} placeholder="Ton nom affiché" className="w-full" style={{ ...fieldStyle, padding: "10px 14px", marginBottom: 16 }} />
          </>)}
          <Label>Email</Label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="toi@email.fr" className="w-full" style={{ ...fieldStyle, padding: "10px 14px", marginBottom: 16 }} />
          <Label>Mot de passe</Label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="6 caractères minimum" onKeyDown={(e) => e.key === "Enter" && submit()} className="w-full" style={{ ...fieldStyle, padding: "10px 14px", marginBottom: 18 }} />

          {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          {info && <div style={{ color: C.green, fontSize: 13, marginBottom: 12 }}>{info}</div>}

          <button onClick={submit} disabled={busy} className="inline-flex items-center justify-center gap-2 uppercase w-full" style={{ borderRadius: 999, background: C.gold, color: C.bg, border: "1px solid " + C.gold, padding: "13px 26px", fontWeight: 700, letterSpacing: "0.1em", fontSize: 13, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
            {busy ? <Spinner size={15} className="spin" /> : (mode === "signup" ? <UserPlus size={15} /> : <LogIn size={15} />)}
            {mode === "signup" ? "Créer mon compte" : "Me connecter"}
          </button>
        </div>
        <p style={{ color: "#6f6b63", fontSize: 12, marginTop: 16 }}>Pour regarder un débat, aucun compte n'est nécessaire. Le compte sert à écrire, participer et héberger.</p>
      </div>
      <Footer />
    </>
  );
}

/* ----------------------------- REJOINDRE ----------------------------- */
function JoinScreen({ session, onHome, onJoined }) {
  const [code, setCode] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const sessionPseudo = pseudoOf(session);

  async function join() {
    setErr("");
    const c = code.trim();
    if (!c) { setErr("Entre un code de salle."); return; }
    const finalPseudo = sessionPseudo || pseudo.trim() || "Spectateur";
    setBusy(true);
    const { panel, error } = await getPanelByCode(c);
    if (error) { setBusy(false); setErr(error); return; }
    await joinAsParticipant(panel.id, finalPseudo, "spectateur");
    setBusy(false);
    onJoined(panel, finalPseudo);
  }

  const back = <button onClick={onHome} className="pill inline-flex items-center gap-1.5" style={{ padding: "8px 12px", fontSize: 12, color: C.mute }}><ArrowLeft size={13} /> Accueil</button>;
  return (
    <>
      <Header right={back} />
      <div className="mx-auto" style={{ maxWidth: 1180, padding: "48px 18px 60px" }}>
        <Kicker>Rejoindre</Kicker>
        <h1 className="uppercase" style={{ fontFamily: SERIF, fontSize: "clamp(32px,6vw,56px)", lineHeight: 0.95, margin: "10px 0 24px", fontWeight: 700 }}>Rejoindre un débat</h1>
        <div style={{ ...cardStyle, padding: 24, maxWidth: 460 }}>
          <Label>Code de salle</Label>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Ex. K7P2M" maxLength={8} onKeyDown={(e) => e.key === "Enter" && join()} className="w-full" style={{ ...fieldStyle, padding: "12px 14px", marginBottom: 18, fontFamily: SERIF, fontSize: 22, letterSpacing: "0.3em", textAlign: "center" }} />
          {!sessionPseudo && (<>
            <Label>Ton pseudo (pour regarder)</Label>
            <input value={pseudo} onChange={(e) => setPseudo(e.target.value)} placeholder="Spectateur" className="w-full" style={{ ...fieldStyle, padding: "10px 14px", marginBottom: 18 }} />
          </>)}
          {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <button onClick={join} disabled={busy} className="inline-flex items-center justify-center gap-2 uppercase w-full" style={{ borderRadius: 999, background: C.gold, color: C.bg, border: "1px solid " + C.gold, padding: "13px 26px", fontWeight: 700, letterSpacing: "0.1em", fontSize: 13, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
            {busy ? <Spinner size={15} className="spin" /> : <ArrowRight size={15} />} Rejoindre
          </button>
        </div>
        <p style={{ color: "#6f6b63", fontSize: 12, marginTop: 16 }}>Regarder est libre. Pour commenter, il faut un compte.</p>
      </div>
      <Footer />
    </>
  );
}

/* ----------------------------- MON COMPTE ----------------------------- */
function Settings({ session, onHome, onLegal, onTrophies }) {
  const meta = session.user.user_metadata || {};
  const [pseudo, setPseudo] = useState(meta.pseudo || pseudoOf(session));
  const [avatar, setAvatar] = useState(meta.avatar || null);
  const [avatars, setAvatars] = useState([]);
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [interests, setInterests] = useState(meta.interests || []);
  const [hashtags, setHashtags] = useState([]);
  const [hSearch, setHSearch] = useState("");
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => { fetch("/avatars.json").then((r) => r.json()).then(setAvatars).catch(() => {}); }, []);
  useEffect(() => { fetch("/hashtags.json").then((r) => r.json()).then(setHashtags).catch(() => {}); }, []);

  function toggleInterest(tag) {
    setInterests((cur) => cur.includes(tag) ? cur.filter((t) => t !== tag) : (cur.length >= 12 ? cur : [...cur, tag]));
  }
  async function saveInterests() {
    setErr(""); setMsg(""); setBusy(true);
    const { error } = await supabase.auth.updateUser({ data: { interests } });
    if (!error) await upsertProfile({ id: session.user.id, pseudo: meta.pseudo || pseudoOf(session), avatar: meta.avatar || null, interests });
    setBusy(false);
    if (error) setErr(traduireErreur(error.message)); else setMsg("Centres d'intérêt enregistrés.");
  }
  const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const filtered = hSearch ? hashtags.filter((h) => norm(h.libelle).includes(norm(hSearch))) : hashtags;

  const FIFTEEN = 15 * 24 * 3600 * 1000;
  const lastChange = meta.pseudo_changed_at ? new Date(meta.pseudo_changed_at) : null;
  const pseudoLocked = lastChange ? (Date.now() - lastChange.getTime() < FIFTEEN) : false;
  const nextChange = lastChange ? new Date(lastChange.getTime() + FIFTEEN) : null;

  async function chooseAvatar(id) {
    setErr(""); setMsg(""); setAvatar(id);
    const { error } = await supabase.auth.updateUser({ data: { avatar: id } });
    if (error) setErr(traduireErreur(error.message)); else setMsg("Avatar mis à jour.");
  }
  async function savePseudo() {
    setErr(""); setMsg("");
    const p = pseudo.trim();
    if (!p) { setErr("Le pseudo ne peut pas être vide."); return; }
    if (p === (meta.pseudo || "")) { setErr("C'est déjà ton pseudo actuel."); return; }
    if (pseudoLocked) { setErr("Tu pourras changer ton pseudo à partir du " + nextChange.toLocaleDateString("fr-FR") + "."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ data: { pseudo: p, pseudo_changed_at: new Date().toISOString() } });
    setBusy(false);
    if (error) setErr(traduireErreur(error.message)); else setMsg("Pseudo mis à jour.");
  }
  async function savePassword() {
    setErr(""); setMsg("");
    if (pwd.length < 6) { setErr("Mot de passe trop court (6 caractères minimum)."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) setErr(traduireErreur(error.message)); else { setMsg("Mot de passe mis à jour."); setPwd(""); }
  }

  const back = <button onClick={onHome} className="pill inline-flex items-center gap-1.5" style={{ padding: "8px 12px", fontSize: 12, color: C.mute }}><ArrowLeft size={13} /> Accueil</button>;
  return (
    <>
      <Header right={back} />
      <div className="mx-auto" style={{ maxWidth: 720, padding: "48px 18px 60px" }}>
        <Kicker>Mon compte</Kicker>
        <h1 className="uppercase" style={{ fontFamily: SERIF, fontSize: "clamp(32px,6vw,56px)", lineHeight: 0.95, margin: "10px 0 20px", fontWeight: 700 }}>Paramètres</h1>
        {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}
        {msg && <div style={{ color: C.green, fontSize: 13, marginBottom: 12 }}>{msg}</div>}

        <div style={{ ...cardStyle, padding: 22, marginBottom: 16 }}>
          <Label>Photo de profil</Label>
          <p style={{ color: "#6f6b63", fontSize: 12, marginBottom: 12 }}>Choisis un avatar parmi notre bibliothèque.</p>
          <div className="flex flex-wrap gap-2">
            {avatars.map((a) => (
              <button key={a.id} onClick={() => chooseAvatar(a.id)} title={a.nom} style={{ width: 56, height: 56, borderRadius: "50%", overflow: "hidden", border: "2px solid " + (avatar === a.id ? C.gold : C.line), padding: 0, cursor: "pointer", background: C.field }}>
                <img src={"/" + a.file} alt="" style={{ width: "100%", height: "100%" }} />
              </button>
            ))}
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 22, marginBottom: 16 }}>
          <Label>Pseudo</Label>
          <input value={pseudo} onChange={(e) => setPseudo(e.target.value)} className="w-full" style={{ ...fieldStyle, padding: "10px 14px", marginBottom: 10 }} />
          <p style={{ color: "#6f6b63", fontSize: 12, marginBottom: 12 }}>{pseudoLocked ? "Changement possible une fois tous les 15 jours. Prochain changement : " + nextChange.toLocaleDateString("fr-FR") + "." : "Modifiable une fois tous les 15 jours."}</p>
          <button onClick={savePseudo} disabled={busy || pseudoLocked} className="inline-flex items-center gap-2 uppercase" style={{ borderRadius: 999, background: C.gold, color: C.bg, border: "1px solid " + C.gold, padding: "10px 20px", fontWeight: 700, letterSpacing: "0.1em", fontSize: 12, cursor: (busy || pseudoLocked) ? "default" : "pointer", opacity: (busy || pseudoLocked) ? 0.6 : 1 }}><Check size={14} /> Enregistrer le pseudo</button>
        </div>

        <div style={{ ...cardStyle, padding: 22, marginBottom: 16 }}>
          <Label>Changer le mot de passe</Label>
          <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="new-password" placeholder="Nouveau mot de passe (6 caractères min.)" className="w-full" style={{ ...fieldStyle, padding: "10px 14px", marginBottom: 12 }} />
          <button onClick={savePassword} disabled={busy} className="inline-flex items-center gap-2 uppercase" style={{ borderRadius: 999, background: C.gold, color: C.bg, border: "1px solid " + C.gold, padding: "10px 20px", fontWeight: 700, letterSpacing: "0.1em", fontSize: 12, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}><KeyRound size={14} /> Mettre à jour le mot de passe</button>
        </div>

        <div style={{ ...cardStyle, padding: 22, marginBottom: 16 }}>
          <Label>Centres d'intérêt ({interests.length}/12)</Label>
          <p style={{ color: "#6f6b63", fontSize: 12, marginBottom: 10 }}>Choisis jusqu'à 12 sujets qui te représentent (ils s'affichent sur ton profil).</p>
          <input value={hSearch} onChange={(e) => setHSearch(e.target.value)} placeholder="Rechercher un sujet…" className="w-full" style={{ ...fieldStyle, padding: "9px 13px", marginBottom: 10, fontSize: 14 }} />
          <div className="flex flex-wrap gap-2" style={{ maxHeight: 180, overflowY: "auto" }}>
            {filtered.slice(0, 120).map((h) => { const on = interests.includes(h.tag); return (
              <button key={h.tag} onClick={() => toggleInterest(h.tag)} style={{ fontSize: 12, color: on ? C.bg : C.gold, background: on ? C.gold : C.pill, border: "1px solid " + (on ? C.gold : C.line), borderRadius: 999, padding: "5px 11px", cursor: "pointer", fontWeight: on ? 700 : 400 }}>#{h.libelle}</button>
            ); })}
          </div>
          <button onClick={saveInterests} disabled={busy} className="inline-flex items-center gap-2 uppercase" style={{ marginTop: 14, borderRadius: 999, background: C.gold, color: C.bg, border: "1px solid " + C.gold, padding: "10px 20px", fontWeight: 700, letterSpacing: "0.1em", fontSize: 12, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}><Check size={14} /> Enregistrer mes centres d'intérêt</button>
        </div>

        <button onClick={() => setShowProfile(true)} className="w-full inline-flex items-center justify-between" style={{ ...cardStyle, padding: 18, cursor: "pointer", marginBottom: 16 }}>
          <span className="uppercase" style={{ fontFamily: SERIF, fontSize: 14, letterSpacing: "0.06em", color: C.gold }}>Voir mon profil public</span>
          <ArrowRight size={16} color={C.gold} />
        </button>

        <button onClick={onTrophies} className="w-full inline-flex items-center justify-between" style={{ ...cardStyle, padding: 18, cursor: "pointer", marginBottom: 16 }}>
          <span className="uppercase" style={{ fontFamily: SERIF, fontSize: 14, letterSpacing: "0.06em", color: C.gold }}>Mes trophées</span>
          <ArrowRight size={16} color={C.gold} />
        </button>
        {showProfile && <ProfileModal id={session.user.id} onClose={() => setShowProfile(false)} />}
        <p style={{ marginTop: 6 }}><button onClick={onLegal} style={{ background: "none", border: "none", color: "#6f6b63", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Mentions légales & conditions</button></p>
      </div>
      <Footer />
    </>
  );
}

/* ----------------------------- MENTIONS LÉGALES ----------------------------- */
function Legal({ onBack }) {
  const back = <button onClick={onBack} className="pill inline-flex items-center gap-1.5" style={{ padding: "8px 12px", fontSize: 12, color: C.mute }}><ArrowLeft size={13} /> Retour</button>;
  const H = ({ children }) => <h2 className="uppercase" style={{ fontFamily: SERIF, fontSize: 15, letterSpacing: "0.06em", color: C.gold, marginTop: 26, marginBottom: 8 }}>{children}</h2>;
  const P = ({ children }) => <p style={{ color: C.text, fontSize: 14, lineHeight: 1.65, marginBottom: 8 }}>{children}</p>;
  return (
    <>
      <Header right={back} />
      <div className="mx-auto" style={{ maxWidth: 760, padding: "48px 18px 60px" }}>
        <Kicker>Le Contrechamp</Kicker>
        <h1 className="uppercase" style={{ fontFamily: SERIF, fontSize: "clamp(30px,5vw,48px)", lineHeight: 1, margin: "10px 0 6px", fontWeight: 700 }}>Mentions légales & conditions</h1>
        <p style={{ color: "#6f6b63", fontSize: 12, marginBottom: 8 }}>Document d'information, rédigé en langage clair. Il n'a pas valeur de conseil juridique.</p>

        <H>But du site</H>
        <P>Le Contrechamp est un espace de <strong>débat structuré</strong> où deux camps s'opposent avec un temps de parole, une transcription, des fiches de repère et un espace de commentaires. Son objectif est de <strong>favoriser l'échange argumenté</strong> et la confrontation honnête des idées, pas de désigner une vérité officielle.</P>

        <H>Sur quoi nous nous appuyons</H>
        <P>Les <strong>fiches documentaires</strong> et les repères affichés pendant un débat sont des <strong>aides à la compréhension</strong>. Ils s'appuient sur des notions et des faits largement établis, mais ils peuvent contenir des <strong>simplifications, des imprécisions ou des erreurs</strong>, et ne remplacent pas une recherche approfondie ni une source primaire.</P>

        <H>Ce à quoi nous ne nous engageons pas</H>
        <P>Nous ne garantissons ni l'<strong>exactitude</strong>, ni l'<strong>exhaustivité</strong>, ni la <strong>neutralité parfaite</strong> des contenus. Nous ne garantissons pas non plus la <strong>disponibilité continue</strong> du service. Les opinions exprimées par les participants n'engagent qu'eux, jamais l'éditeur du site.</P>

        <H>Comptes & contenus des utilisateurs</H>
        <P>Pour regarder un débat, aucun compte n'est nécessaire. Pour <strong>écrire, participer ou héberger</strong>, un compte est requis : c'est une condition d'<strong>identification et de responsabilité</strong>. Chacun est responsable de ce qu'il publie. Un <strong>filtre de mots</strong>, des outils de <strong>modération</strong> et le <strong>signalement</strong> visent à limiter les abus ; les contenus illégaux ou contraires aux règles peuvent être retirés et les comptes concernés suspendus.</P>

        <H>Données personnelles</H>
        <P>Nous collectons le strict nécessaire au fonctionnement : <strong>email, pseudo</strong> et les contenus que tu publies. Ces données servent à faire fonctionner les comptes et les débats. Tu peux modifier ton pseudo et ton mot de passe depuis tes paramètres. (Avant une ouverture large au public, une politique de confidentialité complète sera ajoutée.)</P>

        <H>Hébergement & technique</H>
        <P>Le site est hébergé via des prestataires tiers (déploiement et base de données). Le débat « en direct » repose sur une synchronisation entre les appareils des participants.</P>

        <H>Avertissement</H>
        <P>Ce texte est <strong>original</strong> et propre au Contrechamp : il n'est la copie d'aucune mention légale existante. Il est <strong>informatif</strong> et amené à évoluer. Avant une mise en ligne publique à grande échelle, il devra être complété par des mentions légales et des conditions d'utilisation conformes à la réglementation applicable (identité de l'éditeur, RGPD, etc.).</P>
      </div>
      <Footer />
    </>
  );
}

/* ----------------------------- TROPHÉES ----------------------------- */
function TrophyGallery({ session, onHome }) {
  const [all, setAll] = useState([]);
  const [sel, setSel] = useState(null);
  useEffect(() => { fetch("/trophees.json").then((r) => r.json()).then(setAll).catch(() => {}); }, []);
  const earned = session.user.user_metadata?.trophies || [];
  const earnedMap = Object.fromEntries(earned.map((e) => [e.id, e.at]));
  const earnedCount = all.filter((t) => earnedMap[t.id]).length;
  const firstE = earned.filter((e) => all.some((t) => t.id === e.id)).sort((a, b) => new Date(a.at) - new Date(b.at))[0];
  const firstT = firstE ? all.find((t) => t.id === firstE.id) : null;
  const back = <button onClick={onHome} className="pill inline-flex items-center gap-1.5" style={{ padding: "8px 12px", fontSize: 12, color: C.mute }}><ArrowLeft size={13} /> Accueil</button>;
  return (
    <>
      <Header right={back} />
      <div className="mx-auto" style={{ maxWidth: 1000, padding: "48px 18px 60px" }}>
        <Kicker>Ma collection</Kicker>
        <h1 className="uppercase" style={{ fontFamily: SERIF, fontSize: "clamp(30px,5vw,48px)", lineHeight: 1, margin: "10px 0 6px", fontWeight: 700 }}>Trophées</h1>
        <p style={{ color: C.mute, fontSize: 14, marginBottom: 4 }}><strong style={{ color: C.gold }}>{earnedCount}</strong> / {all.length} débloqués</p>
        {firstT && <p style={{ color: "#6f6b63", fontSize: 12, marginBottom: 8 }}>Premier trophée : « {firstT.nom} » le {hhmmDate(firstE.at)}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 14, marginTop: 18 }}>
          {all.map((t) => {
            const got = !!earnedMap[t.id];
            return (
              <button key={t.id} onClick={() => setSel({ t, got, at: earnedMap[t.id] })} className="text-center" style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}>
                <div style={{ height: 86 }}><TrophyBadge palier={t.palier} locked={!got} size={84} /></div>
                <div style={{ fontSize: 12, color: got ? C.text : "#4a5060", marginTop: 4 }}>{got ? t.nom : "???"}</div>
              </button>
            );
          })}
        </div>
      </div>
      {sel && (
        <div onClick={() => setSel(null)} className="fixed inset-0 flex items-center justify-center" style={{ background: "rgba(2,3,4,0.9)", zIndex: 50, padding: 24, cursor: "pointer" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, padding: 26, maxWidth: 380, textAlign: "center" }}>
            <div style={{ height: 118 }}><TrophyBadge palier={sel.t.palier} locked={!sel.got} size={110} /></div>
            {sel.got ? (<>
              <div className="uppercase" style={{ color: C.gold, fontSize: 11, letterSpacing: "0.12em", marginTop: 6 }}>{sel.t.categorie} · {sel.t.rarete}</div>
              <h3 style={{ fontFamily: SERIF, fontSize: 22, margin: "4px 0 8px" }}>{sel.t.nom}</h3>
              <p style={{ color: C.text, fontSize: 14, lineHeight: 1.5 }}>{sel.t.condition}</p>
              {sel.at && <p style={{ color: "#6f6b63", fontSize: 12, marginTop: 8 }}>Débloqué le {hhmmDate(sel.at)}</p>}
            </>) : (<>
              <h3 style={{ fontFamily: SERIF, fontSize: 22, margin: "10px 0 6px", color: C.mute }}>Trophée verrouillé</h3>
              <p style={{ color: "#6f6b63", fontSize: 13, lineHeight: 1.5 }}>Débloque-le en débattant pour révéler son nom et comment l'obtenir.</p>
            </>)}
            <button onClick={() => setSel(null)} className="pill" style={{ marginTop: 16, padding: "8px 18px", fontSize: 12 }}>Fermer</button>
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}

/* ----------------------------- L'AGORA ----------------------------- */
function Agora({ onHome, onOpenPanel }) {
  const [publics, setPublics] = useState(null);
  useEffect(() => { listPublicPanels().then(({ panels }) => setPublics(panels || [])); }, []);
  const back = <button onClick={onHome} className="pill inline-flex items-center gap-1.5" style={{ padding: "8px 12px", fontSize: 12, color: C.mute }}><ArrowLeft size={13} /> Accueil</button>;
  return (
    <>
      <Header right={back} />
      <div className="mx-auto" style={{ maxWidth: 1180, padding: "48px 18px 60px" }}>
        <Kicker>L'Agora</Kicker>
        <h1 className="uppercase" style={{ fontFamily: SERIF, fontSize: "clamp(32px,6vw,56px)", lineHeight: 0.95, margin: "10px 0 10px", fontWeight: 700 }}>Débats publics</h1>
        <p style={{ color: C.mute, fontSize: 14, marginBottom: 8 }}>Choisis un débat en cours et rejoins-le. <span style={{ color: "#6f6b63" }}>(Filtres par sujet et par pays, et cartes détaillées à venir.)</span></p>
        {publics === null ? (
          <p style={{ color: "#6f6b63", fontSize: 13, marginTop: 16 }}>Chargement…</p>
        ) : publics.length === 0 ? (
          <p style={{ color: "#6f6b63", fontSize: 13, marginTop: 16 }}>Aucun débat public en ce moment. Crée le premier en choisissant « Public » à l'ouverture du débat.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" style={{ marginTop: 16 }}>
            {publics.map((p) => {
              const camps = (p.camps && p.camps.length >= 2) ? p.camps : ["Pour", "Contre"];
              return (
                <button key={p.id} onClick={() => onOpenPanel(p)} className="text-left" style={{ ...cardStyle, padding: 16, cursor: "pointer", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 16, lineHeight: 1.25 }}>{p.topic || "Débat"}</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2" style={{ fontSize: 13 }}>
                      <span style={{ color: CAMP[0] }}>●</span> {camps[0]}
                      <span style={{ color: C.mute }}>vs</span>
                      <span style={{ color: CAMP[1] }}>●</span> {camps[1]}
                    </div>
                    <span className="inline-flex items-center gap-1 uppercase" style={{ color: C.gold, fontSize: 11, letterSpacing: "0.08em" }}>Rejoindre <ArrowRight size={13} /></span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

/* ----------------------------- FICHE PROFIL ----------------------------- */
function ProfileModal({ id, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hashtags, setHashtags] = useState([]);
  useEffect(() => { getProfile(id).then(({ profile }) => { setProfile(profile); setLoading(false); }); }, [id]);
  useEffect(() => { fetch("/hashtags.json").then((r) => r.json()).then(setHashtags).catch(() => {}); }, []);
  const labelOf = (tag) => hashtags.find((h) => h.tag === tag)?.libelle || tag;
  return (
    <div onClick={onClose} className="fixed inset-0 flex items-center justify-center" style={{ background: "rgba(2,3,4,0.9)", zIndex: 60, padding: 24, cursor: "pointer" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, padding: 26, maxWidth: 420, width: "100%" }}>
        {loading ? <p style={{ color: C.mute }}>Chargement…</p> : !profile ? (
          <p style={{ color: C.mute, fontSize: 14 }}>Profil indisponible (ce membre n'a pas encore de profil public).</p>
        ) : (<>
          <div className="flex items-center gap-3">
            <span style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", border: "2px solid " + C.gold, display: "inline-block", flexShrink: 0 }}>
              {profile.avatar ? <img src={"/avatars/" + profile.avatar + ".svg"} alt="" style={{ width: "100%", height: "100%" }} /> : <span style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", color: C.mute }}>—</span>}
            </span>
            <div>
              <div style={{ fontFamily: SERIF, fontSize: 22 }}>{profile.pseudo || "Anonyme"}</div>
              <div style={{ color: "#6f6b63", fontSize: 12 }}>Membre depuis {hhmmDate(profile.created_at)}</div>
            </div>
          </div>
          {Array.isArray(profile.interests) && profile.interests.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Label>Centres d'intérêt</Label>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((t) => <span key={t} style={{ fontSize: 12, color: C.gold, background: C.pill, border: "1px solid " + C.line, borderRadius: 999, padding: "4px 10px" }}>#{labelOf(t)}</span>)}
              </div>
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <Label>Trophées</Label>
            <p style={{ color: "#6f6b63", fontSize: 12 }}>Les trophées apparaîtront ici dès que le vote de fin de débat sera en place.</p>
          </div>
        </>)}
        <button onClick={onClose} className="pill w-full" style={{ marginTop: 18, padding: "9px 18px", fontSize: 12 }}>Fermer</button>
      </div>
    </div>
  );
}

/* ----------------------------- SETUP ----------------------------- */
function Setup({ cfg, setCfg, onStart, onHome, busy, error }) {
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));
  return (
    <>
      <Header right={onHome ? <button onClick={onHome} className="pill inline-flex items-center gap-1.5" style={{ padding: "8px 12px", fontSize: 12, color: C.mute }}><ArrowLeft size={13} /> Accueil</button> : null} />
      <div className="mx-auto" style={{ maxWidth: 1180, padding: "48px 18px 60px" }}>
        <Kicker>Régie de débat</Kicker>
        <h1 className="uppercase" style={{ fontFamily: SERIF, fontSize: "clamp(40px,8vw,76px)", lineHeight: 0.92, margin: "10px 0 14px", fontWeight: 700 }}>
          Ouvrir un panel
        </h1>
        <p style={{ color: C.mute, maxWidth: 720, lineHeight: 1.6, marginBottom: 36 }}>
          Deux camps, face à face. Le champ et le contrechamp. La vérification au centre, comme l'arbitre du débat.
        </p>

        <div style={{ ...cardStyle, padding: 24, maxWidth: 720 }}>
          <Label>Nom du panel</Label>
          <input value={cfg.panel} onChange={(e) => set("panel", e.target.value)} className="w-full" style={{ ...fieldStyle, padding: "10px 14px", marginBottom: 18 }} />
          <Label>Sujet du débat</Label>
          <input value={cfg.topic} onChange={(e) => set("topic", e.target.value)} className="w-full" style={{ ...fieldStyle, padding: "10px 14px", marginBottom: 18 }} />
          <div className="flex gap-4" style={{ marginBottom: 18 }}>
            {[0, 1].map((i) => (
              <div key={i} className="flex-1">
                <Label><span style={{ color: CAMP[i] }}>●</span> Camp {i + 1}</Label>
                <input value={cfg.camps[i]} onChange={(e) => set("camps", cfg.camps.map((x, k) => k === i ? e.target.value : x))} className="w-full" style={{ ...fieldStyle, padding: "10px 14px" }} />
              </div>
            ))}
          </div>
          <Label>Temps de parole par camp (minutes)</Label>
          <input type="number" min={1} max={60} value={cfg.minutes} onChange={(e) => set("minutes", Math.max(1, Math.min(60, Number(e.target.value) || 1)))} style={{ ...fieldStyle, padding: "10px 14px", width: 120, marginBottom: 22 }} />

          <Label>Visibilité</Label>
          <div className="flex gap-3" style={{ marginBottom: 16 }}>
            <Toggle on={cfg.visibility === "prive"} onClick={() => set("visibility", "prive")} icon={<Lock size={14} />} label="Privé — sur invitation" />
            <Toggle on={cfg.visibility === "public"} onClick={() => set("visibility", "public")} icon={<Globe size={14} />} label="Public — libre d'accès" />
          </div>
          <Toggle on={cfg.comments} onClick={() => set("comments", !cfg.comments)} icon={<MessageSquare size={14} />} label={cfg.comments ? "Commentaires des spectateurs autorisés" : "Commentaires bloqués"} wide />
        </div>

        {error && <div style={{ color: C.red, fontSize: 13, marginTop: 18 }}>{error}</div>}
        <button onClick={onStart} disabled={busy} className="inline-flex items-center gap-2 uppercase" style={{ marginTop: 18, borderRadius: 999, background: C.gold, color: C.bg, border: "1px solid " + C.gold, padding: "13px 26px", fontWeight: 700, letterSpacing: "0.12em", fontSize: 13, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
          {busy ? <><Spinner size={16} className="spin" /> Création…</> : <>Ouvrir le débat <ArrowRight size={16} /></>}
        </button>
        <p style={{ color: "#6f6b63", fontSize: 12, marginTop: 16 }}>
          Un code de salle unique sera généré : partage-le pour que d'autres rejoignent ton débat.
        </p>
      </div>
      <Footer />
    </>
  );
}

/* ----------------------------- LIVE ----------------------------- */
function Live({ lobby, session, onHome }) {
  const { panel, isHost, pseudo } = lobby;
  const cfg = {
    panel: "Le contrechamp",
    topic: panel.topic,
    camps: (panel.camps && panel.camps.length >= 2) ? panel.camps : ["Pour", "Contre"],
    minutes: panel.minutes || 5,
    visibility: panel.visibility || "prive",
    comments: panel.comments_allowed !== false,
  };
  const [floor, setFloor] = useState(panel.floor ?? null);
  const [clockRunning, setClockRunning] = useState(!!panel.clock_running);
  const [pending, setPending] = useState(null);
  const [request, setRequest] = useState(null);
  const [remaining, setRemaining] = useState(panel.remaining && panel.remaining.length === 2 ? panel.remaining : [cfg.minutes * 60, cfg.minutes * 60]);
  const [spectators, setSpectators] = useState(1);
  const [roomRank, setRoomRank] = useState(1);
  const [copied, setCopied] = useState(false);
  const [viewedProfile, setViewedProfile] = useState(null);
  const [micOn, setMicOn] = useState(false);
  const [segments, setSegments] = useState([]);
  const [interim, setInterim] = useState("");
  const [micError, setMicError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [manual, setManual] = useState("");
  const [images, setImages] = useState([[], []]);
  const [camOwner, setCamOwner] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [comments, setComments] = useState([]);
  const [draft, setDraft] = useState("");
  const [cError, setCError] = useState("");
  const [kbHits, setKbHits] = useState([]);
  const [kbReady, setKbReady] = useState(false);
  const [kbOpen, setKbOpen] = useState({});

  const kbRef = useRef(null), kbSeenRef = useRef(new Set());

  const recRef = useRef(null), wantRef = useRef(false), busyRef = useRef(false);
  const lastLenRef = useRef(0), floorRef = useRef(null), joinedRef = useRef("");
  const camStreamRef = useRef(null), vidRefs = [useRef(null), useRef(null)];
  const remainingRef = useRef(remaining), seenMsgRef = useRef(new Set());
  const presenceKeyRef = useRef("p" + Math.random().toString(36).slice(2));

  useEffect(() => { floorRef.current = floor; }, [floor]);
  useEffect(() => { remainingRef.current = remaining; }, [remaining]);

  // ---- Synchro temps réel du lobby ----
  // Hôte : pousse l'état partagé (parole + chrono) à chaque changement.
  useEffect(() => {
    if (!isHost) return;
    pushPanelState(panel.id, { floor, clock_running: clockRunning, remaining });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor, clockRunning]);
  // Hôte : pousse régulièrement l'état complet pendant que le chrono tourne
  // (auto-resynchronisation : un spectateur qui vient de rejoindre se cale en ~2 s).
  useEffect(() => {
    if (!isHost || !clockRunning) return;
    const id = setInterval(() => pushPanelState(panel.id, { floor: floorRef.current, clock_running: true, remaining: remainingRef.current }), 2000);
    return () => clearInterval(id);
  }, [isHost, clockRunning, panel.id]);

  // Tout le monde : écoute les changements du panel + l'arrivée des messages.
  useEffect(() => {
    let segInit = [], comInit = [];
    loadMessages(panel.id).then(({ messages }) => {
      messages.forEach((m) => {
        seenMsgRef.current.add(m.id);
        if (m.kind === "transcript") segInit.push({ side: m.side ?? 0, text: m.content });
        else if (m.kind === "comment") comInit.unshift({ id: m.id, txt: m.content, author: m.author, author_id: m.author_id, t: hhmm(m.created_at) });
      });
      if (!isHost && segInit.length) setSegments(mergeSegments(segInit));
      if (comInit.length) setComments(comInit);
    });

    const ch = supabase.channel("panel-" + panel.id)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "panels", filter: "id=eq." + panel.id }, ({ new: row }) => {
        if (isHost) return; // l'hôte fait autorité, il n'applique pas ses propres échos
        setFloor(row.floor ?? null);
        setClockRunning(!!row.clock_running);
        if (Array.isArray(row.remaining) && row.remaining.length === 2) setRemaining(row.remaining);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "panel_id=eq." + panel.id }, ({ new: m }) => {
        if (seenMsgRef.current.has(m.id)) return;
        seenMsgRef.current.add(m.id);
        if (m.kind === "transcript") { if (!isHost) appendSegment(m.side ?? 0, m.content); }
        else if (m.kind === "comment") setComments((c) => [{ id: m.id, txt: m.content, author: m.author, author_id: m.author_id, t: hhmm(m.created_at) }, ...c]);
      })
      .subscribe();

    const pres = supabase.channel("presence-" + panel.id, { config: { presence: { key: presenceKeyRef.current } } })
      .on("presence", { event: "sync" }, () => {
        const state = pres.presenceState();
        const keys = Object.keys(state);
        setSpectators(keys.length || 1);
        // Rang d'arrivée du client courant (pour ne bloquer que les places au-delà de la limite).
        const order = keys.map((k) => ({ k, at: (state[k][0] && state[k][0].at) || 0 })).sort((a, b) => a.at - b.at);
        const rank = order.findIndex((x) => x.k === presenceKeyRef.current) + 1;
        setRoomRank(rank || keys.length);
      })
      .subscribe((status) => { if (status === "SUBSCRIBED") pres.track({ pseudo, at: Date.now() }); });

    // Spectateur : rattrapage de l'état 3,5 s après l'abonnement (au cas où un
    // changement aurait eu lieu pendant le démarrage de l'écoute temps réel).
    const resync = setTimeout(() => {
      if (isHost) return;
      supabase.from("panels").select("floor,clock_running,remaining").eq("id", panel.id).maybeSingle().then(({ data }) => {
        if (!data) return;
        setFloor(data.floor ?? null);
        setClockRunning(!!data.clock_running);
        if (Array.isArray(data.remaining) && data.remaining.length === 2) setRemaining(data.remaining);
      });
    }, 3500);

    return () => { clearTimeout(resync); supabase.removeChannel(ch); supabase.removeChannel(pres); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel.id]);
  useEffect(() => { busyRef.current = analyzing; }, [analyzing]);
  useEffect(() => { joinedRef.current = segments.map((s) => s.text).join(" "); }, [segments]);

  // Base documentaire locale : chargée une fois.
  useEffect(() => { loadKnowledgeBase().then((kb) => { kbRef.current = kb; setKbReady(true); }).catch(() => {}); }, []);
  // À chaque évolution de la transcription, on repère les fiches dont un mot-clé
  // est prononcé, et on ajoute les nouvelles en haut de la liste.
  useEffect(() => {
    if (!kbRef.current) return;
    const found = scanForFiches(kbRef.current, joinedRef.current);
    const fresh = found.filter(({ fiche }) => !kbSeenRef.current.has(fiche.id));
    if (!fresh.length) return;
    const side = floorRef.current ?? 0;
    const stamp = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    fresh.forEach(({ fiche }) => kbSeenRef.current.add(fiche.id));
    setKbHits((p) => [...fresh.map(({ fiche, matched }) => ({ fiche, matched, side, stamp })), ...p].slice(0, 40));
  }, [segments, kbReady]);

  useEffect(() => {
    if (!clockRunning || floor === null) return;
    const id = setInterval(() => setRemaining((r) => { const n = [...r]; n[floorRef.current] -= 1; return n; }), 1000);
    return () => clearInterval(id);
  }, [clockRunning, floor]);

  const launch = () => { setFloor(0); setClockRunning(true); setPending(null); setRequest(null); };
  const cede = () => { stopMic(); setClockRunning(false); setPending(other(floor)); setRequest(null); };
  const accept = () => { stopMic(); setFloor(pending); setPending(null); setRequest(null); setClockRunning(true); };
  const askFloor = (i) => setRequest(i);
  const reset = () => { stopMic(); setFloor(null); setClockRunning(false); setPending(null); setRequest(null); setRemaining([cfg.minutes * 60, cfg.minutes * 60]); kbSeenRef.current = new Set(); setKbHits([]); };

  const analyze = useCallback(async (raw, withWeb = true) => {
    const chunk = (raw || "").trim().slice(-2000);
    if (chunk.length < 10 || busyRef.current) return;
    setAnalyzing(true); lastLenRef.current = joinedRef.current.length;
    const side = floorRef.current ?? 0;
    const prompt =
`Assistant de fact-checking d'un débat oral. Extrait récent (français) :
"""${chunk}"""
Repère jusqu'à 3 affirmations factuelles, chiffres, citations ou raisonnements à vérifier ou nuancer. Ignore les pures opinions.${withWeb ? " Utilise la recherche web pour vérifier et citer des sources." : ""}
Réponds UNIQUEMENT par un tableau JSON, sans texte ni backticks :
[{"claim":"reformulation courte","statut":"correct|a_nuancer|verifiable|douteux|probablement_faux","note":"une phrase max 200 car.","sources":[{"titre":"source","url":"https://..."}]}]
Rien à vérifier -> []. sources peut être vide.`;
    try {
      const body = { model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] };
      if (withWeb) body.tools = [{ type: "web_search_20250305", name: "web_search" }];
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("http");
      const data = await res.json();
      const text = (data.content || []).map((b) => b.type === "text" ? b.text : "").filter(Boolean).join("\n");
      const a = text.indexOf("["), b = text.lastIndexOf("]");
      const arr = (a !== -1 && b !== -1) ? JSON.parse(text.slice(a, b + 1)) : [];
      const stamp = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      const items = (Array.isArray(arr) ? arr : []).map((it, k) => ({
        id: Date.now() + "-" + k, side, stamp, claim: it.claim || "",
        statut: STATUS[it.statut] ? it.statut : "verifiable", note: it.note || "",
        sources: Array.isArray(it.sources) ? it.sources : [],
      }));
      if (items.length) setSuggestions((p) => [...items, ...p].slice(0, 40));
      setAnalyzing(false);
    } catch (e) {
      setAnalyzing(false);
      if (withWeb) { analyze(raw, false); return; }
      setSuggestions((p) => [{ id: Date.now() + "-e", error: true, note: "Vérification indisponible là, réessaie dans un instant." }, ...p].slice(0, 40));
    }
  }, []);

  useEffect(() => {
    if (!micOn) return;
    const id = setInterval(() => { const t = joinedRef.current; if (t.length - lastLenRef.current > 90 && !busyRef.current) analyze(t); }, 16000);
    return () => clearInterval(id);
  }, [micOn, analyze]);

  function appendSegment(side, txt) {
    setSegments((prev) => {
      if (prev.length && prev[prev.length - 1].side === side) {
        const c = [...prev]; c[c.length - 1] = { side, text: (c[c.length - 1].text + " " + txt).trim() }; return c;
      }
      return [...prev, { side, text: txt.trim() }];
    });
  }
  function appendSpeech(txt) {
    const side = floorRef.current ?? 0;
    appendSegment(side, txt);
    if (isHost) postMessage(panel.id, { kind: "transcript", side, author: pseudo, content: txt.trim() });
  }
  function startMic() {
    if (floor === null) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setMicError("Reconnaissance vocale non gérée ici. Utilise Chrome, ou la saisie en bas."); return; }
    setMicError(null);
    const rec = new SR(); rec.lang = "fr-FR"; rec.continuous = true; rec.interimResults = true;
    rec.onresult = (ev) => {
      let fin = "", itm = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) ev.results[i].isFinal ? (fin += ev.results[i][0].transcript) : (itm += ev.results[i][0].transcript);
      if (fin) appendSpeech(fin.trim()); setInterim(itm);
    };
    rec.onerror = (ev) => { if (ev.error === "not-allowed" || ev.error === "service-not-allowed") { setMicError("Micro bloqué dans l'aperçu intégré. Ouvre la maquette dans son onglet, ou saisis en bas."); wantRef.current = false; setMicOn(false); } };
    rec.onend = () => { if (wantRef.current) { try { rec.start(); } catch (e) {} } else setMicOn(false); };
    recRef.current = rec; wantRef.current = true;
    try { rec.start(); setMicOn(true); } catch (e) {}
  }
  function stopMic() { wantRef.current = false; try { recRef.current && recRef.current.stop(); } catch (e) {} setMicOn(false); setInterim(""); }

  async function toggleCam(i) {
    if (camOwner === i) { camStreamRef.current && camStreamRef.current.getTracks().forEach((t) => t.stop()); camStreamRef.current = null; setCamOwner(null); return; }
    try {
      camStreamRef.current && camStreamRef.current.getTracks().forEach((t) => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      camStreamRef.current = s; setCamOwner(i);
    } catch (e) { setMicError("Caméra bloquée dans l'aperçu intégré. Ouvre la maquette dans son onglet."); }
  }
  useEffect(() => { if (camOwner !== null && vidRefs[camOwner].current && camStreamRef.current) vidRefs[camOwner].current.srcObject = camStreamRef.current; }, [camOwner]);
  useEffect(() => () => { wantRef.current = false; try { recRef.current && recRef.current.stop(); } catch (e) {} camStreamRef.current && camStreamRef.current.getTracks().forEach((t) => t.stop()); }, []);

  function addImages(i, files) {
    // Sur iPhone, le "type" du fichier est souvent vide : on accepte alors le
    // fichier quand même (le champ est déjà limité aux images via accept).
    const urls = Array.from(files).filter((f) => !f.type || f.type.startsWith("image/")).map((f) => URL.createObjectURL(f));
    setImages((im) => im.map((arr, k) => k === i ? [...arr, ...urls] : arr));
  }
  function postComment() {
    const v = draft.trim(); if (!v || !cfg.comments) return;
    if (!session) { setCError("Connecte-toi pour commenter."); return; }
    const low = " " + v.toLowerCase().replace(/[^a-zàâçéèêëîïôûùü\s]/g, " ") + " ";
    if (BANNED.some((w) => low.includes(" " + w + " ") || low.includes(" " + w))) { setCError("Commentaire bloqué : langage interdit."); return; }
    setCError(""); setDraft("");
    postMessage(panel.id, { kind: "comment", author: pseudo, author_id: session.user.id, content: v });
  }

  // Le composant Camp est défini au niveau module (voir plus bas), pour ne
  // PAS se reconstruire à chaque rendu (sinon la vidéo clignote). On lui passe
  // l'état nécessaire en props.
  const campProps = { floor, pending, clockRunning, request, cfg, camOwner, vidRefs, camStreamRef, remaining, micOn, startMic, stopMic, cede, accept, askFloor, toggleCam, images, setImages, setLightbox, addImages, interactive: isHost };

  const bannerStatus = floor === null ? "Le modérateur lance le débat"
    : clockRunning ? "au temps de parole"
    : pending !== null ? "parole cédée — " + cfg.camps[pending] + " doit accepter"
    : "en pause";

  function copyCode() { try { navigator.clipboard.writeText(panel.code); } catch (e) {} setCopied(true); setTimeout(() => setCopied(false), 1500); }

  const headerRight = (
    <div className="flex items-center gap-2">
      <button onClick={copyCode} className="pill inline-flex items-center gap-1.5" style={{ padding: "8px 12px", fontSize: 13 }} title="Copier le code de salle">
        <span style={{ fontFamily: SERIF, letterSpacing: "0.18em", color: C.gold }}>{panel.code}</span>
        {copied ? <span style={{ fontSize: 11, color: C.green }}>copié</span> : <Copy size={13} />}
      </button>
      {isHost && (floor === null
        ? <button onClick={launch} className="inline-flex items-center gap-1.5 uppercase" style={{ borderRadius: 999, background: C.gold, color: C.bg, border: "1px solid " + C.gold, padding: "8px 16px", fontWeight: 700, letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}><Flag size={13} /> Lancer</button>
        : <button onClick={() => pending === null && setClockRunning((r) => !r)} className="pill inline-flex items-center gap-1.5" style={{ padding: "8px 14px", fontSize: 13, opacity: pending === null ? 1 : 0.5 }}>{clockRunning ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Reprendre</>}</button>)}
      {isHost && <button onClick={reset} className="pill" style={{ padding: "8px 10px" }} title="Réinitialiser"><RotateCcw size={13} /></button>}
      <button onClick={onHome} className="pill" style={{ padding: "8px 12px", fontSize: 12, color: C.mute }}>Quitter</button>
    </div>
  );

  if (!isHost && roomRank > MAX_ROOM) {
    return (
      <>
        <Header right={<button onClick={onHome} className="pill inline-flex items-center gap-1.5" style={{ padding: "8px 12px", fontSize: 12, color: C.mute }}><ArrowLeft size={13} /> Accueil</button>} />
        <div className="mx-auto" style={{ maxWidth: 720, padding: "80px 18px 60px", textAlign: "center" }}>
          <Kicker>Salon complet</Kicker>
          <h2 style={{ fontFamily: SERIF, fontSize: "clamp(24px,4vw,36px)", margin: "12px 0 10px" }}>Ce débat est complet ({MAX_ROOM} places)</h2>
          <p style={{ color: C.mute, fontSize: 14, lineHeight: 1.6, maxWidth: 520, margin: "0 auto" }}>Pour garder une qualité fluide et gratuite, chaque débat est limité à {MAX_ROOM} personnes pour l'instant. Réessaie un peu plus tard, ou rejoins un autre débat.</p>
          <button onClick={onHome} className="inline-flex items-center gap-2 uppercase" style={{ marginTop: 24, borderRadius: 999, background: C.gold, color: C.bg, border: "1px solid " + C.gold, padding: "12px 24px", fontWeight: 700, letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}><ArrowLeft size={14} /> Retour à l'accueil</button>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header right={headerRight} />
      <div className="mx-auto" style={{ maxWidth: 1180, padding: "22px 18px 0" }}>
        <Kicker>{cfg.panel} · {cfg.visibility === "public" ? "public" : "privé"}</Kicker>
        <h2 style={{ fontFamily: SERIF, fontSize: "clamp(22px,3.4vw,32px)", lineHeight: 1.05, margin: "6px 0 18px" }}>{cfg.topic}</h2>

        <div className="flex items-center justify-between" style={{ background: C.panel2, border: "1px solid " + (floor !== null ? C.gold : C.line), borderRadius: 18, padding: "16px 22px" }}>
          <div>
            <div className="uppercase" style={{ color: floor !== null ? C.gold : "#6f6b63", letterSpacing: "0.18em", fontSize: 12, fontFamily: SERIF }}>{floor !== null ? cfg.camps[floor] : "—"}</div>
            <div style={{ color: C.mute, fontSize: 12, marginTop: 2 }}>{bannerStatus}</div>
          </div>
          <div style={{ fontFamily: SERIF, fontVariantNumeric: "tabular-nums", fontSize: 46, color: floor !== null && remaining[floor] < 0 ? C.red : floor !== null && remaining[floor] <= 15 ? C.gold : C.text }}>
            {fmt(floor !== null ? remaining[floor] : cfg.minutes * 60)}
          </div>
        </div>
      </div>

      <div className="mx-auto grid grid-cols-2 gap-3" style={{ maxWidth: 1180, padding: "14px 18px 0" }}>
        <Camp i={0} {...campProps} />
        <Camp i={1} {...campProps} />
      </div>

      {micError && <div className="mx-auto" style={{ maxWidth: 1180, padding: "14px 18px 0" }}><div style={{ background: "#1f1413", border: "1px solid " + C.red, borderRadius: 12, padding: 10, fontSize: 12, color: "#e0b3ac" }}>{micError}</div></div>}

      <div className="mx-auto grid grid-cols-1 lg:grid-cols-2 gap-3" style={{ maxWidth: 1180, padding: "14px 18px 0" }}>
        <div style={{ ...cardStyle, padding: 16, display: "flex", flexDirection: "column" }}>
          <Kicker>Retranscription complète</Kicker>
          <div className="overflow-y-auto flex flex-col gap-2" style={{ maxHeight: 230, minHeight: 120, marginTop: 10, fontSize: 14, lineHeight: 1.6 }}>
            {segments.length === 0 && <span style={{ color: "#6f6b63" }}>Tout ce qui est dit s'écrit ici, repérable par camp, et reste relisible.</span>}
            {segments.map((s, k) => (
              <div key={k}>
                <span className="uppercase" style={{ fontFamily: SERIF, color: CAMP[s.side], letterSpacing: "0.05em", fontSize: 12 }}>{cfg.camps[s.side]} · </span>
                <span style={{ color: C.text }}>{s.text}</span>
              </div>
            ))}
            {interim && <div style={{ color: C.mute }}>{interim}</div>}
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="flex items-center justify-between">
            <Kicker>Vérifications</Kicker>
            <button onClick={() => analyze(joinedRef.current, true)} disabled={analyzing} className="inline-flex items-center gap-1.5 uppercase" style={{ borderRadius: 999, background: C.gold, color: C.bg, border: "1px solid " + C.gold, padding: "6px 14px", fontWeight: 700, letterSpacing: "0.08em", fontSize: 11, opacity: analyzing ? 0.6 : 1, cursor: analyzing ? "default" : "pointer" }}>
              {analyzing ? <Loader2 size={12} className="spin" /> : <Search size={12} />} Vérifier
            </button>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 180, minHeight: 80 }}>
            {suggestions.length === 0 && kbHits.length === 0 && <div style={{ color: "#6f6b63", fontSize: 12 }}>Les fiches et les points à vérifier apparaissent ici quand un terme connu est prononcé.</div>}
            {kbHits.map(({ fiche, side, stamp }) => { const open = !!kbOpen[fiche.id]; const toggle = () => setKbOpen((o) => ({ ...o, [fiche.id]: !o[fiche.id] })); return (
              <div key={fiche.id} style={{ background: C.panel2, border: "1px solid " + C.line, borderLeft: "3px solid " + C.greyblue, borderRadius: 12, padding: 10 }}>
                <div onClick={toggle} className="flex items-center justify-between cursor-pointer" style={{ gap: 8 }}>
                  <Badge color={C.greyblue}><BookOpen size={11} /> Fiche</Badge>
                  <span className="inline-flex items-center gap-1" style={{ color: "#6f6b63", fontSize: 11 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: CAMP[side] }} />{stamp}<ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} /></span>
                </div>
                <div onClick={toggle} className="cursor-pointer" style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{fiche.titre}</div>
                {open && (
                  <div style={{ marginTop: 6 }}>
                    {fiche.resume && <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{fiche.resume}</div>}
                    {fiche.reexplication && <div style={{ fontSize: 12, color: C.mute, marginTop: 6, lineHeight: 1.5 }}>{fiche.reexplication}</div>}
                    {Array.isArray(fiche.pointsCles) && fiche.pointsCles.length > 0 && (
                      <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: 12, color: C.text, lineHeight: 1.6 }}>
                        {fiche.pointsCles.map((pt, k) => <li key={k}>{pt}</li>)}
                      </ul>
                    )}
                    {fiche.dossierLabel && <div className="inline-flex items-center gap-1" style={{ fontSize: 12, color: C.gold, marginTop: 6 }}><BookOpen size={11} /> {fiche.dossierLabel}</div>}
                  </div>
                )}
              </div>); })}
            {suggestions.map((it) => it.error
              ? <div key={it.id} style={{ border: "1px solid " + C.red, borderRadius: 12, padding: 10, fontSize: 12, color: "#e0b3ac" }}>{it.note}</div>
              : (() => { const st = STATUS[it.statut], Ic = st.Icon; return (
                <div key={it.id} style={{ background: C.panel2, border: "1px solid " + C.line, borderLeft: "3px solid " + st.color, borderRadius: 12, padding: 10 }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 4, gap: 8 }}>
                    <Badge color={st.color}><Ic size={11} /> {st.label}</Badge>
                    <span className="inline-flex items-center gap-1" style={{ color: "#6f6b63", fontSize: 11 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: CAMP[it.side] }} />{it.stamp}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{it.claim}</div>
                  {it.note && <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>{it.note}</div>}
                  {it.sources && it.sources.map((s, k) => (<a key={k} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 truncate" style={{ fontSize: 12, color: C.gold, marginTop: 4 }}><ExternalLink size={11} /> {s.titre || s.url}</a>))}
                </div>); })())}
          </div>
          {isHost && (
            <div className="flex items-end gap-2">
              <textarea value={manual} onChange={(e) => setManual(e.target.value)} rows={2} placeholder="Saisie manuelle (ou phrase de l'adversaire)…" className="flex-1" style={{ ...fieldStyle, padding: "8px 12px", fontSize: 14, resize: "none" }} />
              <button onClick={() => { if (manual.trim()) { appendSpeech(manual.trim()); analyze(manual, true); setManual(""); } }} className="pill inline-flex items-center" style={{ padding: "9px 13px" }}><Send size={14} /></button>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto" style={{ maxWidth: 1180, padding: "14px 18px 0" }}>
        <div style={{ ...cardStyle, padding: 18 }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
            <MessageSquare size={14} color={C.gold} />
            <span className="uppercase" style={{ fontFamily: SERIF, fontSize: 13, letterSpacing: "0.08em" }}>Spectateurs</span>
            <span className="inline-flex items-center gap-1" style={{ color: C.gold, fontSize: 12 }}><Users size={12} /> {spectators} / {MAX_ROOM}</span>
            <span style={{ color: "#6f6b63", fontSize: 12 }}>· {cfg.visibility === "public" ? "public · " : "privé · "}{cfg.comments ? "commentaires ouverts" : "commentaires bloqués"}</span>
          </div>
          {cfg.comments ? (
            <>
              <div className="flex gap-2" style={{ marginBottom: 8 }}>
                <input value={draft} onChange={(e) => { setDraft(e.target.value); setCError(""); }} onKeyDown={(e) => e.key === "Enter" && postComment()} placeholder="Écrire un commentaire…" className="flex-1" style={{ ...fieldStyle, padding: "9px 13px", fontSize: 14 }} />
                <button onClick={postComment} className="pill inline-flex items-center" style={{ padding: "9px 13px" }}><Send size={14} /></button>
              </div>
              {cError && <div style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{cError}</div>}
              <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 120 }}>
                {comments.length === 0 && <div style={{ color: "#6f6b63", fontSize: 12 }}>Les commentaires s'afficheront ici, en direct. Les mots interdits sont refusés.</div>}
                {comments.map((c) => (<div key={c.id} className="flex gap-2" style={{ fontSize: 14 }}><span style={{ color: "#6f6b63" }}>{c.t}</span>{c.author && <span onClick={() => c.author_id && setViewedProfile(c.author_id)} style={{ color: C.gold, fontWeight: 600, cursor: c.author_id ? "pointer" : "default" }}>{c.author}</span>}<span>{c.txt}</span></div>))}
              </div>
            </>
          ) : <div style={{ color: "#6f6b63", fontSize: 12 }}>Les commentaires sont désactivés pour ce panel.</div>}
        </div>
      </div>

      <Footer />

      {lightbox && (
        <div onClick={() => setLightbox(null)} className="fixed inset-0 flex items-center justify-center" style={{ background: "rgba(2,3,4,0.94)", zIndex: 50, padding: 24, cursor: "pointer" }}>
          <button className="absolute inline-flex items-center justify-center" style={{ top: 18, right: 18, width: 40, height: 40, borderRadius: 999, background: C.pill, border: "1px solid " + C.line, cursor: "pointer", color: C.text }}><X size={18} /></button>
          <img src={lightbox} alt="" style={{ maxWidth: "90%", maxHeight: "90%", borderRadius: 12 }} />
        </div>
      )}
      {viewedProfile && <ProfileModal id={viewedProfile} onClose={() => setViewedProfile(null)} />}
    </>
  );
}

/* --------------------------- CAMP (stable) --------------------------- */
// Défini au niveau module pour conserver son identité entre les rendus :
// ainsi React ne remonte pas l'élément vidéo (plus de clignotement caméra).
function Camp({ i, floor, pending, clockRunning, request, cfg, camOwner, vidRefs, camStreamRef, remaining, micOn, startMic, stopMic, cede, accept, askFloor, toggleCam, images, setImages, setLightbox, addImages, interactive = true }) {
  const has = i === floor, isPending = pending === i, started = floor !== null;
  return (
    <div className="flex flex-col gap-2.5" style={{ background: has ? C.panel2 : C.panel, border: "1px solid " + (has ? C.gold : C.line), borderRadius: 18, padding: 14, boxShadow: has ? "0 16px 44px -26px " + C.gold : "none", transition: "border-color .15s,box-shadow .15s" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span style={{ width: 10, height: 10, borderRadius: 3, background: CAMP[i] }} />
          <span className="truncate uppercase" style={{ fontFamily: SERIF, fontSize: 16, letterSpacing: "0.06em" }}>{cfg.camps[i]}</span>
        </div>
        {has && <Badge color={C.gold}>{clockRunning ? "parole" : "pause"}</Badge>}
        {request === i && !has && <Badge color={C.gold}><Hand size={10} /> demande</Badge>}
      </div>

      <div className="overflow-hidden flex items-center justify-center" style={{ background: C.field, border: "1px solid " + C.line, borderRadius: 12, aspectRatio: "16/10" }}>
        {camOwner === i ? <video ref={(el) => { vidRefs[i].current = el; if (el && camStreamRef.current && el.srcObject !== camStreamRef.current) el.srcObject = camStreamRef.current; }} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} /> : <span style={{ color: "#6f6b63", fontSize: 12 }}>caméra éteinte</span>}
      </div>

      <div className="text-center" style={{ fontFamily: SERIF, fontVariantNumeric: "tabular-nums", fontSize: 30, color: remaining[i] < 0 ? C.red : C.text }}>{fmt(remaining[i])}</div>

      {!interactive ? (
        <div className="text-center" style={{ color: "#6f6b63", fontSize: 12, padding: "4px 0" }}>{!started ? "en attente du lancement" : has ? (clockRunning ? "au temps de parole" : "en pause") : "à l'écoute"}</div>
      ) : !started ? (
        <div className="text-center" style={{ color: "#6f6b63", fontSize: 12, padding: "4px 0" }}>en attente du lancement</div>
      ) : has ? (
        <div className="flex gap-2">
          <button onClick={() => micOn ? stopMic() : startMic()} className={micOn ? "" : "pill"} style={micOn ? pillSolid(C.red) : pillBase()}>
            {micOn ? <><MicOff size={13} /> Couper le micro</> : <><Mic size={13} /> Activer le micro</>}
          </button>
          <button onClick={cede} style={pillSolid(C.gold, C.bg)}><ArrowRight size={13} /> Céder</button>
        </div>
      ) : isPending ? (
        <button onClick={accept} className="pulse" style={pillSolid(C.gold, C.bg)}><Hand size={13} /> Prendre la parole</button>
      ) : (
        <button onClick={() => askFloor(i)} disabled={request === i} className={request === i ? "" : "pill"} style={{ ...pillBase(), color: request === i ? "#6f6b63" : C.mute, cursor: request === i ? "default" : "pointer" }}>
          <Hand size={12} /> {request === i ? "demande envoyée" : "Demander la parole"}
        </button>
      )}

      {interactive && (
        <div className="flex gap-2">
          <button onClick={() => toggleCam(i)} className={camOwner === i ? "" : "pill"} style={camOwner === i ? pillSolid(CAMP[i]) : pillBase()}>
            {camOwner === i ? <Video size={12} /> : <VideoOff size={12} />} Caméra
          </button>
          <label className="pill inline-flex items-center justify-center gap-1.5 cursor-pointer" style={{ ...pillBase(), flex: 1 }}>
            <ImagePlus size={12} /> Image
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addImages(i, e.target.files); e.target.value = ""; }} />
          </label>
        </div>
      )}

      {images[i].length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images[i].map((u, k) => (
            <div key={k} className="relative">
              <img src={u} alt="" onClick={() => setLightbox(u)} className="object-cover cursor-pointer" style={{ width: 76, height: 76, borderRadius: 10, border: "1px solid " + C.line }} />
              <button onClick={() => setImages((im) => im.map((arr, kk) => kk === i ? arr.filter((_, j) => j !== k) : arr))} className="absolute" style={{ top: -6, right: -6, borderRadius: 999, background: C.bg, border: "1px solid " + C.line, padding: 1, cursor: "pointer" }}>
                <X size={11} color={C.mute} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Sceau "Admin" dessiné à la main (SVG), aux couleurs de la charte.
function AdminSeal({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs><linearGradient id="adseal" x1="0" y1="0" x2="0" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#e0c184" /><stop offset="1" stopColor="#b08a4a" /></linearGradient></defs>
      <path d="M12 1.6 L20.2 5 V11 C20.2 16.6 16.6 20.2 12 22.4 C7.4 20.2 3.8 16.6 3.8 11 V5 Z" fill="none" stroke="url(#adseal)" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 6.6 l1.5 3.1 3.4.3 -2.6 2.2 .8 3.3 -3.1 -1.8 -3.1 1.8 .8 -3.3 -2.6 -2.2 3.4 -.3 Z" fill="url(#adseal)" />
    </svg>
  );
}

// Couleurs des paliers de trophées.
const PALIERS = {
  Bronze: { m1: "#caa06a", m2: "#7d5a32", ring: "#8a6a3b" },
  Argent: { m1: "#eef1f5", m2: "#9aa1ab", ring: "#aeb4be" },
  Or: { m1: "#f3d488", m2: "#b08a4a", ring: "#d8b25e" },
  Vermeil: { m1: "#f0b27a", m2: "#b5572e", ring: "#d98a52" },
  Pourpre: { m1: "#d68fb8", m2: "#6a2b55", ring: "#b06a9a" },
  Laurier: { m1: "#f6e08f", m2: "#c8a55a", ring: "#e8c878" },
};
// Médaille de trophée (SVG maison). locked = silhouette sombre + point d'interrogation.
function TrophyBadge({ palier = "Bronze", size = 64, locked = false }) {
  const gid = useRef("tb" + Math.random().toString(36).slice(2)).current;
  const p = locked ? { m1: "#262b34", m2: "#14171d", ring: "#2c323d" } : (PALIERS[palier] || PALIERS.Bronze);
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <defs><radialGradient id={gid} cx="40%" cy="35%" r="70%"><stop offset="0" stopColor={p.m1} /><stop offset="1" stopColor={p.m2} /></radialGradient></defs>
      <path d="M44 96 L40 116 L52 108 L60 116 L60 92 Z" fill={p.m2} />
      <path d="M76 96 L80 116 L68 108 L60 116 L60 92 Z" fill={p.ring} />
      <circle cx="60" cy="60" r="40" fill={"url(#" + gid + ")"} stroke={p.ring} strokeWidth="2" />
      {locked ? (
        <text x="60" y="72" textAnchor="middle" fontSize="34" fontWeight="700" fill="#4a5060" fontFamily="Georgia, serif">?</text>
      ) : (<>
        <rect x="50" y="50" width="20" height="18" rx="2" fill="#0c0e12" fillOpacity=".55" />
        <rect x="58.5" y="40" width="3" height="14" rx="1.5" fill="#0c0e12" fillOpacity=".55" />
        <circle cx="60" cy="39" r="4" fill="#0c0e12" fillOpacity=".55" />
        <ellipse cx="48" cy="46" rx="9" ry="5" fill="#fff" fillOpacity=".22" transform="rotate(-30 48 46)" />
      </>)}
    </svg>
  );
}

/* ----------------------------- UI bits ----------------------------- */
function pillBase() { return { flex: 1, borderRadius: 999, background: C.pill, border: "1px solid " + C.line, color: C.text, padding: "8px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }; }
function pillSolid(bg, fg = "#fff") { return { ...pillBase(), background: bg, color: fg, border: "1px solid " + bg }; }

function Shell({ children }) {
  return (
    <div className="app-bg" style={{ minHeight: "100vh", color: C.text, fontFamily: SANS, background: "linear-gradient(180deg,#0b0c0f,#060608)" }}>
      <style>{`
        *{box-sizing:border-box} .hidden{display:none}
        html,body{margin:0} html{scroll-behavior:smooth}
        button,input,textarea{font-family:inherit}
        button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid ${C.gold};outline-offset:2px}
        .spin{animation:s 1s linear infinite}@keyframes s{to{transform:rotate(360deg)}}
        .pulse{animation:p 1.4s ease-in-out infinite}@keyframes p{0%,100%{opacity:1}50%{opacity:.55}}
        @media (prefers-reduced-motion:reduce){.pulse,.spin{animation:none}}
        ::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:${C.line};border-radius:8px}
        .pill{transition:border-color .15s,transform .15s,background .15s}
        .pill:hover{border-color:#565b67}
        .app-bg::before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;
          background-image:linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px);
          background-size:46px 46px;}
        .app-bg::after{content:"";position:fixed;top:-200px;left:-200px;width:700px;height:700px;z-index:0;pointer-events:none;
          background:radial-gradient(circle,rgba(150,150,160,.05),transparent 70%);}
        a{text-decoration:none}
      `}</style>
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}
function Header({ right }) {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(8,9,11,0.72)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", borderBottom: "1px solid " + C.line }}>
      <div className="mx-auto flex items-center justify-between" style={{ maxWidth: 1180, padding: "12px 18px" }}>
        <span className="uppercase" style={{ fontFamily: SERIF, letterSpacing: "0.2em", fontSize: 15 }}>Le contrechamp</span>
        {right}
      </div>
    </header>
  );
}
function Footer() {
  return (
    <footer style={{ borderTop: "1px solid " + C.line, marginTop: 32 }}>
      <div className="mx-auto text-center" style={{ maxWidth: 1180, padding: "18px", color: "#6f6b63", fontSize: 12, letterSpacing: "0.04em" }}>
        Le contrechamp — régie de débat · maquette
      </div>
    </footer>
  );
}
const Kicker = ({ children }) => (<div className="uppercase" style={{ color: C.gold, fontSize: 11, letterSpacing: "0.22em", fontWeight: 700 }}>{children}</div>);
const Label = ({ children }) => (<div className="uppercase" style={{ color: C.mute, fontSize: 11, letterSpacing: "0.12em", marginBottom: 6 }}>{children}</div>);
function Badge({ children, color }) {
  return <span className="inline-flex items-center gap-1 uppercase" style={{ borderRadius: 999, border: "1px solid " + color, color, fontSize: 10, letterSpacing: "0.08em", padding: "2px 8px", fontWeight: 700 }}>{children}</span>;
}
function Toggle({ on, onClick, icon, label, wide }) {
  return (
    <button onClick={onClick} className={(wide ? "w-full justify-start" : "flex-1 justify-center") + " inline-flex items-center gap-2"} style={{ borderRadius: 999, background: on ? C.gold : C.field, color: on ? C.bg : C.mute, border: "1px solid " + (on ? C.gold : C.line), padding: "9px 14px", fontSize: 13, fontWeight: on ? 700 : 400, cursor: "pointer" }}>
      {icon} {label}
    </button>
  );
}
