import FeatureCard from '../FeatureCard'
import { Brain } from 'lucide-react'

export default function FeatureCardExample() {
  return (
    <div className="p-6 max-w-sm">
      <FeatureCard 
        icon={Brain}
        title="Réponses Intelligentes"
        description="L'IA comprend le contexte et fournit des réponses personnalisées basées sur les informations de votre propriété."
      />
    </div>
  )
}
