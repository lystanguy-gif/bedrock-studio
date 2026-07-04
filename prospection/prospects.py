#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
prospects.py — Génère une liste de prospects : commerces locaux SANS site web.

Deux sources de données au choix (--source) :
  - google : Google Places API (Nearby Search + Place Details).
             Payant (crédit gratuit mensuel), données riches (note, avis, tél).
             Nécessite la variable d'environnement GOOGLE_MAPS_API_KEY.
  - osm    : Overpass API (OpenStreetMap). 100% gratuit, sans clé.
             Données moins complètes (pas de note/avis), mais suffisant
             pour un premier balayage.

Exemples :
  export GOOGLE_MAPS_API_KEY="votre_clé"
  python prospects.py --location "Annecy" --radius 5 --type restaurant --source google
  python prospects.py --location 74000 --radius 10 --source osm
  python prospects.py --location "Chambéry" --radius 3 --type coiffeur -o coiffeurs.csv

Sortie : un CSV trié par nombre d'avis décroissant, colonnes :
  nom, categorie, adresse, telephone, note_google, nb_avis,
  instagram, facebook, statut

Cache : les réponses API sont mises en cache dans .cache_prospects/ ;
relancer la même commande ne re-télécharge rien (utiliser --refresh
pour forcer une nouvelle récupération).

Dépendance : requests  (pip install requests)
"""

import argparse
import csv
import hashlib
import json
import os
import re
import sys
import time
import unicodedata
from pathlib import Path

import requests

# ---------------------------------------------------------------------------
# Configuration générale — adaptez librement.
# ---------------------------------------------------------------------------

# Dossier de cache local (créé à côté du script).
CACHE_DIR = Path(__file__).parent / ".cache_prospects"

# User-Agent : Nominatim (géocodage OSM) EXIGE un User-Agent identifiable.
# Mettez votre email ou l'URL de votre site.
USER_AGENT = "prospects-script/1.0 (contact: bedrock-studio)"

# Endpoints des API.
GOOGLE_NEARBY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
GOOGLE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"
GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
# Plusieurs serveurs Overpass publics : si le premier est saturé
# (429/504, fréquent aux heures de pointe), on bascule sur le suivant.
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]

# Correspondance "type de commerce" (ce que vous tapez en --type) vers :
#   - le type Google Places (https://developers.google.com/maps/documentation/places/web-service/supported_types)
#   - le couple (clé, valeur) de tag OpenStreetMap
# Ajoutez vos propres types ici : c'est la seule table à modifier.
TYPE_MAP = {
    "restaurant":   {"google": "restaurant",      "osm": ("amenity", "restaurant")},
    "coiffeur":     {"google": "hair_care",       "osm": ("shop", "hairdresser")},
    "garage":       {"google": "car_repair",      "osm": ("shop", "car_repair")},
    "boulangerie":  {"google": "bakery",          "osm": ("shop", "bakery")},
    "fleuriste":    {"google": "florist",         "osm": ("shop", "florist")},
    "institut":     {"google": "beauty_salon",    "osm": ("shop", "beauty")},
    "bar":          {"google": "bar",             "osm": ("amenity", "bar")},
    "cafe":         {"google": "cafe",            "osm": ("amenity", "cafe")},
    "boucherie":    {"google": "store",           "osm": ("shop", "butcher")},
    "opticien":     {"google": "store",           "osm": ("shop", "optician")},
    "plombier":     {"google": "plumber",         "osm": ("craft", "plumber")},
    "electricien":  {"google": "electrician",     "osm": ("craft", "electrician")},
    "immobilier":   {"google": "real_estate_agency", "osm": ("office", "estate_agent")},
    "pressing":     {"google": "laundry",         "osm": ("shop", "laundry")},
    "tatoueur":     {"google": "store",           "osm": ("shop", "tattoo")},
}

# Sans --type, côté OSM on ratisse large : tous les shop=* et craft=*,
# plus les amenity "commerciales" ci-dessous (sinon on récupèrerait
# aussi les bancs publics, parkings, etc.).
OSM_COMMERCIAL_AMENITIES = (
    "restaurant|cafe|bar|fast_food|pub|ice_cream|pharmacy|"
    "veterinary|dentist|driving_school|car_wash|car_rental"
)


# ---------------------------------------------------------------------------
# Cache local : un fichier JSON par "clé" dans .cache_prospects/.
# Permet de relancer le script sans re-consommer de quota API.
# ---------------------------------------------------------------------------

def cache_path(key: str) -> Path:
    """Chemin du fichier de cache pour une clé arbitraire (hashée)."""
    h = hashlib.sha256(key.encode("utf-8")).hexdigest()[:24]
    return CACHE_DIR / f"{h}.json"


def cache_get(key: str):
    """Retourne la valeur en cache pour cette clé, ou None."""
    p = cache_path(key)
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return None  # cache corrompu → on refera l'appel
    return None


def cache_set(key: str, value) -> None:
    """Écrit une valeur dans le cache."""
    CACHE_DIR.mkdir(exist_ok=True)
    cache_path(key).write_text(
        json.dumps(value, ensure_ascii=False), encoding="utf-8"
    )


def cached_request(key: str, fetch_fn, refresh: bool = False):
    """Renvoie le cache si présent, sinon exécute fetch_fn() et met en cache."""
    if not refresh:
        hit = cache_get(key)
        if hit is not None:
            return hit
    value = fetch_fn()
    cache_set(key, value)
    return value


# ---------------------------------------------------------------------------
# Géocodage : transforme "Annecy" ou "74000" en (latitude, longitude).
# ---------------------------------------------------------------------------

def geocode(location: str, source: str, api_key: str | None, refresh: bool):
    """Géocode via Google (si source=google) sinon via Nominatim (gratuit)."""

    def _google():
        r = requests.get(
            GOOGLE_GEOCODE_URL,
            params={"address": location, "region": "fr", "key": api_key},
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        if data.get("status") != "OK" or not data.get("results"):
            sys.exit(f"Géocodage Google impossible pour '{location}' "
                     f"(statut: {data.get('status')})")
        loc = data["results"][0]["geometry"]["location"]
        return [loc["lat"], loc["lng"]]

    def _nominatim():
        r = requests.get(
            NOMINATIM_URL,
            params={"q": location, "format": "json", "limit": 1,
                    "countrycodes": "fr"},  # retirez pour chercher hors France
            headers={"User-Agent": USER_AGENT},
            timeout=30,
        )
        r.raise_for_status()
        results = r.json()
        if not results:
            sys.exit(f"Géocodage Nominatim impossible pour '{location}'")
        return [float(results[0]["lat"]), float(results[0]["lon"])]

    fetch = _google if source == "google" else _nominatim
    lat, lon = cached_request(f"geocode:{source}:{location.lower()}",
                              fetch, refresh)
    return lat, lon


# ---------------------------------------------------------------------------
# Source 1 : Google Places API
# ---------------------------------------------------------------------------

def google_get(url: str, params: dict, max_retries: int = 5) -> dict:
    """GET avec gestion du rate limit Google (backoff exponentiel)."""
    delay = 2.0
    for attempt in range(max_retries):
        r = requests.get(url, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
        status = data.get("status")
        if status in ("OK", "ZERO_RESULTS"):
            return data
        # OVER_QUERY_LIMIT : quota par seconde dépassé → on attend et on réessaie.
        # INVALID_REQUEST sur pagetoken : le token n'est pas encore actif → idem.
        if status in ("OVER_QUERY_LIMIT", "INVALID_REQUEST") and attempt < max_retries - 1:
            time.sleep(delay)
            delay *= 2
            continue
        sys.exit(f"Erreur Google Places: {status} — {data.get('error_message', '')}")
    sys.exit("Erreur Google Places: trop de tentatives (rate limit).")


def google_nearby_search(lat, lon, radius_m, gtype, keyword, api_key, refresh):
    """
    Nearby Search paginé : renvoie la liste brute des résultats.
    NB : l'API est plafonnée à 60 résultats (3 pages) par recherche.
    Pour couvrir une grande zone, réduisez le rayon ou lancez plusieurs
    recherches (quadrillage de la zone).
    """
    key = f"gnearby:{lat:.5f},{lon:.5f}:{radius_m}:{gtype}:{keyword}"

    def _fetch():
        results, page_token = [], None
        while True:
            params = {"key": api_key}
            if page_token:
                # Une page suivante se demande uniquement avec le token.
                params["pagetoken"] = page_token
            else:
                params.update({"location": f"{lat},{lon}", "radius": radius_m})
                if gtype:
                    params["type"] = gtype
                if keyword:
                    params["keyword"] = keyword
            data = google_get(GOOGLE_NEARBY_URL, params)
            results.extend(data.get("results", []))
            page_token = data.get("next_page_token")
            if not page_token:
                break
            # Google impose ~2 s avant que le token de page suivante soit actif.
            time.sleep(2.5)
        return results

    return cached_request(key, _fetch, refresh)


def google_place_details(place_id: str, api_key: str, refresh: bool) -> dict:
    """
    Place Details : c'est ici qu'on obtient le champ 'website' (absent du
    Nearby Search). Chaque appel est mis en cache individuellement par
    place_id → relancer le script ne re-consomme pas le quota.
    """
    fields = ",".join([
        "name", "formatted_address", "formatted_phone_number",
        "international_phone_number", "website", "rating",
        "user_ratings_total", "types", "business_status",
    ])

    def _fetch():
        data = google_get(GOOGLE_DETAILS_URL, params={
            "place_id": place_id, "fields": fields,
            "language": "fr", "key": api_key,
        })
        return data.get("result", {})

    return cached_request(f"gdetails:{place_id}", _fetch, refresh)


def collect_google(lat, lon, radius_m, business_type, api_key, refresh):
    """Pipeline Google : recherche → détails → filtre 'pas de site web'."""
    gtype, keyword = None, None
    if business_type:
        mapped = TYPE_MAP.get(business_type.lower())
        if mapped:
            gtype = mapped["google"]
        else:
            # Type inconnu de notre table → on le passe en mot-clé libre.
            keyword = business_type

    places = google_nearby_search(lat, lon, radius_m, gtype, keyword,
                                  api_key, refresh)
    print(f"  {len(places)} établissements trouvés (Nearby Search)")
    if len(places) >= 60:
        print("  ⚠ Plafond de 60 résultats atteint : réduisez le rayon ou "
              "quadrillez la zone pour tout couvrir.")

    prospects = []
    for i, place in enumerate(places, 1):
        details = google_place_details(place["place_id"], api_key, refresh)
        # Politesse anti rate-limit entre deux appels Details
        # (inutile pour les résultats déjà en cache, d'où le test).
        if cache_get(f"gdetails:{place['place_id']}") is None:
            time.sleep(0.1)
        print(f"  détails {i}/{len(places)} : {details.get('name', '?')}",
              end="\r")

        if details.get("business_status") == "CLOSED_PERMANENTLY":
            continue  # inutile de prospecter un commerce fermé

        website = (details.get("website") or "").strip()
        insta = "instagram.com" in website.lower()
        fb = "facebook.com" in website.lower()
        # Prospect qualifié = pas de site web… ou juste une page
        # Insta/Facebook en guise de "site" (candidat idéal pour un vrai site).
        if website and not (insta or fb):
            continue

        # Catégorie lisible : premier type Google non générique.
        types = [t for t in details.get("types", [])
                 if t not in ("point_of_interest", "establishment", "store")]
        categorie = (types[0] if types else "commerce").replace("_", " ")

        prospects.append({
            "nom": details.get("name", ""),
            "categorie": categorie,
            "adresse": details.get("formatted_address", ""),
            "telephone": details.get("formatted_phone_number")
                         or details.get("international_phone_number", ""),
            "note_google": details.get("rating", ""),
            "nb_avis": details.get("user_ratings_total", 0),
            "instagram": "oui" if insta else "",
            "facebook": "oui" if fb else "",
            "statut": "à contacter",
        })
    print()
    return prospects


# ---------------------------------------------------------------------------
# Source 2 : Overpass API (OpenStreetMap) — gratuit, sans clé.
# ---------------------------------------------------------------------------

def build_overpass_query(lat, lon, radius_m, business_type):
    """
    Construit la requête Overpass QL. On interroge nodes + ways
    (les commerces sont tantôt des points, tantôt des bâtiments).
    """
    around = f"(around:{radius_m},{lat},{lon})"

    if business_type:
        mapped = TYPE_MAP.get(business_type.lower())
        if mapped:
            key, value = mapped["osm"]
            selectors = [f'["{key}"="{value}"]']
        else:
            # Type inconnu → on tente une correspondance souple sur la
            # valeur des tags shop / amenity / craft.
            selectors = [f'["shop"~"{business_type}",i]',
                         f'["amenity"~"{business_type}",i]',
                         f'["craft"~"{business_type}",i]']
    else:
        # Pas de type : tous les commerces/artisans + amenities commerciales.
        selectors = ['["shop"]', '["craft"]',
                     f'["amenity"~"^({OSM_COMMERCIAL_AMENITIES})$"]']

    body = "".join(
        f"  {kind}{sel}{around};\n"
        for sel in selectors
        for kind in ("node", "way")
    )
    return f"[out:json][timeout:90];\n(\n{body});\nout center tags;"


def collect_osm(lat, lon, radius_m, business_type, refresh):
    """Pipeline OSM : requête Overpass → filtre 'pas de tag website'."""
    query = build_overpass_query(lat, lon, radius_m, business_type)
    key = f"overpass:{hashlib.sha256(query.encode()).hexdigest()}"

    def _fetch():
        # Les serveurs Overpass publics sont souvent saturés : on essaie
        # chaque miroir avec des pauses croissantes avant d'abandonner.
        last_error = None
        for attempt in range(6):
            url = OVERPASS_URLS[attempt % len(OVERPASS_URLS)]
            try:
                r = requests.post(url, data={"data": query},
                                  headers={"User-Agent": USER_AGENT},
                                  timeout=180)
                # 429 = rate limit, 5xx = serveur surchargé → miroir suivant.
                if r.status_code in (429, 502, 503, 504):
                    raise requests.HTTPError(f"HTTP {r.status_code}",
                                             response=r)
                r.raise_for_status()
                return r.json().get("elements", [])
            except (requests.RequestException, ValueError) as e:
                last_error = e
                wait = 5 * (attempt + 1)
                print(f"  serveur Overpass indisponible ({e}), "
                      f"nouvel essai dans {wait}s…")
                time.sleep(wait)
        sys.exit(f"Overpass injoignable après plusieurs essais : {last_error}")

    elements = cached_request(key, _fetch, refresh)
    print(f"  {len(elements)} objets OSM trouvés")

    prospects = []
    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name", "").strip()
        if not name:
            continue  # sans nom, impossible à prospecter

        # Un site web peut être déclaré sous plusieurs tags OSM.
        website = (tags.get("website") or tags.get("contact:website")
                   or tags.get("url") or "").strip()
        insta_tag = tags.get("contact:instagram", "")
        fb_tag = tags.get("contact:facebook", "")
        insta = bool(insta_tag) or "instagram.com" in website.lower()
        fb = bool(fb_tag) or "facebook.com" in website.lower()
        # Même règle que Google : un "site" qui n'est qu'une page
        # Insta/Facebook reste un prospect.
        if website and not ("instagram.com" in website.lower()
                            or "facebook.com" in website.lower()):
            continue

        # Adresse reconstruite depuis les tags addr:* (souvent incomplets
        # dans OSM — c'est la limite de la source gratuite).
        adresse = " ".join(filter(None, [
            tags.get("addr:housenumber", ""),
            tags.get("addr:street", ""),
            tags.get("addr:postcode", ""),
            tags.get("addr:city", ""),
        ])).strip()

        categorie = (tags.get("shop") or tags.get("amenity")
                     or tags.get("craft") or tags.get("office") or "commerce")

        prospects.append({
            "nom": name,
            "categorie": categorie.replace("_", " "),
            "adresse": adresse,
            "telephone": tags.get("phone") or tags.get("contact:phone", ""),
            "note_google": "",   # non disponible via OSM
            "nb_avis": 0,        # non disponible via OSM
            "instagram": "oui" if insta else "",
            "facebook": "oui" if fb else "",
            "statut": "à contacter",
        })
    return prospects


# ---------------------------------------------------------------------------
# Dédoublonnage + export CSV
# ---------------------------------------------------------------------------

def normalize(text: str) -> str:
    """Normalise pour comparer : minuscules, sans accents, espaces réduits."""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", text.lower()).strip()


def dedupe(prospects: list[dict]) -> list[dict]:
    """Supprime les doublons sur la clé nom + adresse (normalisés)."""
    seen, unique = set(), []
    for p in prospects:
        key = (normalize(p["nom"]), normalize(p["adresse"]))
        if key in seen:
            continue
        seen.add(key)
        unique.append(p)
    return unique


def write_csv(prospects: list[dict], path: str) -> None:
    """Écrit le CSV trié par nb d'avis décroissant (utf-8-sig → Excel ok)."""
    prospects.sort(key=lambda p: int(p.get("nb_avis") or 0), reverse=True)
    columns = ["nom", "categorie", "adresse", "telephone", "note_google",
               "nb_avis", "instagram", "facebook", "statut"]
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        writer.writerows(prospects)


# ---------------------------------------------------------------------------
# Point d'entrée
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Liste les commerces locaux sans site web (prospects).",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--location", "-l", required=True,
                        help="Ville ou code postal (ex: 'Annecy' ou 74000)")
    parser.add_argument("--radius", "-r", type=float, default=5.0,
                        help="Rayon de recherche en km")
    parser.add_argument("--type", "-t", dest="business_type", default=None,
                        help=f"Type de commerce ({', '.join(TYPE_MAP)}… "
                             "ou texte libre)")
    parser.add_argument("--source", "-s", choices=["google", "osm"],
                        default="google",
                        help="Source de données (google = Places API, "
                             "osm = Overpass, gratuit)")
    parser.add_argument("--output", "-o", default="prospects.csv",
                        help="Fichier CSV de sortie")
    parser.add_argument("--refresh", action="store_true",
                        help="Ignore le cache et re-télécharge tout")
    args = parser.parse_args()

    radius_m = int(args.radius * 1000)

    # La clé API ne vient QUE de l'environnement — jamais en dur dans le code.
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if args.source == "google" and not api_key:
        sys.exit("Variable d'environnement GOOGLE_MAPS_API_KEY manquante.\n"
                 "  export GOOGLE_MAPS_API_KEY='votre_clé'\n"
                 "(ou utilisez --source osm, gratuit et sans clé)")

    print(f"Géocodage de '{args.location}'…")
    lat, lon = geocode(args.location, args.source, api_key, args.refresh)
    print(f"  → {lat:.5f}, {lon:.5f} (rayon {args.radius} km)")

    print(f"Recherche des commerces via {args.source}…")
    if args.source == "google":
        prospects = collect_google(lat, lon, radius_m, args.business_type,
                                   api_key, args.refresh)
    else:
        prospects = collect_osm(lat, lon, radius_m, args.business_type,
                                args.refresh)

    before = len(prospects)
    prospects = dedupe(prospects)
    if before != len(prospects):
        print(f"  {before - len(prospects)} doublon(s) supprimé(s)")

    write_csv(prospects, args.output)
    print(f"\n✅ {len(prospects)} prospects sans site web → {args.output}")


if __name__ == "__main__":
    main()
