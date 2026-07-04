# Prospection — commerces locaux sans site web

Script Python qui génère un CSV de prospects : les commerces d'une zone
donnée qui **n'ont pas de site web** (ou seulement une page Instagram /
Facebook) — les candidats idéaux pour leur proposer un site.

## Installation

```bash
pip install requests
```

## Utilisation

```bash
# Source gratuite (OpenStreetMap), sans clé API :
python prospects.py --location "Gap" --radius 5 --source osm

# Source Google Places (plus riche : note, nb d'avis, téléphone fiable) :
export GOOGLE_MAPS_API_KEY="votre_clé"
python prospects.py --location 05000 --radius 10 --type restaurant --source google

# Autres options :
python prospects.py --location "Briançon" -r 3 -t coiffeur -o coiffeurs.csv
python prospects.py --location "Embrun" -r 5 --refresh   # ignore le cache
```

| Option | Rôle | Défaut |
|---|---|---|
| `--location` / `-l` | Ville ou code postal (obligatoire) | — |
| `--radius` / `-r` | Rayon en km | 5 |
| `--type` / `-t` | Type de commerce (`restaurant`, `coiffeur`, `garage`… ou texte libre) | tous |
| `--source` / `-s` | `google` ou `osm` | google |
| `--output` / `-o` | Fichier CSV de sortie | prospects.csv |
| `--refresh` | Ignore le cache local | — |
| `--keep-chains` | Garde les chaînes/franchises (source osm) | exclues |

## Sortie

CSV (encodé pour Excel) trié par **nombre d'avis Google décroissant** —
les commerces les plus actifs en premier :

`nom, categorie, adresse, telephone, note_google, nb_avis, instagram, facebook, statut`

Un commerce dont le "site web" est en réalité une page Instagram ou
Facebook est **conservé** comme prospect, avec la colonne correspondante
à `oui`.

## Clé API Google

1. [Google Cloud Console](https://console.cloud.google.com/) → créer un projet
2. Activer **Places API** et **Geocoding API**
3. Créer une clé API et la restreindre à ces deux API
4. `export GOOGLE_MAPS_API_KEY="votre_clé"` (jamais dans le code)

Le Nearby Search est plafonné à **60 résultats par recherche** : pour une
grande ville, réduisez le rayon et lancez plusieurs recherches (le cache
et le dédoublonnage font le reste).

## Cache

Toutes les réponses API sont mises en cache dans `.cache_prospects/`
(ignoré par git). Relancer la même commande ne re-consomme pas de quota ;
seuls les nouveaux commerces déclenchent des appels. `--refresh` force la
mise à jour.

## Adapter le script

- **Ajouter un type de commerce** : complétez le dictionnaire `TYPE_MAP`
  en haut de `prospects.py` (type Google + tag OSM).
- **Élargir les commerces OSM sans `--type`** : modifiez
  `OSM_COMMERCIAL_AMENITIES`.
- **Chercher hors de France** : retirez `countrycodes=fr` (Nominatim) et
  `region=fr` (Google) dans `geocode()`.

## Limites connues

- **OSM** : pas de note ni de nombre d'avis, adresses parfois incomplètes,
  et l'absence de tag `website` ne garantit pas l'absence de site
  (données contributives). Bon pour un balayage gratuit, à vérifier avant
  contact.
- **Google** : l'absence du champ `website` est un signal fiable, mais
  chaque Place Details a un coût — le cache est là pour ça.
