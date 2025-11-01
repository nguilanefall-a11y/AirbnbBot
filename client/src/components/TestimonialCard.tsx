import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";

interface TestimonialCardProps {
  name: string;
  propertyType: string;
  quote: string;
  avatarUrl: string;
  rating: number;
}

export default function TestimonialCard({ 
  name, 
  propertyType, 
  quote, 
  avatarUrl, 
  rating 
}: TestimonialCardProps) {
  return (
    <Card className="p-6 hover-elevate transition-all duration-300">
      <div className="flex items-center gap-1 mb-4">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-primary text-primary" />
        ))}
      </div>
      
      <p className="text-foreground mb-6 leading-relaxed italic">"{quote}"</p>
      
      <div className="flex items-center gap-3">
        <Avatar className="w-12 h-12">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">{propertyType}</p>
        </div>
      </div>
    </Card>
  );
}
