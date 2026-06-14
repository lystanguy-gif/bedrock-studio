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
  "Tu dois être connecté pour créer un débat.": "You must be signed in to create a debate.",
  "Impossible de générer un code unique, réessaie.": "Couldn't generate a unique code, try again.",

  // — Création de débat (Setup) —
  "Ouvrir un panel": "Open a panel",
  "Deux camps, face à face. Le champ et le contrechamp. La vérification au centre, comme l'arbitre du débat.":
    "Two camps, face to face. The shot and the reverse shot. Verification at the center, like the debate's referee.",
  "Nom du panel": "Panel name",
  "Sujet du débat": "Debate topic",
  "Camp": "Side",
  "Temps de parole par camp (minutes)": "Speaking time per side (minutes)",
  "Thème (trophées & Agora)": "Theme (trophies & Agora)",
  "Général (sans thème)": "General (no theme)",
  "Pays": "Country",
  "Format": "Format",
  "Un contre un": "One vs one",
  "Deux contre deux": "Two vs two",
  "Visibilité": "Visibility",
  "Privé — sur invitation": "Private — invite only",
  "Public — libre d'accès": "Public — open access",
  "Commentaires des spectateurs autorisés": "Viewer comments allowed",
  "Commentaires bloqués": "Comments disabled",
  "Création…": "Creating…",
  "Ouvrir le débat": "Open the debate",
  "Un code de salle unique sera généré : partage-le pour que d'autres rejoignent ton débat.":
    "A unique room code will be generated: share it so others can join your debate.",

  // — Thèmes —
  "Politique": "Politics", "Économie": "Economy", "Société": "Society", "Philosophie": "Philosophy",
  "Religion": "Religion", "Sciences": "Science", "Histoire": "History", "Géopolitique": "Geopolitics",
  "Écologie": "Ecology", "Culture": "Culture", "Sport": "Sport", "Tech": "Tech",

  // — L'Agora —
  "Débats publics": "Public debates",
  "Choisis un débat en cours et rejoins-le. Filtre par thème et par pays.":
    "Pick a live debate and join it. Filter by theme and country.",
  "Thème": "Theme",
  "Tous les thèmes": "All themes",
  "Tous les pays": "All countries",
  "Réinitialiser": "Reset",
  "Chargement…": "Loading…",
  "Aucun débat public en ce moment. Crée le premier en choisissant « Public » à l'ouverture du débat.":
    "No public debate right now. Create the first one by choosing “Public” when opening a debate.",
  "Aucun débat public ne correspond à ces filtres.": "No public debate matches these filters.",
  "Tout afficher": "Show all",
  "par": "by",
  "un membre": "a member",
  "Débat": "Debate",

  // — Mon compte (paramètres) —
  "Paramètres": "Settings",
  "Photo de profil": "Profile picture",
  "Choisis un avatar parmi notre bibliothèque.": "Pick an avatar from our library.",
  "Modifiable une fois tous les 15 jours.": "Changeable once every 15 days.",
  "Changement possible une fois tous les 15 jours.": "You can change it once every 15 days. Next change:",
  "Enregistrer le pseudo": "Save username",
  "Changer le mot de passe": "Change password",
  "Nouveau mot de passe (6 caractères min.)": "New password (6 characters min.)",
  "Mettre à jour le mot de passe": "Update password",
  "Centres d'intérêt": "Interests",
  "Choisis jusqu'à 12 sujets qui te représentent (ils s'affichent sur ton profil).":
    "Pick up to 12 topics that represent you (shown on your profile).",
  "Rechercher un sujet…": "Search a topic…",
  "Enregistrer mes centres d'intérêt": "Save my interests",
  "Voir mon profil public": "View my public profile",
  "Mes trophées": "My trophies",
  "Centres d'intérêt enregistrés.": "Interests saved.",
  "Avatar mis à jour.": "Avatar updated.",
  "Le pseudo ne peut pas être vide.": "Username can't be empty.",
  "C'est déjà ton pseudo actuel.": "That's already your current username.",
  "Pseudo mis à jour.": "Username updated.",
  "Mot de passe mis à jour.": "Password updated.",

  // — Trophées (galerie) —
  "Ma collection": "My collection",
  "Trophées": "Trophies",
  "débloqués": "unlocked",
  "Premier trophée :": "First trophy:",
  "Débloqué le": "Unlocked on",
  "Trophée verrouillé": "Locked trophy",
  "Débloque-le en débattant pour révéler son nom et comment l'obtenir.":
    "Unlock it by debating to reveal its name and how to get it.",

  // — Fiche profil —
  "Ajouter en ami": "Add friend",
  "Amis": "Friends",
  "Retirer": "Remove",
  "T'a envoyé une demande": "Sent you a request",
  "Accepter": "Accept",
  "Refuser": "Decline",
  "Demande envoyée": "Request sent",
  "Annuler": "Cancel",
  "Amis : bientôt disponible (petite mise à jour de la base à faire).":
    "Friends: coming soon (a small database update is needed).",
  "Impossible d'envoyer la demande.": "Couldn't send the request.",
  "Profil indisponible (ce membre n'a pas encore de profil public).":
    "Profile unavailable (this member has no public profile yet).",
  "Anonyme": "Anonymous",
  "Membre depuis": "Member since",
  "Aucun trophée pour l'instant. Ils se gagnent en remportant des débats.":
    "No trophies yet. They're earned by winning debates.",

  // — Mes amis —
  "Membre": "Member",
  "Mes amis": "My friends",
  "Bientôt disponible (une petite mise à jour de la base est nécessaire).":
    "Coming soon (a small database update is needed).",
  "Demandes reçues": "Requests received",
  "Aucun ami pour l'instant. Ouvre le profil d'un membre et clique « Ajouter en ami ».":
    "No friends yet. Open a member's profile and click “Add friend”.",
  "Demandes envoyées": "Requests sent",
  "Rechercher un membre par pseudo…": "Search a member by username…",
  "Aucun membre trouvé.": "No member found.",
  "En attente": "Pending",
  "Ajouter": "Add",

  // — Pied de page —
  "Le contrechamp — régie de débat · maquette": "Le Contrechamp — debate control room · prototype",
}

// Renvoie la traduction de `s` pour la langue donnée (fr par défaut).
export function translate(lang, s) {
  if (lang !== 'en' || s == null) return s
  return EN[s] || s
}
