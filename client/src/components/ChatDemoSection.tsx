import ChatInterface from "./ChatInterface";

export default function ChatDemoSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Testez l'Assistant en Direct
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Voyez comment l'IA répond aux questions courantes de vos voyageurs
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <ChatInterface />
        </div>
      </div>
    </section>
  );
}
