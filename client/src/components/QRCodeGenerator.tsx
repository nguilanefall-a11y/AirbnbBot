/**
 * Composant QR Code pour accès voyageur
 * Génère un QR code scannable qui mène directement au chat/demandes
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { QrCode, Download, Copy, Check, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface QRCodeGeneratorProps {
  accessKey: string;
  propertyName: string;
  type?: "guest" | "request"; // guest = chat, request = demandes spéciales
}

export default function QRCodeGenerator({ accessKey, propertyName, type = "guest" }: QRCodeGeneratorProps) {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const guestUrl = type === "guest" 
    ? `${baseUrl}/guest/${accessKey}`
    : `${baseUrl}/request/${accessKey}`;

  useEffect(() => {
    if (isOpen && accessKey) {
      generateQRCode();
    }
  }, [isOpen, accessKey]);

  const generateQRCode = async () => {
    try {
      // Utiliser l'API QR Code pour générer l'image
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(guestUrl)}&bgcolor=ffffff&color=000000&margin=10`;
      setQrDataUrl(qrApiUrl);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(guestUrl);
      setCopied(true);
      toast({
        title: "Lien copié !",
        description: "Le lien a été copié dans le presse-papier",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien",
        variant: "destructive",
      });
    }
  };

  const handleDownloadQR = () => {
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `qrcode-${propertyName.replace(/\s+/g, "-").toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "QR Code téléchargé !",
      description: "Vous pouvez l'imprimer et le placer dans votre logement",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <QrCode className="w-4 h-4" />
          QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            QR Code Voyageur
          </DialogTitle>
          <DialogDescription>
            {type === "guest" 
              ? "Les voyageurs peuvent scanner ce code pour accéder au chat"
              : "Les voyageurs peuvent scanner ce code pour faire des demandes spéciales"
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* QR Code Display */}
          <motion.div 
            className="flex justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-4 bg-white">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt={`QR Code pour ${propertyName}`}
                  className="w-64 h-64"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
                  <QrCode className="w-12 h-12 text-muted-foreground animate-pulse" />
                </div>
              )}
            </Card>
          </motion.div>

          {/* Property Name */}
          <div className="text-center">
            <p className="font-semibold text-lg">{propertyName}</p>
            <p className="text-sm text-muted-foreground truncate max-w-xs mx-auto">
              {guestUrl}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button onClick={handleCopyLink} variant="outline" className="gap-2">
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copier le lien
                </>
              )}
            </Button>
            
            <Button onClick={handleDownloadQR} className="gap-2">
              <Download className="w-4 h-4" />
              Télécharger le QR Code
            </Button>
          </div>

          {/* Tips */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">💡 Conseils d'utilisation</p>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Imprimez et placez près de l'entrée</li>
                    <li>• Ajoutez dans votre livret d'accueil</li>
                    <li>• Envoyez par message avant l'arrivée</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}


