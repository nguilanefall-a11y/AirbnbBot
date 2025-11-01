import TestimonialCard from '../TestimonialCard'
import avatar from '@assets/generated_images/Host_testimonial_avatar_1_478a9f79.png'

export default function TestimonialCardExample() {
  return (
    <div className="p-6 max-w-md">
      <TestimonialCard 
        name="Marie Dubois"
        propertyType="Villa en Provence"
        quote="Cet assistant IA a transformé ma gestion Airbnb. Je reçois moins de questions répétitives et mes invités sont plus satisfaits!"
        avatarUrl={avatar}
        rating={5}
      />
    </div>
  )
}
