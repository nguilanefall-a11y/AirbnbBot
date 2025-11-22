# Guide d'Import depuis Airbnb - Sans Channel Manager

## 🎯 Vue d'ensemble

Notre système d'import utilise **plusieurs techniques combinées** pour extraire les données depuis Airbnb sans avoir besoin d'un channel manager :

1. **Playwright (navigateur headless)** - Technique principale avec anti-détection
2. **Extraction JSON Next.js** - Parsing des données embarquées
3. **Extraction DOM** - Récupération depuis le HTML
4. **IA Gemini** - Analyse du texte pour compléter les données manquantes
5. **Import manuel** - Fallback si tout échoue

## 🔧 Améliorations Techniques Récentes

### 1. Mode Stealth pour Playwright

Le navigateur headless est maintenant configuré pour éviter la détection :

- **Fingerprint réaliste** : User-Agent Mac, viewport 1920x1080, géolocalisation Paris
- **Headers complets** : Tous les headers d'un vrai navigateur (Accept, Accept-Language, Sec-Fetch-*, etc.)
- **Masquage d'automation** : Suppression de `navigator.webdriver`, override de `chrome.runtime`, etc.
- **Comportement humain** : Scroll progressif, attentes réalistes, réseau idle

### 2. Extraction JSON Next.js Améliorée

Airbnb utilise Next.js et stocke les données dans `__NEXT_DATA__`. Le système recherche maintenant dans plusieurs chemins :

- `props.pageProps.listingDetails.listing`
- `props.pageProps.listing`
- `bootstrapData.reduxData.homePDP.listingInfo.listing`

### 3. Extraction de Texte Visible

Si le JSON n'est pas trouvé, le système extrait le texte visible de la page pour l'analyse par IA :

- Utilise `TreeWalker` pour extraire uniquement le texte visible
- Exclut les scripts, styles, et éléments cachés
- Formate proprement pour l'analyse Gemini

### 4. Fusion Intelligente des Données

Le système combine les résultats de plusieurs méthodes :

1. **Playwright** extrait d'abord (JSON + DOM)
2. Si insuffisant, **IA Gemini** analyse le texte visible
3. Les données sont fusionnées (Playwright prioritaire, IA complète les manquants)

## 📋 Utilisation

### Méthode 1 : Import Automatique (Recommandée)

1. Ouvrez votre annonce Airbnb
2. Copiez l'URL complète (ex: `https://www.airbnb.fr/rooms/1454556142230701066`)
3. Dans l'interface, cliquez sur "Importer depuis Airbnb"
4. Collez l'URL dans le champ
5. Cliquez sur "Importer la propriété"

**Le système va :**
- Lancer Playwright avec mode stealth
- Extraire les données JSON et DOM
- Compléter avec l'IA si nécessaire
- Créer votre propriété avec toutes les informations

### Méthode 2 : Import Manuel (Fallback)

Si l'import automatique ne fonctionne pas :

1. Ouvrez votre annonce Airbnb dans votre navigateur
2. Sélectionnez tout le texte de la page (`Cmd+A` ou `Ctrl+A`)
3. Copiez (`Cmd+C` ou `Ctrl+C`)
4. Dans l'interface, collez le texte dans le champ "Méthode manuelle"
5. Cliquez sur "Importer depuis le texte"

**Alternative HTML :**
- Clic droit sur la page → "Afficher le code source"
- Sélectionnez tout (`Cmd+A` ou `Ctrl+A`)
- Copiez (`Cmd+C` ou `Ctrl+C`)
- Collez dans le champ texte

## 🛠️ Configuration

### Variables d'Environnement

```env
# Activer Playwright (obligatoire pour l'import automatique)
PLAYWRIGHT_ENABLED=1

# Clé API Gemini (obligatoire pour l'analyse IA)
GEMINI_API_KEY=votre_cle_api
```

### Installation de Playwright

Si Playwright n'est pas installé :

```bash
npm install playwright
npx playwright install chromium
```

## 🚨 Dépannage

### Erreur : "Playwright disabled"

**Solution :** Ajoutez `PLAYWRIGHT_ENABLED=1` dans votre fichier `.env`

### Erreur : "Impossible d'importer la propriété"

**Solutions :**
1. Vérifiez que l'URL est correcte et accessible
2. Essayez la méthode manuelle (copier-coller du texte)
3. Vérifiez les logs du serveur pour plus de détails

### Erreur : "GEMINI_API_KEY n'est pas configurée"

**Solution :** Ajoutez votre clé API Gemini dans le fichier `.env`

### L'import fonctionne mais manque des données

**Normal :** Le système extrait ce qui est disponible publiquement. Vous pouvez :
- Compléter manuellement les champs manquants dans l'interface "Tableau"
- Ré-importer depuis Airbnb si vous mettez à jour votre annonce

## 💡 Astuces

1. **Vérifiez votre annonce Airbnb** : Plus votre annonce est complète, plus l'import sera précis
2. **Utilisez la méthode manuelle** : Si le lien ne fonctionne pas, la méthode manuelle fonctionne toujours
3. **Complétez après import** : L'import donne une base, vous pouvez toujours ajouter des détails (WiFi, codes d'accès, etc.)

## 🔒 Limitations

- **Pas de données privées** : L'import ne peut pas récupérer les informations privées (codes WiFi, clés, etc.)
- **Bloquage possible** : Airbnb peut bloquer les requêtes automatiques. Dans ce cas, utilisez la méthode manuelle
- **Structure changeante** : Si Airbnb change sa structure, l'import peut nécessiter une mise à jour

## 📊 Données Extrahées

Le système essaie d'extraire :
- ✅ Nom de la propriété
- ✅ Description
- ✅ Adresse
- ✅ Nombre de voyageurs maximum
- ✅ Équipements (amenities)
- ✅ Règles de la maison
- ✅ Horaires de check-in/check-out
- ✅ Informations supplémentaires (si disponibles)

**Note :** Les données comme WiFi, codes d'accès, etc. doivent être ajoutées manuellement car elles ne sont pas publiques.

