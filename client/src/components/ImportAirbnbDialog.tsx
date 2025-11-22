import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, Sparkles } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (property: any) => void;
};

export function ImportAirbnbDialog({ open, onOpenChange, onImported }: Props) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [airbnbUrl, setAirbnbUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [rawText, setRawText] = useState("");

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
      onOpenChange(false);
      setAirbnbUrl("");
      setIsImporting(false);
      toast({
        title: "Propriété importée !",
        description: "Les informations ont été extraites depuis Airbnb.",
      });
      onImported?.(property);
    },
    onError: (error: any) => {
      setIsImporting(false);
      let errorMessage = error?.message || "Impossible d'importer la propriété";
      if (errorMessage.includes("401") || errorMessage.includes("connecté") || errorMessage.includes("authentifi")) {
        toast({
          title: "Connexion requise",
          description: "Veuillez vous connecter pour importer une propriété.",
          variant: "destructive",
        });
        setTimeout(() => setLocation("/auth"), 1200);
        return;
      }
      toast({ title: "Erreur d'import", description: errorMessage, variant: "destructive" });
    },
  });

  const importFromTextMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user) {
        throw new Error("Vous devez être connecté pour importer une propriété");
      }
      setIsImporting(true);
      const res = await apiRequest("POST", "/api/properties/import-airbnb-text", { rawText: text });
      return await res.json();
    },
    onSuccess: (property) => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      onOpenChange(false);
      setAirbnbUrl("");
      setRawText("");
      setIsImporting(false);
      toast({ title: "Propriété importée !", description: "Analyse depuis texte réussie." });
      onImported?.(property);
    },
    onError: (error: any) => {
      setIsImporting(false);
      toast({ title: "Erreur d'import (texte)", description: error?.message || "Impossible d'importer", variant: "destructive" });
    },
  });

  const handleImport = () => {
    if (!airbnbUrl.trim()) {
      toast({ title: "URL requise", description: "Veuillez entrer un lien Airbnb", variant: "destructive" });
      return;
    }
    importAirbnbMutation.mutate(airbnbUrl.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Importer depuis Airbnb
          </DialogTitle>
          <DialogDescription>
            Plusieurs méthodes pour importer votre propriété Airbnb :
            <ol className="list-decimal ml-5 mt-2 space-y-1 text-sm">
              <li><strong>Méthode automatique (recommandée) :</strong> Collez simplement le lien de votre annonce Airbnb</li>
              <li><strong>Méthode manuelle :</strong> Si le lien ne fonctionne pas, copiez le texte visible de la page Airbnb dans le champ ci-dessous</li>
            </ol>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="airbnb-url">Lien Airbnb</Label>
            <Input
              id="airbnb-url"
              placeholder="https://www.airbnb.com/rooms/..."
              value={airbnbUrl}
              onChange={(e) => setAirbnbUrl(e.target.value)}
              disabled={isImporting}
            />
            <p className="text-xs text-muted-foreground mt-2">Exemple: https://www.airbnb.com/rooms/12345678</p>
          </div>
          <div className="border-t pt-4">
            <Label htmlFor="airbnb-raw">Méthode manuelle (si le lien ne fonctionne pas)</Label>
            <Textarea
              id="airbnb-raw"
              rows={6}
              placeholder="Instructions : 1) Ouvrez votre annonce Airbnb dans votre navigateur, 2) Sélectionnez tout le texte de la page (Cmd+A ou Ctrl+A), 3) Copiez (Cmd+C ou Ctrl+C), 4) Collez ici (Cmd+V ou Ctrl+V)"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              disabled={isImporting}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              💡 Astuce : Vous pouvez aussi faire un clic droit sur la page → "Afficher le code source" puis copier tout le contenu HTML
            </p>
          </div>
          <Button onClick={handleImport} disabled={isImporting || !airbnbUrl.trim()} className="w-full">
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
          <Button
            onClick={() => importFromTextMutation.mutate(rawText.trim())}
            disabled={isImporting || !rawText.trim()}
            variant="outline"
            className="w-full"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyse texte...
              </>
            ) : (
              <>Importer depuis le texte</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


