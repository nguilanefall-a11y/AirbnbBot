import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Copy, CheckCircle2, Home, MessageSquare, Link as LinkIcon, LogOut, Download, Sparkles, DollarSign, MapPin, User as UserIcon, Clock, Wifi, Shield, Info, Utensils, Thermometer, BarChart3 } from "lucide-react";
import type { Property, InsertProperty, User } from "@shared/schema";
import { Link, useLocation } from "wouter";
import ThemeToggle from "@/components/ThemeToggle";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings as SettingsIcon } from "lucide-react";
import Footer from "@/components/Footer";

export default function AdminHost() {
  const { toast } = useToast();
  const { logoutMutation } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertProperty>>({});
  const [airbnbUrl, setAirbnbUrl] = useState("");
  const [amenityInput, setAmenityInput] = useState("");
  const [importedFields, setImportedFields] = useState<Set<string>>(new Set());
  const [lastImportedAt, setLastImportedAt] = useState<Date | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<InsertProperty> }) => {
      const res = await apiRequest("PATCH", `/api/properties/${data.id}`, data.updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Sauvegardé",
        description: "Les modifications ont été enregistrées",
      });
    },
  });

  const importAirbnbMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest("POST", "/api/properties/import-airbnb", { airbnbUrl: url });
      return await res.json();
    },
    onSuccess: (data) => {
      // Auto-fill form with imported data
      if (selectedProperty) {
        const updates = { ...data, lastImportedAt: new Date().toISOString() as any };
        setFormData(prev => ({ ...prev, ...updates }));
        updateMutation.mutate({ id: selectedProperty.id, updates });
      } else if (data && data.id) {
        const updates = { ...data, lastImportedAt: new Date().toISOString() as any };
        setSelectedProperty(updates as any);
        setFormData({ ...updates });
      }

      // Mark imported fields
      const keys = Object.keys(data || {}).filter(k => data[k] !== undefined && data[k] !== null && data[k] !== "");
      setImportedFields(new Set(keys));

      // Track timestamp
      setLastImportedAt(new Date());
      
      setIsImportDialogOpen(false);
      setAirbnbUrl("");
      toast({
        title: "Import réussi !",
        description: "Les informations ont été importées et sauvegardées automatiquement",
      });
    },
    onError: (error: any) => {
      // Extract backend error message from ApiError
      const errorMessage = error?.body?.error || error?.message || "Impossible d'importer depuis Airbnb";
      
      toast({
        title: "Erreur d'import",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (properties && properties.length > 0 && !selectedProperty) {
      setSelectedProperty(properties[0]);
    }
  }, [properties, selectedProperty]);

  useEffect(() => {
    if (selectedProperty) {
      setFormData({
        name: selectedProperty.name,
        description: selectedProperty.description,
        address: selectedProperty.address,
        floor: selectedProperty.floor || "",
        doorCode: selectedProperty.doorCode || "",
        accessInstructions: selectedProperty.accessInstructions || "",
        checkInTime: selectedProperty.checkInTime,
        checkOutTime: selectedProperty.checkOutTime,
        checkInProcedure: selectedProperty.checkInProcedure || "",
        checkOutProcedure: selectedProperty.checkOutProcedure || "",
        keyLocation: selectedProperty.keyLocation || "",
        wifiName: selectedProperty.wifiName || "",
        wifiPassword: selectedProperty.wifiPassword || "",
        amenities: selectedProperty.amenities,
        kitchenEquipment: selectedProperty.kitchenEquipment || "",
        houseRules: selectedProperty.houseRules,
        maxGuests: selectedProperty.maxGuests || "",
        petsAllowed: selectedProperty.petsAllowed,
        smokingAllowed: selectedProperty.smokingAllowed,
        partiesAllowed: selectedProperty.partiesAllowed,
        parkingInfo: selectedProperty.parkingInfo || "",
        publicTransport: selectedProperty.publicTransport || "",
        nearbyShops: selectedProperty.nearbyShops || "",
        restaurants: selectedProperty.restaurants || "",
        hostName: selectedProperty.hostName,
        hostPhone: selectedProperty.hostPhone || "",
        emergencyContact: selectedProperty.emergencyContact || "",
        heatingInstructions: selectedProperty.heatingInstructions || "",
        garbageInstructions: selectedProperty.garbageInstructions || "",
        applianceInstructions: selectedProperty.applianceInstructions || "",
        additionalInfo: selectedProperty.additionalInfo || "",
        faqs: selectedProperty.faqs || "",
      });
      // Reset imported markers when switching properties
      setImportedFields(new Set());
      setLastImportedAt(null);
    }
  }, [selectedProperty]);

  const handleAutoSave = (field: keyof InsertProperty, value: any) => {
    if (!selectedProperty) return;
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    updateMutation.mutate({
      id: selectedProperty.id,
      updates: { [field]: value }
    });
  };

  const renderLabel = (text: string, keyName: keyof InsertProperty) => (
    <div className="flex items-center gap-2">
      <Label htmlFor={String(keyName)}>{text}</Label>
      {importedFields.has(String(keyName)) && (
        <Badge variant="secondary" className="text-[10px]">Importé</Badge>
      )}
    </div>
  );

  const addAmenity = () => {
    const val = amenityInput.trim();
    if (!val) return;
    const next = Array.from(new Set([...(formData.amenities || []), val]));
    setFormData(prev => ({ ...prev, amenities: next }));
    setAmenityInput("");
    handleAutoSave("amenities", next);
  };

  const removeAmenity = (item: string) => {
    const next = (formData.amenities || []).filter(a => a !== item);
    setFormData(prev => ({ ...prev, amenities: next }));
    handleAutoSave("amenities", next);
  };

  const copyGuestLink = () => {
    if (!selectedProperty) return;
    const link = `${window.location.origin}/guest/${selectedProperty.accessKey}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Lien copié!",
      description: "Partagez ce lien avec vos voyageurs",
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <motion.header 
        className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur"
        initial={{ y: -64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <motion.div 
            className="flex items-center gap-2"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Home className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Espace Hôte</span>
          </motion.div>
          
          <motion.nav 
            className="hidden md:flex items-center gap-1"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <Button variant="ghost" size="sm" asChild data-testid="link-home">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Accueil
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild data-testid="link-pricing">
              <Link href="/pricing">
                <DollarSign className="w-4 h-4 mr-2" />
                Tarifs
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild data-testid="button-chat">
              <Link href="/chat">
                <MessageSquare className="w-4 h-4 mr-2" />
                Conversations
              </Link>
            </Button>
          </motion.nav>

          <motion.div 
            className="flex items-center gap-3"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <ThemeToggle />
            {lastImportedAt && (
              <Badge variant="outline" className="hidden md:inline-flex">
                Importé le {lastImportedAt.toLocaleDateString()} à {lastImportedAt.toLocaleTimeString()}
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsImportDialogOpen(true)}
              data-testid="button-import"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Importer depuis Airbnb
            </Button>
            {currentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="focus:outline-none">
                    <Avatar className="w-9 h-9 cursor-pointer hover:ring-2 ring-primary transition-all" data-testid="avatar-user">
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {currentUser.firstName?.charAt(0).toUpperCase() || currentUser.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                             <p className="text-sm font-medium leading-none">
                               {currentUser.firstName || currentUser.email}
                             </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {currentUser.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/analytics">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Analytics
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/settings">
                      <SettingsIcon className="w-4 h-4 mr-2" />
                      Paramètres
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </motion.div>
        </div>
      </motion.header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <motion.div 
            className="lg:col-span-1"
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Vos Propriétés</h2>
              <div className="mb-3">
                <Button
                  variant="default"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    // Minimal create: will fill name/address later
                    const payload: Partial<InsertProperty> = {
                      name: "Nouvelle Propriété",
                      description: "Description à compléter",
                      address: "Adresse à compléter",
                      checkInTime: "15:00",
                      checkOutTime: "11:00",
                      houseRules: "",
                      hostName: currentUser?.firstName || "Hôte",
                      amenities: [],
                    } as any;
                    apiRequest("POST", "/api/properties", payload)
                      .then(r => r.json())
                      .then((p) => {
                        queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
                        setSelectedProperty(p);
                        setFormData({
                          name: p.name,
                          description: p.description,
                          address: p.address,
                          checkInTime: p.checkInTime,
                          checkOutTime: p.checkOutTime,
                          houseRules: p.houseRules,
                          hostName: p.hostName,
                          amenities: p.amenities || [],
                        });
                        toast({ title: "Propriété créée", description: "Vous pouvez compléter les informations" });
                      })
                      .catch((e) => {
                        toast({ title: "Erreur", description: e?.message || "Création impossible", variant: "destructive" });
                      });
                  }}
                >
                  + Ajouter une propriété
                </Button>
              </div>
              <div className="space-y-2">
                {properties?.map((property, index) => (
                  <motion.button
                    key={property.id}
                    onClick={() => setSelectedProperty(property)}
                    className={`w-full text-left p-3 rounded-lg hover-elevate transition-all ${
                      selectedProperty?.id === property.id ? "bg-primary text-primary-foreground" : ""
                    }`}
                    data-testid={`button-property-${property.id}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1, duration: 0.3 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                  <div className="font-medium">{property.name}</div>
                    <div className="text-sm opacity-75">{property.address}</div>
                  </motion.button>
                ))}
              </div>

              {selectedProperty && (
                <div className="mt-4 pt-4 border-t">
                  <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full gap-2"
                        data-testid="button-open-import-dialog"
                      >
                        <Sparkles className="w-4 h-4" />
                        Importer depuis Airbnb
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Download className="w-5 h-5" />
                          Importer depuis Airbnb
                        </DialogTitle>
                        <DialogDescription>
                          Collez le lien de votre annonce Airbnb. Notre IA analysera automatiquement les informations et remplira les champs de votre propriété.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="airbnb-url">Lien Airbnb</Label>
                          <Input
                            id="airbnb-url"
                            placeholder="https://www.airbnb.fr/rooms/..."
                            value={airbnbUrl}
                            onChange={(e) => setAirbnbUrl(e.target.value)}
                            data-testid="input-airbnb-url"
                            className="mt-2"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Exemple : https://www.airbnb.fr/rooms/12345678
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsImportDialogOpen(false);
                              setAirbnbUrl("");
                            }}
                            className="flex-1"
                            data-testid="button-cancel-import"
                          >
                            Annuler
                          </Button>
                          <Button
                            onClick={() => importAirbnbMutation.mutate(airbnbUrl)}
                            disabled={!airbnbUrl.trim() || importAirbnbMutation.isPending}
                            className="flex-1 gap-2"
                            data-testid="button-import-airbnb"
                          >
                            {importAirbnbMutation.isPending ? (
                              <>
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                  <Sparkles className="w-4 h-4" />
                                </motion.div>
                                Analyse en cours...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Importer
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </Card>

            <AnimatePresence mode="wait">
              {selectedProperty && (
                <motion.div
                  key={selectedProperty.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="p-6 mt-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      Lien Voyageur
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Partagez ce lien avec vos voyageurs pour qu'ils puissent poser des questions
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={copyGuestLink}
                      data-testid="button-copy-link"
                    >
                      {copied ? (
                        <motion.div
                          className="flex items-center"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Copié!
                        </motion.div>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copier le lien
                        </>
                      )}
                    </Button>
                    <div className="mt-2 p-2 bg-muted rounded text-xs font-mono break-all">
                      {window.location.origin}/guest/{selectedProperty.accessKey}
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div 
            className="lg:col-span-3"
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {selectedProperty ? (
              <Tabs defaultValue="tableau" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="tableau">Tableau</TabsTrigger>
                  <TabsTrigger value="general">Général</TabsTrigger>
                  <TabsTrigger value="checkin">Check-in/out</TabsTrigger>
                  <TabsTrigger value="amenities">Équipements</TabsTrigger>
                  <TabsTrigger value="rules">Règles</TabsTrigger>
                  <TabsTrigger value="info">Infos Utiles</TabsTrigger>
                </TabsList>

                <TabsContent value="tableau" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <Card className="p-4">
                      {renderLabel("Adresse", "address")}
                      <Input
                        id="address"
                        className="mt-2"
                        value={formData.address || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        onBlur={(e) => handleAutoSave("address", e.target.value)}
                      />
                    </Card>

                    <Card className="p-4">
                      {renderLabel("Code porte", "doorCode")}
                      <Input
                        id="doorCode"
                        className="mt-2"
                        value={formData.doorCode || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, doorCode: e.target.value }))}
                        onBlur={(e) => handleAutoSave("doorCode", e.target.value)}
                      />
                    </Card>

                    <Card className="p-4">
                      {renderLabel("Étage", "floor")}
                      <Input
                        id="floor"
                        className="mt-2"
                        value={formData.floor || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, floor: e.target.value }))}
                        onBlur={(e) => handleAutoSave("floor", e.target.value)}
                      />
                    </Card>

                    <Card className="p-4">
                      {renderLabel("Heure d'arrivée", "checkInTime")}
                      <Input
                        id="checkInTime"
                        type="time"
                        className="mt-2"
                        value={formData.checkInTime || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, checkInTime: e.target.value }))}
                        onBlur={(e) => handleAutoSave("checkInTime", e.target.value)}
                      />
                    </Card>

                    <Card className="p-4">
                      {renderLabel("Heure de départ", "checkOutTime")}
                      <Input
                        id="checkOutTime"
                        type="time"
                        className="mt-2"
                        value={formData.checkOutTime || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, checkOutTime: e.target.value }))}
                        onBlur={(e) => handleAutoSave("checkOutTime", e.target.value)}
                      />
                    </Card>

                    <Card className="p-4">
                      {renderLabel("Voyageurs max", "maxGuests")}
                      <Input
                        id="maxGuests"
                        className="mt-2"
                        value={formData.maxGuests || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxGuests: e.target.value }))}
                        onBlur={(e) => handleAutoSave("maxGuests", e.target.value)}
                      />
                    </Card>

                    <Card className="p-4">
                      {renderLabel("Nom WiFi", "wifiName")}
                      <Input
                        id="wifiName"
                        className="mt-2"
                        value={formData.wifiName || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, wifiName: e.target.value }))}
                        onBlur={(e) => handleAutoSave("wifiName", e.target.value)}
                      />
                    </Card>

                    <Card className="p-4">
                      {renderLabel("Mot de passe WiFi", "wifiPassword")}
                      <Input
                        id="wifiPassword"
                        className="mt-2"
                        value={formData.wifiPassword || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, wifiPassword: e.target.value }))}
                        onBlur={(e) => handleAutoSave("wifiPassword", e.target.value)}
                      />
                    </Card>

                    <Card className="p-4 md:col-span-2 xl:col-span-3">
                      {renderLabel("Instructions d'accès", "accessInstructions")}
                      <Textarea
                        id="accessInstructions"
                        rows={3}
                        className="mt-2"
                        value={formData.accessInstructions || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, accessInstructions: e.target.value }))}
                        onBlur={(e) => handleAutoSave("accessInstructions", e.target.value)}
                      />
                    </Card>

                    <Card className="p-4">
                      {renderLabel("Emplacement des clés", "keyLocation")}
                      <Input
                        id="keyLocation"
                        className="mt-2"
                        value={formData.keyLocation || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, keyLocation: e.target.value }))}
                        onBlur={(e) => handleAutoSave("keyLocation", e.target.value)}
                      />
                    </Card>

                    <Card className="p-4">
                      {renderLabel("Téléphone hôte", "hostPhone")}
                      <Input
                        id="hostPhone"
                        className="mt-2"
                        value={formData.hostPhone || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, hostPhone: e.target.value }))}
                        onBlur={(e) => handleAutoSave("hostPhone", e.target.value)}
                      />
                    </Card>

                    <Card className="p-4">
                      {renderLabel("Contact d'urgence", "emergencyContact")}
                      <Input
                        id="emergencyContact"
                        className="mt-2"
                        value={formData.emergencyContact || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                        onBlur={(e) => handleAutoSave("emergencyContact", e.target.value)}
                      />
                    </Card>

                    <Card className="p-4">
                      {renderLabel("Parking", "parkingInfo")}
                      <Textarea
                        id="parkingInfo"
                        rows={2}
                        className="mt-2"
                        value={formData.parkingInfo || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, parkingInfo: e.target.value }))}
                        onBlur={(e) => handleAutoSave("parkingInfo", e.target.value)}
                      />
                    </Card>

                    <Card className="p-4">
                      {renderLabel("Transports", "publicTransport")}
                      <Textarea
                        id="publicTransport"
                        rows={2}
                        className="mt-2"
                        value={formData.publicTransport || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, publicTransport: e.target.value }))}
                        onBlur={(e) => handleAutoSave("publicTransport", e.target.value)}
                      />
                    </Card>

                    <Card className="p-4 md:col-span-2 xl:col-span-3">
                      {renderLabel("Règles de la maison", "houseRules")}
                      <Textarea
                        id="houseRules"
                        rows={4}
                        className="mt-2"
                        placeholder="Règles importantes pour vos voyageurs"
                        value={formData.houseRules || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, houseRules: e.target.value }))}
                        onBlur={(e) => handleAutoSave("houseRules", e.target.value)}
                      />
                    </Card>

                    <Card className="p-4 md:col-span-2 xl:col-span-3">
                      {renderLabel("Commerces à proximité", "nearbyShops")}
                      <Textarea
                        id="nearbyShops"
                        rows={3}
                        className="mt-2"
                        placeholder="Supermarchés, pharmacies, laveries, etc."
                        value={formData.nearbyShops || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, nearbyShops: e.target.value }))}
                        onBlur={(e) => handleAutoSave("nearbyShops", e.target.value)}
                      />
                    </Card>

                    <Card className="p-4 md:col-span-2 xl:col-span-3">
                      {renderLabel("Restaurants recommandés", "restaurants")}
                      <Textarea
                        id="restaurants"
                        rows={3}
                        className="mt-2"
                        placeholder="Vos bonnes adresses"
                        value={formData.restaurants || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, restaurants: e.target.value }))}
                        onBlur={(e) => handleAutoSave("restaurants", e.target.value)}
                      />
                    </Card>

                    <Card className="p-4 md:col-span-2 xl:col-span-3">
                      {renderLabel("Informations supplémentaires", "additionalInfo")}
                      <Textarea
                        id="additionalInfo"
                        rows={4}
                        className="mt-2"
                        placeholder="Autres informations utiles pour vos voyageurs"
                        value={formData.additionalInfo || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
                        onBlur={(e) => handleAutoSave("additionalInfo", e.target.value)}
                      />
                    </Card>

                    <Card className="p-4 md:col-span-2 xl:col-span-3">
                      {renderLabel("FAQs (Questions fréquentes)", "faqs")}
                      <Textarea
                        id="faqs"
                        rows={6}
                        className="mt-2"
                        placeholder={"Q: Où est le Wi‑Fi ?\nR: À l'entrée, scanner le QR code.\n\nQ: Comment utiliser le canapé‑lit ?\nR: Tirer et rabattre comme indiqué."}
                        value={formData.faqs || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, faqs: e.target.value }))}
                        onBlur={(e) => handleAutoSave("faqs", e.target.value)}
                      />
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="general" className="space-y-6">
                  <Card className="border-l-4 border-l-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        Informations Générales
                      </CardTitle>
                      <CardDescription>Décrivez votre propriété</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="name">Nom de la propriété</Label>
                        <Input
                          id="name"
                          value={formData.name || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          onBlur={(e) => handleAutoSave("name", e.target.value)}
                          data-testid="input-name"
                        />
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          rows={4}
                          value={formData.description || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          onBlur={(e) => handleAutoSave("description", e.target.value)}
                          data-testid="input-description"
                        />
                      </div>

                      <div>
                        <Label htmlFor="address">Adresse complète</Label>
                        <Input
                          id="address"
                          value={formData.address || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                          onBlur={(e) => handleAutoSave("address", e.target.value)}
                          data-testid="input-address"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="floor">Étage</Label>
                          <Input
                            id="floor"
                            placeholder="Ex: 3ème étage"
                            value={formData.floor || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, floor: e.target.value }))}
                            onBlur={(e) => handleAutoSave("floor", e.target.value)}
                            data-testid="input-floor"
                          />
                        </div>
                        <div>
                          <Label htmlFor="doorCode">Code porte</Label>
                          <Input
                            id="doorCode"
                            placeholder="Ex: A1234"
                            value={formData.doorCode || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, doorCode: e.target.value }))}
                            onBlur={(e) => handleAutoSave("doorCode", e.target.value)}
                            data-testid="input-doorcode"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="accessInstructions">Instructions d'accès</Label>
                        <Textarea
                          id="accessInstructions"
                          rows={3}
                          placeholder="Comment accéder à l'appartement?"
                          value={formData.accessInstructions || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, accessInstructions: e.target.value }))}
                          onBlur={(e) => handleAutoSave("accessInstructions", e.target.value)}
                          data-testid="input-access-instructions"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-primary" />
                        Contact Hôte
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="hostName">Nom de l'hôte</Label>
                          <Input
                            id="hostName"
                            value={formData.hostName || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, hostName: e.target.value }))}
                            onBlur={(e) => handleAutoSave("hostName", e.target.value)}
                            data-testid="input-host-name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="hostPhone">Téléphone hôte</Label>
                          <Input
                            id="hostPhone"
                            placeholder="+33 6 12 34 56 78"
                            value={formData.hostPhone || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, hostPhone: e.target.value }))}
                            onBlur={(e) => handleAutoSave("hostPhone", e.target.value)}
                            data-testid="input-host-phone"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="emergencyContact">Contact d'urgence</Label>
                        <Input
                          id="emergencyContact"
                          placeholder="Concierge, voisin, etc."
                          value={formData.emergencyContact || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                          onBlur={(e) => handleAutoSave("emergencyContact", e.target.value)}
                          data-testid="input-emergency-contact"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="checkin" className="space-y-6">
                  <Card className="border-l-4 border-l-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        Horaires
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="checkInTime">Heure d'arrivée</Label>
                          <Input
                            id="checkInTime"
                            type="time"
                            value={formData.checkInTime || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, checkInTime: e.target.value }))}
                            onBlur={(e) => handleAutoSave("checkInTime", e.target.value)}
                            data-testid="input-checkin-time"
                          />
                        </div>
                        <div>
                          <Label htmlFor="checkOutTime">Heure de départ</Label>
                          <Input
                            id="checkOutTime"
                            type="time"
                            value={formData.checkOutTime || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, checkOutTime: e.target.value }))}
                            onBlur={(e) => handleAutoSave("checkOutTime", e.target.value)}
                            data-testid="input-checkout-time"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Info className="w-5 h-5 text-primary" />
                        Procédures
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="keyLocation">Emplacement des clés</Label>
                        <Input
                          id="keyLocation"
                          placeholder="Ex: Boîte à clés sécurisée code 5678"
                          value={formData.keyLocation || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, keyLocation: e.target.value }))}
                          onBlur={(e) => handleAutoSave("keyLocation", e.target.value)}
                          data-testid="input-key-location"
                        />
                      </div>

                      <div>
                        <Label htmlFor="checkInProcedure">Procédure d'arrivée</Label>
                        <Textarea
                          id="checkInProcedure"
                          rows={4}
                          placeholder="Expliquez comment récupérer les clés et accéder au logement"
                          value={formData.checkInProcedure || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, checkInProcedure: e.target.value }))}
                          onBlur={(e) => handleAutoSave("checkInProcedure", e.target.value)}
                          data-testid="input-checkin-procedure"
                        />
                      </div>

                      <div>
                        <Label htmlFor="checkOutProcedure">Procédure de départ</Label>
                        <Textarea
                          id="checkOutProcedure"
                          rows={4}
                          placeholder="Que doivent faire les voyageurs en partant?"
                          value={formData.checkOutProcedure || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, checkOutProcedure: e.target.value }))}
                          onBlur={(e) => handleAutoSave("checkOutProcedure", e.target.value)}
                          data-testid="input-checkout-procedure"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="amenities" className="space-y-6">
                  <Card className="border-l-4 border-l-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wifi className="w-5 h-5 text-primary" />
                        WiFi
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          {renderLabel("Nom du réseau", "wifiName")}
                          <Input
                            id="wifiName"
                            value={formData.wifiName || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, wifiName: e.target.value }))}
                            onBlur={(e) => handleAutoSave("wifiName", e.target.value)}
                            data-testid="input-wifi-name"
                          />
                        </div>
                        <div>
                          {renderLabel("Mot de passe WiFi", "wifiPassword")}
                          <Input
                            id="wifiPassword"
                            value={formData.wifiPassword || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, wifiPassword: e.target.value }))}
                            onBlur={(e) => handleAutoSave("wifiPassword", e.target.value)}
                            data-testid="input-wifi-password"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Utensils className="w-5 h-5 text-primary" />
                        Équipements
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        {renderLabel("Équipement de cuisine", "kitchenEquipment")}
                        <Textarea
                          id="kitchenEquipment"
                          rows={3}
                          placeholder="Four, micro-ondes, cafetière, etc."
                          value={formData.kitchenEquipment || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, kitchenEquipment: e.target.value }))}
                          onBlur={(e) => handleAutoSave("kitchenEquipment", e.target.value)}
                          data-testid="input-kitchen-equipment"
                        />
                      </div>

                      <div>
                        {renderLabel("Équipements (liste)", "amenities")}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(formData.amenities || []).map((item) => (
                            <Badge key={item} variant="secondary" className="flex items-center gap-2">
                              {item}
                              <button
                                type="button"
                                aria-label={`Remove ${item}`}
                                className="ml-1 text-xs opacity-70 hover:opacity-100"
                                onClick={() => removeAmenity(item)}
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Input
                            placeholder="Ajouter un équipement et Entrée"
                            value={amenityInput}
                            onChange={(e) => setAmenityInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAmenity(); } }}
                            data-testid="input-amenity"
                          />
                          <Button type="button" onClick={addAmenity} variant="outline" data-testid="button-add-amenity">
                            Ajouter
                          </Button>
                        </div>
                      </div>

                      <div>
                        {renderLabel("Instructions appareils", "applianceInstructions")}
                        <Textarea
                          id="applianceInstructions"
                          rows={3}
                          placeholder="Comment utiliser le lave-linge, lave-vaisselle, etc."
                          value={formData.applianceInstructions || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, applianceInstructions: e.target.value }))}
                          onBlur={(e) => handleAutoSave("applianceInstructions", e.target.value)}
                          data-testid="input-appliance-instructions"
                        />
                      </div>

                      <div>
                        {renderLabel("Instructions chauffage/climatisation", "heatingInstructions")}
                        <Textarea
                          id="heatingInstructions"
                          rows={3}
                          placeholder="Comment régler le chauffage ou la climatisation"
                          value={formData.heatingInstructions || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, heatingInstructions: e.target.value }))}
                          onBlur={(e) => handleAutoSave("heatingInstructions", e.target.value)}
                          data-testid="input-heating-instructions"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="rules" className="space-y-6">
                  <Card className="border-l-4 border-l-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        Règles de la maison
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="maxGuests">Nombre maximum de voyageurs</Label>
                        <Input
                          id="maxGuests"
                          placeholder="Ex: 4"
                          value={formData.maxGuests || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, maxGuests: e.target.value }))}
                          onBlur={(e) => handleAutoSave("maxGuests", e.target.value)}
                          data-testid="input-max-guests"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="petsAllowed">Animaux acceptés</Label>
                          <p className="text-sm text-muted-foreground">Autorisez-vous les animaux de compagnie?</p>
                        </div>
                        <Switch
                          id="petsAllowed"
                          checked={formData.petsAllowed || false}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({ ...prev, petsAllowed: checked }));
                            handleAutoSave("petsAllowed", checked);
                          }}
                          data-testid="switch-pets-allowed"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="smokingAllowed">Fumeur autorisé</Label>
                          <p className="text-sm text-muted-foreground">Peut-on fumer dans le logement?</p>
                        </div>
                        <Switch
                          id="smokingAllowed"
                          checked={formData.smokingAllowed || false}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({ ...prev, smokingAllowed: checked }));
                            handleAutoSave("smokingAllowed", checked);
                          }}
                          data-testid="switch-smoking-allowed"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="partiesAllowed">Fêtes autorisées</Label>
                          <p className="text-sm text-muted-foreground">Les fêtes sont-elles permises?</p>
                        </div>
                        <Switch
                          id="partiesAllowed"
                          checked={formData.partiesAllowed || false}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({ ...prev, partiesAllowed: checked }));
                            handleAutoSave("partiesAllowed", checked);
                          }}
                          data-testid="switch-parties-allowed"
                        />
                      </div>

                      <div>
                        <Label htmlFor="houseRules">Autres règles</Label>
                        <Textarea
                          id="houseRules"
                          rows={4}
                          placeholder="Règles importantes pour vos voyageurs"
                          value={formData.houseRules || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, houseRules: e.target.value }))}
                          onBlur={(e) => handleAutoSave("houseRules", e.target.value)}
                          data-testid="input-house-rules"
                        />
                      </div>

                      <div>
                        <Label htmlFor="garbageInstructions">Instructions poubelles</Label>
                        <Textarea
                          id="garbageInstructions"
                          rows={3}
                          placeholder="Où et quand sortir les poubelles"
                          value={formData.garbageInstructions || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, garbageInstructions: e.target.value }))}
                          onBlur={(e) => handleAutoSave("garbageInstructions", e.target.value)}
                          data-testid="input-garbage-instructions"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="info" className="space-y-6">
                  <Card className="border-l-4 border-l-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        Parking & Transports
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="parkingInfo">Informations parking</Label>
                        <Textarea
                          id="parkingInfo"
                          rows={3}
                          placeholder="Où se garer? Tarifs?"
                          value={formData.parkingInfo || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, parkingInfo: e.target.value }))}
                          onBlur={(e) => handleAutoSave("parkingInfo", e.target.value)}
                          data-testid="input-parking-info"
                        />
                      </div>

                      <div>
                        <Label htmlFor="publicTransport">Transports en commun</Label>
                        <Textarea
                          id="publicTransport"
                          rows={3}
                          placeholder="Métro, bus, tram à proximité"
                          value={formData.publicTransport || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, publicTransport: e.target.value }))}
                          onBlur={(e) => handleAutoSave("publicTransport", e.target.value)}
                          data-testid="input-public-transport"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Info className="w-5 h-5 text-primary" />
                        Commerces & Services
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="nearbyShops">Commerces à proximité</Label>
                        <Textarea
                          id="nearbyShops"
                          rows={3}
                          placeholder="Supermarchés, pharmacies, etc."
                          value={formData.nearbyShops || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, nearbyShops: e.target.value }))}
                          onBlur={(e) => handleAutoSave("nearbyShops", e.target.value)}
                          data-testid="input-nearby-shops"
                        />
                      </div>

                      <div>
                        <Label htmlFor="restaurants">Restaurants recommandés</Label>
                        <Textarea
                          id="restaurants"
                          rows={3}
                          placeholder="Vos bonnes adresses"
                          value={formData.restaurants || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, restaurants: e.target.value }))}
                          onBlur={(e) => handleAutoSave("restaurants", e.target.value)}
                          data-testid="input-restaurants"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Info className="w-5 h-5 text-primary" />
                        Informations Complémentaires
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="additionalInfo">Informations supplémentaires</Label>
                        <Textarea
                          id="additionalInfo"
                          rows={4}
                          placeholder="Autres informations utiles"
                          value={formData.additionalInfo || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
                          onBlur={(e) => handleAutoSave("additionalInfo", e.target.value)}
                          data-testid="input-additional-info"
                        />
                      </div>

                      <div>
                        <Label htmlFor="faqs">FAQs</Label>
                        <Textarea
                          id="faqs"
                          rows={6}
                          placeholder="Questions fréquentes et leurs réponses (Q: ... R: ...)"
                          value={formData.faqs || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, faqs: e.target.value }))}
                          onBlur={(e) => handleAutoSave("faqs", e.target.value)}
                          data-testid="input-faqs"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card className="p-12">
                <div className="text-center text-muted-foreground">
                  <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Sélectionnez une propriété pour commencer la configuration</p>
                </div>
              </Card>
            )}
            {selectedProperty && (
              <div className="mt-6">
                <Button
                  variant="destructive"
                  className="w-full md:w-auto"
                  onClick={() => {
                    if (!confirm("Supprimer cette propriété ?")) return;
                    apiRequest("DELETE", `/api/properties/${selectedProperty.id}`)
                      .then(() => {
                        queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
                        setSelectedProperty(null);
                        toast({ title: "Propriété supprimée" });
                      })
                      .catch((err) => {
                        toast({ title: "Erreur", description: err?.message || "Suppression impossible", variant: "destructive" });
                      });
                  }}
                >
                  Supprimer cette propriété
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
