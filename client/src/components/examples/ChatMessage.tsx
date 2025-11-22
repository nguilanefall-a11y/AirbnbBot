import ChatMessage from '../ChatMessage'

export default function ChatMessageExample() {
  return (
    <div className="p-6 max-w-2xl space-y-4">
      <ChatMessage 
        message="Bonjour! À quelle heure est le check-in?"
        isBot={false}
        timestamp="10:30"
      />
      <ChatMessage 
        message="Bonjour! Le check-in est possible à partir de 15h00. Si vous arrivez plus tôt, nous pouvons stocker vos bagages gratuitement. Y a-t-il autre chose que je puisse vous aider?"
        isBot={true}
        timestamp="10:31"
      />
    </div>
  )
}
