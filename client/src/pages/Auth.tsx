import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Loader2, ArrowLeft, Sparkles, Home, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, loginSchema } from "@shared/schema";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearch } from "wouter";
import waveBackground from "@assets/image_1764527682604.png";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const { user, loginMutation, registerMutation } = useAuth();
  
  // Récupérer le rôle depuis l'URL (?role=cleaning_agent)
  const searchString = useSearch();
  const isCleaningAgent = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return params.get("role") === "cleaning_agent";
  }, [searchString]);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", firstName: "", lastName: "" },
  });

  // Redirection selon le rôle de l'utilisateur
  useEffect(() => {
    if (user) {
      // @ts-ignore - role est défini dans le schéma
      if (user.role === "cleaning_agent") {
        window.location.href = "/cleaner-dashboard";
      } else {
        window.location.href = "/host";
      }
    }
  }, [user]);

  const onLogin = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: z.infer<typeof registerSchema>) => {
    // Inclure le rôle basé sur l'URL
    const role = isCleaningAgent ? "cleaning_agent" : "host";
    registerMutation.mutate({ ...data, role } as any);
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Minimalist wave background */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url(${waveBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.35
        }}
      />
      <motion.div 
        className="flex-1 flex flex-col p-8 relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/">
            <Button variant="ghost" className="mb-4 gap-2" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
              Retour à l'accueil
            </Button>
          </Link>
        </motion.div>

        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Card className="w-full max-w-md shadow-xl bg-background/80 backdrop-blur-xl border-border/50">
            <CardHeader className="space-y-1">
              <motion.div 
                className="flex flex-col items-center gap-3 mb-4"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                {/* Badge indicateur du type de compte */}
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${isCleaningAgent ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-primary/10 text-primary'}`}
                >
                  {isCleaningAgent ? (
                    <>
                      <Sparkles className="w-3 h-3 mr-1" />
                      Espace Agent de Ménage
                    </>
                  ) : (
                    <>
                      <Home className="w-3 h-3 mr-1" />
                      Espace Hôte
                    </>
                  )}
                </Badge>
                
                <div className="flex items-center gap-2">
                  <motion.div 
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${isCleaningAgent ? 'bg-emerald-500' : 'bg-primary'}`}
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    {isCleaningAgent ? (
                      <Sparkles className="w-6 h-6 text-white" />
                    ) : (
                      <MessageSquare className="w-6 h-6 text-primary-foreground" />
                    )}
                  </motion.div>
                  <span className="text-2xl font-bold bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {isCleaningAgent ? "Ménage Pro" : "Assistant Airbnb IA"}
                  </span>
                </div>
              </motion.div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={isLogin ? "login" : "register"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <CardTitle className="text-2xl text-center">
                    {isLogin ? "Connexion" : "Créer un compte"}
                  </CardTitle>
                  <CardDescription className="text-center">
                    {isLogin
                      ? "Connectez-vous à votre compte"
                      : "Commencez votre essai gratuit de 7 jours"}
                  </CardDescription>
                </motion.div>
              </AnimatePresence>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                {isLogin ? (
              <motion.form 
                key="login-form"
                onSubmit={loginForm.handleSubmit(onLogin)} 
                className="space-y-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    {...loginForm.register("email")}
                    data-testid="input-email"
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    {...loginForm.register("password")}
                    data-testid="input-password"
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-login-submit"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    "Se connecter"
                  )}
                </Button>
              </motion.form>
            ) : (
              <motion.form 
                key="register-form"
                onSubmit={registerForm.handleSubmit(onRegister)} 
                className="space-y-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      {...registerForm.register("firstName")}
                      data-testid="input-firstname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      {...registerForm.register("lastName")}
                      data-testid="input-lastname"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="votre@email.com"
                    {...registerForm.register("email")}
                    data-testid="input-register-email"
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Mot de passe</Label>
                  <Input
                    id="register-password"
                    type="password"
                    {...registerForm.register("password")}
                    data-testid="input-register-password"
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                
                {/* Indicateur du type de compte */}
                <div className={`p-3 rounded-lg border-2 ${isCleaningAgent ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800' : 'bg-primary/5 border-primary/20'}`}>
                  <div className="flex items-center gap-2">
                    {isCleaningAgent ? (
                      <>
                        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Compte Agent de Ménage</span>
                      </>
                    ) : (
                      <>
                        <Home className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Compte Hôte</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isCleaningAgent 
                      ? "Vous pourrez voir les calendriers partagés par vos hôtes" 
                      : "Vous pourrez gérer vos propriétés et créer des agents"}
                  </p>
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerMutation.isPending}
                  data-testid="button-register-submit"
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Inscription...
                    </>
                  ) : (
                    "Créer mon compte"
                  )}
                </Button>
              </motion.form>
            )}
              </AnimatePresence>

            <motion.div 
              className="mt-4 text-center text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {isLogin ? (
                <>
                  Pas encore de compte?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => setIsLogin(false)}
                    data-testid="button-switch-register"
                  >
                    Créer un compte
                  </button>
                </>
              ) : (
                <>
                  Déjà un compte?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => setIsLogin(true)}
                    data-testid="button-switch-login"
                  >
                    Se connecter
                  </button>
                </>
              )}
            </motion.div>
          </CardContent>
        </Card>
          </motion.div>
        </div>
      </motion.div>

      <div className={`hidden lg:flex lg:flex-1 p-12 items-center justify-center relative z-10 ${isCleaningAgent ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5' : 'bg-gradient-to-br from-primary/20 to-primary/5'}`}>
        <div className="max-w-md space-y-6">
          {isCleaningAgent ? (
            <>
              <h2 className="text-4xl font-medium bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
                Espace Agent de Ménage
              </h2>
              <p className="text-lg text-muted-foreground">
                Gérez vos tâches de ménage et communiquez avec vos hôtes efficacement.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-sm">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold">Calendrier synchronisé</p>
                    <p className="text-sm text-muted-foreground">
                      Voyez tous vos ménages prévus
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-sm">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold">Signaler des problèmes</p>
                    <p className="text-sm text-muted-foreground">
                      Notifiez les hôtes des anomalies
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-sm">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold">Accès mobile</p>
                    <p className="text-sm text-muted-foreground">
                      Application responsive sur tous les appareils
                    </p>
                  </div>
                </li>
              </ul>
            </>
          ) : (
            <>
              <h2 className="text-4xl font-medium bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
                Assistant IA pour hôtes Airbnb
              </h2>
              <p className="text-lg text-muted-foreground">
                Automatisez vos communications avec vos voyageurs grâce à l'intelligence artificielle.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5 text-primary-foreground text-sm">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold">Essai gratuit 7 jours</p>
                    <p className="text-sm text-muted-foreground">
                      Sans carte bancaire requise
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5 text-primary-foreground text-sm">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold">29,90€ par propriété/mois</p>
                    <p className="text-sm text-muted-foreground">
                      Tarification simple et transparente
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5 text-primary-foreground text-sm">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold">Réponses instantanées 24/7</p>
                    <p className="text-sm text-muted-foreground">
                      L'IA répond à vos voyageurs automatiquement
                    </p>
                  </div>
                </li>
              </ul>
            </>
          )}
          
          {/* Lien pour changer de type de compte */}
          <div className="pt-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground mb-2">
              {isCleaningAgent ? "Vous êtes un hôte ?" : "Vous êtes un agent de ménage ?"}
            </p>
            <Link href={isCleaningAgent ? "/auth" : "/auth?role=cleaning_agent"}>
              <Button variant="outline" size="sm" className="gap-2">
                {isCleaningAgent ? <Home className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                {isCleaningAgent ? "Espace Hôte" : "Espace Agent de Ménage"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
