import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Phone, AlertTriangle } from "lucide-react";

interface SOSButtonProps {
  hostPhone?: string;
  emergencyContact?: string;
}

export default function SOSButton({ hostPhone, emergencyContact }: SOSButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const contacts = [
    hostPhone && { label: "Hôte", phone: hostPhone },
    emergencyContact && { label: "Urgence", phone: emergencyContact },
    { label: "Urgences FR", phone: "112" },
    { label: "SAMU", phone: "15" },
    { label: "Police", phone: "17" },
    { label: "Pompiers", phone: "18" },
  ].filter(Boolean) as { label: string; phone: string }[];

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        className="fixed bottom-4 right-4 rounded-full shadow-lg z-50"
        onClick={() => setIsOpen(true)}
      >
        <AlertTriangle className="w-4 h-4 mr-2" />
        SOS
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Contacts d'urgence
            </DialogTitle>
            <DialogDescription>
              Appuyez sur un contact pour l'appeler directement
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {contacts.map((contact) => (
              <a
                key={contact.phone}
                href={`tel:${contact.phone}`}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted transition-colors"
              >
                <span className="font-medium">{contact.label}</span>
                <div className="flex items-center gap-2 text-primary">
                  <Phone className="w-4 h-4" />
                  <span>{contact.phone}</span>
                </div>
              </a>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

