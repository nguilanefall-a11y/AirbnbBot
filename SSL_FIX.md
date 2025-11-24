# Fix SSL Certificate Error

## Problème
Erreur : `self signed certificate in chain` lors de la connexion à l'application

## Solution Appliquée

### 1. Variable d'environnement
Ajout de `NODE_TLS_REJECT_UNAUTHORIZED=0` dans le fichier `.env`

### 2. Configuration dans le code
Ajout dans `server/index.ts` au tout début (avant les imports) :
```typescript
if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
```

## Redémarrer le serveur

Après ces modifications, **redémarrez le serveur** :

```bash
npm run dev
```

## ⚠️ Important

Cette configuration **désactive la vérification SSL en développement uniquement**.

En production, la vérification SSL reste active pour la sécurité.

## Si l'erreur persiste

1. Vérifiez que `NODE_TLS_REJECT_UNAUTHORIZED=0` est bien dans votre `.env`
2. Redémarrez complètement le serveur
3. Videz le cache du navigateur
4. Vérifiez les logs du serveur pour voir d'où vient exactement l'erreur



