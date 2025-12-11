# Règles pour Claude dans VS Code

- Travailler fichier par fichier.
- Ne jamais réécrire un fichier entier sans patch.
- Respecter l'ordre des middlewares Express.
- Ne pas déplacer les sessions ou Passport.
- Protéger auth, session, passport et calendar-sync.
- Ne pas créer plusieurs comptes pour une même adresse email.
- Proposer un diff avant toute modification sensible.
- Respecter l'architecture décrite dans architecture.md.
- Utiliser async/await et gérer les erreurs avec try/catch.
- Ne pas analyser toute l'arborescence.
