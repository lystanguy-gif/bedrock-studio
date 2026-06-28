// LKS ART — Configuration du site
// -----------------------------------------------------------------------------
// Ce fichier est livré avec des valeurs de DÉMONSTRATION : tant que les vraies
// clés Supabase ne sont pas renseignées, le site fonctionne en mode "repli" et
// affiche les 19 toiles fournies (images/ + contenu-initial.json).
//
// Pour passer en production, remplacer les valeurs ci-dessous (voir config.example.js
// et la section "Mise en place" du README). Aucune de ces clés n'est secrète côté
// front : la clé anon Supabase est faite pour être publique, la sécurité est
// assurée par les policies RLS du schéma (supabase-schema.sql).
// -----------------------------------------------------------------------------

window.LKS_CONFIG = {

  // --- Supabase ---
  // Projet Supabase > Project Settings > API
  SUPABASE_URL: "https://VOTRE-PROJET.supabase.co",
  SUPABASE_ANON_KEY: "VOTRE_CLE_ANON",

  // Nom du bucket de stockage des images (public)
  STORAGE_BUCKET: "paintings",

  // --- PayPal ---
  // À renseigner quand Léa aura communiqué son compte PayPal Business.
  // Tant que vide, le bouton d'achat reste en mode démonstration.
  PAYPAL_CLIENT_ID: "",
  PAYPAL_CURRENCY: "EUR",

  // --- Formulaire de contact vers email ---
  // Endpoint du service email (Formspree, EmailJS, ou Edge Function).
  // Exemple Formspree : "https://formspree.io/f/xxxxxx"
  // Tant que vide, le formulaire ouvre la messagerie du visiteur (mailto).
  CONTACT_FORM_ENDPOINT: "",
  CONTACT_EMAIL: "lks.kalck.artpeinture@gmail.com",

  // Telephone : laisser vide pour ne PAS l'afficher. Des qu'on met un numero
  // ici (ou depuis l'espace prive de Lea), une ligne "Telephone" apparait.
  CONTACT_PHONE: "",

  // --- Divers ---
  CONTACT_HOURS: "de 10h à 19h",
  FACEBOOK_URL: "",            // à renseigner
  DOMAIN: ""                   // domaine en .fr une fois enregistré
};
