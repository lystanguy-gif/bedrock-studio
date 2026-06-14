// Traductions de l'interface. La CLÉ est le texte français exact ; si une
// entrée manque, on retombe sur le français (dégradation douce, jamais de vide).
// Pour traduire un nouvel écran : enrober les textes avec t("…") côté React
// et ajouter ici la correspondance anglaise.
export const EN = {
  // — Commun / navigation —
  "Accueil": "Home",
  "Retour": "Back",
  "Fermer": "Close",
  "Se connecter": "Sign in",
  "Déconnexion": "Sign out",
  "Mon compte": "My account",
  "Mentions légales & conditions": "Legal notice & terms",

  // — Accueil —
  "Régie de débat": "Debate control room",
  "Deux camps, face à face. Le champ et le contrechamp. Pour regarder, c'est libre. Pour participer ou héberger, un compte suffit.":
    "Two camps, face to face. The shot and the reverse shot. Watching is free. To take part or host, an account is enough.",
  "Créer un débat": "Create a debate",
  "Rejoindre un débat": "Join a debate",
  "L'Agora": "The Agora",
  "Créer un débat nécessite un compte (gratuit, rapide).": "Creating a debate requires an account (free and quick).",
  "Bonjour,": "Hello,",
  "⚠️ Connexion à la base non configurée sur ce site (variables d'environnement manquantes).":
    "⚠️ Database connection not configured on this site (missing environment variables).",

  // — Comptes (connexion / inscription) —
  "Ton compte": "Your account",
  "Créer un compte": "Create an account",
  "Pseudo": "Username",
  "Ton nom affiché": "Your display name",
  "Email": "Email",
  "toi@email.fr": "you@email.com",
  "Mot de passe": "Password",
  "6 caractères minimum": "6 characters minimum",
  "Créer mon compte": "Create my account",
  "Me connecter": "Sign in",
  "Pour regarder un débat, aucun compte n'est nécessaire. Le compte sert à écrire, participer et héberger.":
    "To watch a debate, no account is needed. An account lets you write, take part and host.",
  // Messages d'erreur traduits
  "Email ou mot de passe incorrect.": "Incorrect email or password.",
  "Email pas encore confirmé. Vérifie ta boîte mail.": "Email not confirmed yet. Check your inbox.",
  "Un compte existe déjà avec cet email.": "An account already exists with this email.",
  "Mot de passe trop court (6 caractères minimum).": "Password too short (6 characters minimum).",
  "Cette adresse email semble invalide.": "This email address looks invalid.",
  "Une erreur est survenue.": "Something went wrong.",
  "La connexion n'est pas configurée sur ce site.": "Sign-in is not configured on this site.",
  "Email et mot de passe requis.": "Email and password required.",
  "Choisis un pseudo.": "Choose a username.",
  "Compte créé ! Vérifie ta boîte mail pour confirmer, puis connecte-toi.":
    "Account created! Check your inbox to confirm, then sign in.",

  // — Rejoindre —
  "Rejoindre": "Join",
  "Code de salle": "Room code",
  "Ton pseudo (pour regarder)": "Your name (to watch)",
  "Spectateur": "Viewer",
  "Regarder est libre. Pour commenter, il faut un compte.": "Watching is free. To comment, you need an account.",
  "Entre un code de salle.": "Enter a room code.",
  "Aucun débat trouvé avec ce code.": "No debate found with this code.",
}

// Renvoie la traduction de `s` pour la langue donnée (fr par défaut).
export function translate(lang, s) {
  if (lang !== 'en' || s == null) return s
  return EN[s] || s
}
