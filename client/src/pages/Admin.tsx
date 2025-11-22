import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, X, Save, Home } from "lucide-react";
import type { Property, InsertProperty } from "@shared/schema";
import { Link } from "wouter";
import ThemeToggle from "@/components/ThemeToggle";

export default function Admin() {
  const { toast } = useToast();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState("");

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
        title: "Succès",
        description: "Propriété mise à jour avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la propriété",
        variant: "destructive",
      });
    },
  });

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProperty) return;

    const formData = new FormData(e.currentTarget);
    const updates: Partial<InsertProperty> = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      checkInTime: formData.get("checkInTime") as string,
      checkOutTime: formData.get("checkOutTime") as string,
      wifiName: formData.get("wifiName") as string,
      wifiPassword: formData.get("wifiPassword") as string,
      houseRules: formData.get("houseRules") as string,
      parkingInfo: formData.get("parkingInfo") as string,
      address: formData.get("address") as string,
      hostName: formData.get("hostName") as string,
      hostPhone: formData.get("hostPhone") as string,
      additionalInfo: formData.get("additionalInfo") as string,
      amenities,
    };

    updateMutation.mutate({ id: selectedProperty.id, updates });
  };

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    setAmenities(property.amenities);
  };

  const addAmenity = () => {
    if (newAmenity.trim() && !amenities.includes(newAmenity.trim())) {
      setAmenities([...amenities, newAmenity.trim()]);
      setNewAmenity("");
    }
  };

  const removeAmenity = (amenity: string) => {
    setAmenities(amenities.filter(a => a !== amenity));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Home className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Configuration</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/">
              <Button variant="outline" size="sm" data-testid="button-back-home">
                Retour
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Vos Propriétés</h2>
              <div className="space-y-2">
                {properties?.map((property) => (
                  <button
                    key={property.id}
                    onClick={() => handlePropertySelect(property)}
                    className={`w-full text-left p-3 rounded-lg hover-elevate transition-all ${
                      selectedProperty?.id === property.id ? "bg-primary text-primary-foreground" : ""
                    }`}
                    data-testid={`button-property-${property.id}`}
                  >
                    <p className="font-medium">{property.name}</p>
                    <p className={`text-sm ${selectedProperty?.id === property.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {property.address}
                    </p>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {selectedProperty ? (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-6">Modifier la Propriété</h2>
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="name">Nom de la propriété</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={selectedProperty.name}
                        required
                        data-testid="input-property-name"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        defaultValue={selectedProperty.description}
                        rows={3}
                        required
                        data-testid="input-property-description"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="address">Adresse</Label>
                      <Input
                        id="address"
                        name="address"
                        defaultValue={selectedProperty.address}
                        required
                        data-testid="input-property-address"
                      />
                    </div>

                    <div>
                      <Label htmlFor="checkInTime">Check-in</Label>
                      <Input
                        id="checkInTime"
                        name="checkInTime"
                        type="time"
                        defaultValue={selectedProperty.checkInTime}
                        data-testid="input-checkin-time"
                      />
                    </div>

                    <div>
                      <Label htmlFor="checkOutTime">Check-out</Label>
                      <Input
                        id="checkOutTime"
                        name="checkOutTime"
                        type="time"
                        defaultValue={selectedProperty.checkOutTime}
                        data-testid="input-checkout-time"
                      />
                    </div>

                    <div>
                      <Label htmlFor="wifiName">Nom WiFi</Label>
                      <Input
                        id="wifiName"
                        name="wifiName"
                        defaultValue={selectedProperty.wifiName || ""}
                        data-testid="input-wifi-name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="wifiPassword">Mot de passe WiFi</Label>
                      <Input
                        id="wifiPassword"
                        name="wifiPassword"
                        defaultValue={selectedProperty.wifiPassword || ""}
                        data-testid="input-wifi-password"
                      />
                    </div>

                    <div>
                      <Label htmlFor="hostName">Nom de l'hôte</Label>
                      <Input
                        id="hostName"
                        name="hostName"
                        defaultValue={selectedProperty.hostName}
                        required
                        data-testid="input-host-name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="hostPhone">Téléphone de l'hôte</Label>
                      <Input
                        id="hostPhone"
                        name="hostPhone"
                        defaultValue={selectedProperty.hostPhone || ""}
                        data-testid="input-host-phone"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>Équipements</Label>
                      <div className="flex gap-2 mb-2">
                        <Input
                          value={newAmenity}
                          onChange={(e) => setNewAmenity(e.target.value)}
                          placeholder="Ajouter un équipement"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                          data-testid="input-new-amenity"
                        />
                        <Button
                          type="button"
                          onClick={addAmenity}
                          size="icon"
                          data-testid="button-add-amenity"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {amenities.map((amenity, index) => (
                          <Badge key={index} variant="secondary" className="gap-1">
                            {amenity}
                            <button
                              type="button"
                              onClick={() => removeAmenity(amenity)}
                              className="ml-1"
                              data-testid={`button-remove-amenity-${index}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="parkingInfo">Informations sur le parking</Label>
                      <Textarea
                        id="parkingInfo"
                        name="parkingInfo"
                        defaultValue={selectedProperty.parkingInfo || ""}
                        rows={2}
                        data-testid="input-parking-info"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="houseRules">Règles de la maison</Label>
                      <Textarea
                        id="houseRules"
                        name="houseRules"
                        defaultValue={selectedProperty.houseRules}
                        rows={3}
                        data-testid="input-house-rules"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="additionalInfo">Informations supplémentaires</Label>
                      <Textarea
                        id="additionalInfo"
                        name="additionalInfo"
                        defaultValue={selectedProperty.additionalInfo || ""}
                        rows={3}
                        data-testid="input-additional-info"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={updateMutation.isPending}
                    data-testid="button-save-property"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
                  </Button>
                </form>
              </Card>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">Sélectionnez une propriété pour la modifier</p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
