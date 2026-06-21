// LKS ART — Modele de configuration
// Copier ce fichier en assets/config.js et remplir les valeurs.
// Aucune de ces cles n'est secrete cote front, la cle anon Supabase est faite pour etre publique,
// la securite est assuree par les policies RLS du schema.

window.LKS_CONFIG = {

  // --- Supabase ---
  // Projet Supabase > Project Settings > API
  SUPABASE_URL: "https://VOTRE-PROJET.supabase.co",
  SUPABASE_ANON_KEY: "VOTRE_CLE_ANON",

  // Nom du bucket de stockage des images (public)
  STORAGE_BUCKET: "paintings",

  // --- PayPal ---
  // A renseigner quand Lea aura communique son compte PayPal Business.
  // Tant que vide, le bouton reste en mode demonstration.
  PAYPAL_CLIENT_ID: "",
  PAYPAL_CURRENCY: "EUR",

  // --- Formulaire de contact vers email ---
  // Endpoint du service email (Formspree, EmailJS, ou Edge Function).
  // Exemple Formspree, "https://formspree.io/f/xxxxxx"
  CONTACT_FORM_ENDPOINT: "",
  CONTACT_EMAIL: "lksartpeinturekalck@gmail.com",

  // --- Divers ---
  CONTACT_HOURS: "de 10h a 19h",
  FACEBOOK_URL: "",            // a renseigner
  DOMAIN: ""                   // domaine en .fr une fois enregistre
};
