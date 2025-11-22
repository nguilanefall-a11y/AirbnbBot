# Workers Async - Documentation

## Vue d'ensemble

Les workers async utilisent l'API async de Playwright pour une meilleure performance et parallélisation.

## Fichiers

### `src/playwright_async/sync_send_worker.py`
Workers combinés qui font SYNC et SEND en parallèle :
- **SYNC** : Récupère les messages de toutes les conversations Airbnb
- **SEND** : Envoie les messages depuis la queue `queue_outbox`

### `src/playwright_async/sync_scraper_2months.py`
Worker spécialisé qui scrape 2 mois d'historique :
- Scroll automatiquement jusqu'à 60 jours d'historique
- Stocke tous les messages trouvés
- Nettoie automatiquement les messages de plus de 60 jours

## Utilisation

### Lancer les workers SYNC + SEND en parallèle
```bash
python3 src/main.py syncsend
```

### Lancer le scraper 2 mois
```bash
python3 src/main.py sync2months
```

### Avec PM2
```bash
pm2 start pm2.json --only syncsend
```

## Configuration

Les workers utilisent les variables d'environnement suivantes :
- `PLAYWRIGHT_SESSION_DIR` : Dossier de session Playwright (défaut: `./session`)
- `AIRBNB_HEADLESS` : Mode headless (défaut: `true`)
- `SCRAPE_INTERVAL_SEC` : Intervalle entre les cycles de sync (défaut: `45`)
- `AI_WEBHOOK_URL` : URL de l'API IA pour notifier les nouveaux messages

## Différences avec les workers sync

1. **Performance** : L'API async permet de meilleures performances
2. **Parallélisation** : SYNC et SEND tournent en parallèle dans le même process
3. **Session persistante** : Utilise `launch_persistent_context` pour garder la session
4. **Sélecteurs** : Utilise les sélecteurs `data-testid` d'Airbnb

## Structure de la base de données

Les workers utilisent les tables suivantes :
- `conversations` : Stocke les conversations avec `external_id` (thread ID Airbnb)
- `messages` : Stocke les messages avec `airbnb_message_id` (ID unique)
- `queue_outbox` : Queue pour les messages à envoyer

## Notes importantes

- Les workers détectent automatiquement les CAPTCHA et s'arrêtent proprement
- Les délais aléatoires simulent un comportement humain
- Les messages sont dédupliqués par ID unique basé sur conversation_id + timestamp + sender + content hash

