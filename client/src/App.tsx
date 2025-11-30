import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Landing from "@/pages/Landing";
import About from "@/pages/About";
import Auth from "@/pages/Auth";
import Chat from "@/pages/Chat";
import AdminHost from "@/pages/AdminHost";
import Guest from "@/pages/Guest";
import Pricing from "@/pages/Pricing";
import Subscribe from "@/pages/Subscribe";
import Settings from "@/pages/Settings";
import Analytics from "@/pages/Analytics";
import LegalNotice from "@/pages/LegalNotice";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import CookiePolicy from "@/pages/CookiePolicy";
import FAQ from "@/pages/FAQ";
import HelpCenter from "@/pages/HelpCenter";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/about" component={About} />
      <Route path="/auth" component={Auth} />
      <Route path="/chat" component={Chat} />
      <Route path="/host" component={AdminHost} />
      <Route path="/guest/:accessKey" component={Guest} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/settings" component={Settings} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/legal/legal-notice" component={LegalNotice} />
      <Route path="/legal/terms" component={TermsOfService} />
      <Route path="/legal/privacy" component={PrivacyPolicy} />
      <Route path="/legal/cookies" component={CookiePolicy} />
      <Route path="/faq" component={FAQ} />
      <Route path="/aide" component={HelpCenter} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
