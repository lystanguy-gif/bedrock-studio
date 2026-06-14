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

  // — Débat en direct —
  "Le modérateur lance le débat": "The moderator starts the debate",
  "au temps de parole": "speaking",
  "parole cédée — en attente d'acceptation": "floor yielded — awaiting acceptance",
  "en pause": "paused",
  "Copier le code de salle": "Copy room code",
  "copié": "copied",
  "Lancer": "Start",
  "Pause": "Pause",
  "Reprendre": "Resume",
  "Clore": "Close",
  "Clore le débat et lancer le vote": "Close the debate and start the vote",
  "Quitter": "Leave",
  "Le verdict du public": "The public's verdict",
  "Qui a remporté ce débat ?": "Who won this debate?",
  "Connecte-toi pour voter. (Regarder reste libre.)": "Sign in to vote. (Watching stays free.)",
  "Tu débats dans ce panel — c'est au public de voter.": "You're debating in this panel — it's up to the audience to vote.",
  "voix": "votes", "vote": "vote", "votes": "votes",
  "validé à partir de": "validated from",
  "Clôturer le vote & révéler": "Close the vote & reveal",
  "Résultat": "Result",
  "Égalité — pas de vainqueur": "Tie — no winner",
  "Vainqueur :": "Winner:",
  "votant": "voter", "votants": "voters", "des voix": "of the votes",
  "présent": "present", "présents": "present",
  "Débat non validé : il faut au moins": "Debate not validated: you need at least",
  "votes et un vainqueur net pour décerner des trophées.": "votes and a clear winner to award trophies.",
  "Victoire enregistrée ! (Pas de nouveau trophée cette fois.)": "Win recorded! (No new trophy this time.)",
  "Revenir au direct": "Back to live",
  "Salon complet": "Room full",
  "Ce débat est complet": "This debate is full",
  "places": "seats",
  "Pour garder une qualité fluide et gratuite, chaque débat est limité pour l'instant. Réessaie plus tard, ou rejoins un autre débat.":
    "To keep it smooth and free, each debate is limited for now. Try again later, or join another debate.",
  "Retour à l'accueil": "Back to home",
  "public": "public", "privé": "private",
  "Retranscription complète": "Full transcript",
  "Tout ce qui est dit s'écrit ici, repérable par camp, et reste relisible.":
    "Everything said is written here, marked by side, and stays readable.",
  "Vérifications": "Fact-checks",
  "Vérifier": "Check",
  "Les fiches et les points à vérifier apparaissent ici quand un terme connu est prononcé.":
    "Fact sheets and points to check appear here when a known term is spoken.",
  "Fiche": "Sheet",
  "Saisie manuelle (ou phrase de l'adversaire)…": "Manual entry (or the opponent's sentence)…",
  "Sur le plateau": "On stage",
  "Personne sur les sièges pour l'instant.": "No one on the seats yet.",
  "Débatteur": "Debater",
  "Top commentateurs": "Top commenters",
  "Les plus actifs du chat apparaîtront ici.": "The most active in chat will appear here.",
  "Spectateurs": "Viewers",
  "commentaires ouverts": "comments open",
  "commentaires bloqués": "comments off",
  "Écrire un commentaire…": "Write a comment…",
  "Les commentaires s'afficheront ici, en direct. Les mots interdits sont refusés.":
    "Comments appear here, live. Banned words are rejected.",
  "Les commentaires sont désactivés pour ce panel.": "Comments are disabled for this panel.",
  "Connecte-toi pour commenter.": "Sign in to comment.",
  "Commentaire bloqué : langage interdit.": "Comment blocked: banned language.",

  // — Camp (vignette) —
  "parole": "speaking", "pause": "paused",
  "Quitter le siège": "Leave the seat",
  "+ Monter": "+ Take a seat",
  "place libre": "free seat",
  "caméra éteinte": "camera off",
  "en attente du lancement": "waiting for the start",
  "Couper le micro": "Mute the mic",
  "Activer le micro": "Turn on the mic",
  "Donner la parole": "Give the floor",
  "à l'écoute": "listening",
  "Caméra + voix": "Camera + voice",
  "Caméra": "Camera",
  "Image": "Image",

  // — Verdicts de fact-checking —
  "Plausible": "Plausible",
  "À nuancer": "Needs nuance",
  "À vérifier": "To verify",
  "Douteux": "Doubtful",
  "Probablement faux": "Likely false",

  // — Trophées débloqués —
  "trophée débloqué !": "trophy unlocked!",
  "trophées débloqués !": "trophies unlocked!",

  // — Erreurs caméra / micro / vérification —
  "Accès caméra/micro refusé. Clique sur l'icône caméra (ou le cadenas) dans la barre d'adresse pour autoriser, puis réessaie.":
    "Camera/mic access denied. Click the camera icon (or padlock) in the address bar to allow, then try again.",
  "Aucune caméra ou micro détecté sur cet appareil.": "No camera or microphone detected on this device.",
  "Caméra/micro déjà utilisés par une autre application. Ferme-la et réessaie.":
    "Camera/mic already in use by another app. Close it and try again.",
  "Impossible d'accéder à la caméra/au micro. Vérifie les autorisations du navigateur, puis réessaie.":
    "Couldn't access the camera/mic. Check your browser permissions, then try again.",
  "Reconnaissance vocale non gérée ici. Utilise Chrome, ou la saisie en bas.":
    "Speech recognition isn't supported here. Use Chrome, or type below.",
  "Micro bloqué dans l'aperçu intégré. Ouvre la maquette dans son onglet, ou saisis en bas.":
    "Mic blocked in the embedded preview. Open the app in its own tab, or type below.",
  "Vérification indisponible là, réessaie dans un instant.": "Fact-check unavailable right now, try again shortly.",

  // — Mentions légales —
  "Retour": "Back",
  "Document d'information, rédigé en langage clair. Il n'a pas valeur de conseil juridique.":
    "Information document, written in plain language. It is not legal advice.",
}

// Renvoie la traduction de `s` pour la langue donnée (fr par défaut).
export function translate(lang, s) {
  if (lang !== 'en' || s == null) return s
  return EN[s] || s
}
