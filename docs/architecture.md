# Architecture du projet Conciergerie Airbnb

## Règles middleware Express (ordre obligatoire)

1. Imports
2. Sessions
3. Passport.initialize()
4. Passport.session()
5. Garde-fou Passport
6. Debug Auth
7. Logs
8. Routes
9. Gestion des erreurs

## Modules principaux

- Auth
- Host
- Cleaning Agent
- Calendar Sync
- Chatbot
- Livret d'accueil (déblocage 24h avant)
- Dashboard

## Fichiers critiques (à ne jamais réécrire complètement)

- app.js
- passport.js
- session.js
- calendar-sync/\*
- auth/\*
