import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, User, Bell, Shield, Globe, Trash2, Save, LogOut, ArrowLeft, Plug, Copy, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import Footer from "@/components/Footer";

export default function Settings() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
         // États pour les paramètres
         const [name, setName] = useState(user?.firstName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [language, setLanguage] = useState("fr");
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    marketing: false,
  });
  const [smoobuApiKey, setSmoobuApiKey] = useState("");
  const [smoobuWebhookSecret, setSmoobuWebhookSecret] = useState("");
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [hasSmoobuKey, setHasSmoobuKey] = useState(false);
  
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName?: string; email?: string }) => {
      const res = await apiRequest("PUT", "/api/users/profile", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été mises à jour avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de mettre à jour le profil",
        variant: "destructive",
      });
    },
  });

  const smoobuIntegrationQuery = useQuery({
    queryKey: ["smoobuIntegration"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/integrations/smoobu");
      if (!res.ok) {
        throw new Error("Impossible de charger l'intégration Smoobu");
      }
      return res.json();
    },
  });

  useEffect(() => {
    if (smoobuIntegrationQuery.data) {
      setHasSmoobuKey(Boolean(smoobuIntegrationQuery.data?.hasApiKey));
      const settings = smoobuIntegrationQuery.data?.settings || {};
      setAutoReplyEnabled(settings.autoReply ?? true);
    }
  }, [smoobuIntegrationQuery.data]);

  const connectSmoobuMutation = useMutation({
    mutationFn: async () => {
      if (!hasSmoobuKey && !smoobuApiKey.trim()) {
        throw new Error("Veuillez renseigner la clé API Smoobu");
      }
      const payload: Record<string, any> = {
        settings: { autoReply: autoReplyEnabled },
      };
      if (smoobuApiKey.trim()) {
        payload.apiKey = smoobuApiKey.trim();
      }
      if (smoobuWebhookSecret.trim()) {
        payload.webhookSecret = smoobuWebhookSecret.trim();
      }
      const res = await apiRequest("POST", "/api/integrations/smoobu/connect", payload);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.error || "Impossible de sauvegarder l'intégration");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setHasSmoobuKey(Boolean(data?.hasApiKey));
      setSmoobuApiKey("");
      toast({
        title: "Intégration Smoobu sauvegardée",
        description: "Les réponses automatiques peuvent maintenant être envoyées via Smoobu.",
      });
      smoobuIntegrationQuery.refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de sauvegarder l'intégration",
        variant: "destructive",
      });
    },
  });

  const webhookUrl = useMemo(() => {
    if (typeof window === "undefined" || !user?.id) {
      return "";
    }
    return `${window.location.origin}/api/integrations/smoobu/webhook/${user.id}`;
  }, [user?.id]);

  const copyWebhookUrl = async () => {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast({
        title: "Lien copié",
        description: "URL du webhook Smoobu copiée dans le presse-papiers.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier l'URL. Copiez-la manuellement.",
        variant: "destructive",
      });
    }
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfileMutation.mutateAsync({
        firstName: name !== user?.firstName ? name : undefined,
        email: email !== user?.email ? email : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.")) {
      return;
    }
    
    try {
      const res = await apiRequest("DELETE", "/api/users/account");
      if (res.ok) {
        toast({
          title: "Compte supprimé",
          description: "Votre compte a été supprimé avec succès.",
        });
        logoutMutation.mutate();
        setLocation("/");
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de supprimer le compte",
        variant: "destructive",
      });
    }
  };
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Connexion requise</CardTitle>
            <CardDescription>
              Vous devez être connecté pour accéder aux paramètres.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/auth")}>
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/host")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              <span className="text-xl font-bold">Paramètres</span>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Profil */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <CardTitle>Profil</CardTitle>
              </div>
              <CardDescription>
                Gérez vos informations personnelles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="text-2xl">
                    {user.firstName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm">
                    Changer la photo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    JPG, PNG ou GIF. Max 2MB
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre nom"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Préférences */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                <CardTitle>Préférences</CardTitle>
              </div>
              <CardDescription>
                Personnalisez votre expérience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">Langue</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <Label>Notifications</Label>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Notifications par email</Label>
                    <p className="text-sm text-muted-foreground">
                      Recevez des notifications importantes par email
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={notifications.email}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, email: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-notifications">Notifications push</Label>
                    <p className="text-sm text-muted-foreground">
                      Recevez des notifications en temps réel
                    </p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={notifications.push}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, push: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="marketing-notifications">Notifications marketing</Label>
                    <p className="text-sm text-muted-foreground">
                      Recevez des offres et des nouvelles fonctionnalités
                    </p>
                  </div>
                  <Switch
                    id="marketing-notifications"
                    checked={notifications.marketing}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, marketing: checked })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Sécurité */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <CardTitle>Sécurité</CardTitle>
              </div>
              <CardDescription>
                Gérez votre mot de passe et la sécurité de votre compte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Mot de passe actuel</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="••••••••"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                />
              </div>
              
              <div className="flex justify-end pt-4">
                <Button variant="outline">
                  Changer le mot de passe
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Compte */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                <CardTitle>Compte</CardTitle>
              </div>
              <CardDescription>
                Gestion de votre compte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Se déconnecter</Label>
                  <p className="text-sm text-muted-foreground">
                    Déconnectez-vous de votre compte
                  </p>
                </div>
                <Button variant="outline" onClick={() => logoutMutation.mutate()}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Se déconnecter
                </Button>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-destructive">Supprimer le compte</Label>
                  <p className="text-sm text-muted-foreground">
                    Cette action est irréversible
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer le compte
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Intégrations PMS */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Plug className="w-5 h-5" />
                <CardTitle>Coach IA & Smoobu</CardTitle>
              </div>
              <CardDescription>
                Connectez votre compte Smoobu pour que l’IA réponde automatiquement aux voyageurs Airbnb.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {smoobuIntegrationQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Chargement de l'intégration...
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="smoobu-api-key">Clé API Smoobu</Label>
                    <Input
                      id="smoobu-api-key"
                      type="password"
                      placeholder={hasSmoobuKey ? "•••••••• (déjà configurée)" : "Ex: sk_live_xxx"}
                      value={smoobuApiKey}
                      onChange={(e) => setSmoobuApiKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Vous la trouvez dans Smoobu → Settings → API. Collez-la pour activer l'envoi automatique.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smoobu-webhook-secret">Secret Webhook (optionnel)</Label>
                    <Input
                      id="smoobu-webhook-secret"
                      type="password"
                      placeholder="Chaîne secrète pour sécuriser le webhook"
                      value={smoobuWebhookSecret}
                      onChange={(e) => setSmoobuWebhookSecret(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Définissez un secret identique côté Smoobu pour vérifier chaque webhook.
                    </p>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Réponses automatiques</Label>
                      <p className="text-sm text-muted-foreground">
                        L’IA répond automatiquement et vous pouvez intervenir depuis votre mobile.
                      </p>
                    </div>
                    <Switch checked={autoReplyEnabled} onCheckedChange={setAutoReplyEnabled} />
                  </div>

                  <div className="space-y-2">
                    <Label>URL du webhook Smoobu</Label>
                    <div className="flex items-center gap-2">
                      <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                      <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Collez cette URL dans Smoobu → Messaging → Webhooks pour recevoir les messages Airbnb.
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => connectSmoobuMutation.mutate()}
                    disabled={connectSmoobuMutation.isPending}
                  >
                    {connectSmoobuMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sauvegarder l’intégration
                  </Button>

                  <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                    💡 Une fois connecté, votre coach IA traitera les nouveaux messages Airbnb récupérés via Smoobu.
                    Depuis mobile, ouvrez simplement cette interface : la boîte de réception est responsive et vous
                    pouvez prendre la main à tout moment.
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}

