# 🚀 Guide d'import vers Replit

## ✅ Méthode la plus simple : Git sur Replit

### Sur Replit :
1. Ouvrez le terminal dans Replit
2. Exécutez ces commandes :

```bash
# Vérifiez que vous êtes sur la bonne branche
git status

# Si vous avez un remote Git configuré, faites :
git pull origin main

# OU si vous avez accès au dépôt gitsafe-backup :
git pull gitsafe-backup main
```

Si ça ne marche pas, utilisez la méthode manuelle ci-dessous.

---

## 📋 Méthode manuelle : Copier les fichiers

### Étape 1 : Créer les nouveaux fichiers sur Replit

#### 1. Créez `server/airbnb-scraper.ts`
- Cliquez sur "New file" dans Replit
- Nommez-le : `server/airbnb-scraper.ts`
- Copiez tout le contenu du fichier (voir ci-dessous)

#### 2. Créez `server/db-storage.ts`
- Nouveau fichier : `server/db-storage.ts`
- Copiez tout le contenu

#### 3. Créez `start.sh`
- Nouveau fichier : `start.sh`
- Copiez le contenu

### Étape 2 : Modifier les fichiers existants

#### `package.json`
Ajoutez dans `"dependencies"` :
```json
"dotenv": "^16.4.5"
```

Ajoutez dans `"scripts"` :
```json
"dev:watch": "NODE_ENV=development tsx watch server/index.ts",
"auto": "npm run dev:watch"
```

#### `server/index.ts`
Ajoutez au **tout début** du fichier (ligne 1) :
```typescript
// Load environment variables from .env file
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(import.meta.dirname, "..", ".env") });
```

#### `server/routes.ts`
1. Ajoutez cet import en haut :
```typescript
import { analyzeAirbnbListing } from "./airbnb-scraper";
```

2. Ajoutez cette route (après les autres routes) :
```typescript
// Import Airbnb property
app.post("/api/properties/import-airbnb", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { airbnbUrl } = req.body;

    if (!airbnbUrl || typeof airbnbUrl !== "string") {
      return res.status(400).json({ error: "URL Airbnb requise" });
    }

    // Validate URL format
    if (!airbnbUrl.includes("airbnb.com") && !airbnbUrl.includes("airbnb.fr")) {
      return res.status(400).json({ error: "URL Airbnb invalide" });
    }

    // Analyze the Airbnb listing
    const propertyData = await analyzeAirbnbListing(airbnbUrl);

    // Create the property
    const property = await storage.createProperty(propertyData, userId);

    res.status(201).json(property);
  } catch (error: any) {
    if (error.message && error.message.includes("Non authentifié")) {
      return res.status(401).json({ 
        error: "Vous devez être connecté pour importer une propriété",
        message: "Veuillez vous connecter avant d'importer une propriété Airbnb"
      });
    }
    res.status(400).json({ 
      error: error.message || "Impossible d'importer la propriété depuis Airbnb" 
    });
  }
});
```

#### `server/storage.ts`
Remplacez la dernière ligne :
```typescript
export const storage = new MemStorage();
```

Par :
```typescript
// Use database storage if DATABASE_URL is configured, otherwise use in-memory storage
function createStorage(): IStorage {
  if (process.env.DATABASE_URL) {
    try {
      // Dynamic import to avoid errors if database module fails
      const { DatabaseStorage } = require("./db-storage");
      const dbStorage = new DatabaseStorage();
      console.log("✅ Using PostgreSQL database storage");
      return dbStorage;
    } catch (error) {
      console.warn("⚠️  Failed to initialize database storage, falling back to in-memory storage:", error);
      return new MemStorage();
    }
  } else {
    console.warn("⚠️  DATABASE_URL not configured, using in-memory storage (data will be lost on restart)");
    return new MemStorage();
  }
}

export const storage = createStorage();
```

#### `server/db.ts`
Remplacez tout le contenu par :
```typescript
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
    console.log("✅ Database connection initialized");
  } catch (error) {
    console.error("⚠️  Failed to initialize database:", error);
  }
} else {
  console.warn("⚠️  DATABASE_URL not set, database features disabled");
}

export { pool, db };
```

#### `client/src/pages/AdminHost.tsx`
Ajoutez ces imports :
```typescript
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Sparkles, Loader2, ExternalLink } from "lucide-react";
```

Ajoutez ces états (après les autres useState) :
```typescript
const [showImportDialog, setShowImportDialog] = useState(false);
const [airbnbUrl, setAirbnbUrl] = useState("");
const [isImporting, setIsImporting] = useState(false);
```

Ajoutez cette mutation (après updateMutation) :
```typescript
const importAirbnbMutation = useMutation({
  mutationFn: async (url: string) => {
    if (!user) {
      throw new Error("Vous devez être connecté pour importer une propriété");
    }
    setIsImporting(true);
    const res = await apiRequest("POST", "/api/properties/import-airbnb", { airbnbUrl: url });
    return await res.json();
  },
  onSuccess: (property) => {
    queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
    setSelectedProperty(property);
    setShowImportDialog(false);
    setAirbnbUrl("");
    setIsImporting(false);
    toast({
      title: "Propriété importée !",
      description: "Les informations ont été extraites depuis Airbnb. Vous pouvez les modifier si nécessaire.",
    });
  },
  onError: (error: any) => {
    setIsImporting(false);
    let errorMessage = "Impossible d'importer la propriété";
    if (error.message) {
      errorMessage = error.message;
    }
    toast({
      title: "Erreur d'import",
      description: errorMessage,
      variant: "destructive",
    });
  },
});
```

Ajoutez cette fonction :
```typescript
const handleImportAirbnb = () => {
  if (!airbnbUrl.trim()) {
    toast({
      title: "URL requise",
      description: "Veuillez entrer un lien Airbnb",
      variant: "destructive",
    });
    return;
  }
  importAirbnbMutation.mutate(airbnbUrl.trim());
};
```

Dans le JSX, ajoutez le bouton "Importer" dans la sidebar (après le bouton "Nouvelle propriété") :
```tsx
<Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
  <DialogTrigger asChild>
    <Button size="sm" className="gap-2">
      <Plus className="w-4 h-4" />
      Importer
    </Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Sparkles className="w-5 h-5" />
        Importer depuis Airbnb
      </DialogTitle>
      <DialogDescription>
        Collez le lien de votre annonce Airbnb et l'IA extraira automatiquement toutes les informations
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4 py-4">
      <div>
        <Label htmlFor="airbnb-url">Lien Airbnb</Label>
        <Input
          id="airbnb-url"
          placeholder="https://www.airbnb.com/rooms/..."
          value={airbnbUrl}
          onChange={(e) => setAirbnbUrl(e.target.value)}
          disabled={isImporting}
        />
      </div>
      <Button
        onClick={handleImportAirbnb}
        disabled={isImporting || !airbnbUrl.trim()}
        className="w-full"
      >
        {isImporting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyse en cours...
          </>
        ) : (
          <>
            <ExternalLink className="w-4 h-4 mr-2" />
            Importer la propriété
          </>
        )}
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

### Étape 3 : Configurer les variables d'environnement

Sur Replit :
1. Cliquez sur l'icône **🔒 Secrets** (dans la barre latérale gauche)
2. Ajoutez ces variables :
   - **Key**: `GEMINI_API_KEY` → **Value**: `AIzaSyCNNOe-Z4i1sz-UvhC3aqZ1noN2X4DHPa0`
   - **Key**: `DATABASE_URL` → **Value**: (optionnel, laissez vide si vous n'avez pas de base)
   - **Key**: `SESSION_SECRET` → **Value**: (générez une chaîne aléatoire)

### Étape 4 : Installer et redémarrer

Dans le terminal Replit :
```bash
npm install
```

Puis redémarrez le serveur Replit.

---

## ✅ Vérification

1. Ouvrez `/host` dans votre navigateur
2. Vous devriez voir un bouton **"Importer"** à côté de "Nouvelle propriété"
3. Cliquez dessus et testez avec un lien Airbnb

---

## 📝 Notes importantes

- ⚠️ **Ne copiez JAMAIS** le fichier `.env` dans Git
- ✅ Les Secrets Replit remplacent les variables d'environnement
- ✅ Si vous utilisez une base de données, ajoutez `DATABASE_URL` dans Secrets

