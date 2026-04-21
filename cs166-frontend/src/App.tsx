import { useState, type FormEvent } from 'react'
import './App.css'

type ChatMessage = {
  id: number
  role: 'assistant' | 'user'
  content: string
}

const initialMessages: ChatMessage[] = [
  {
    id: 1,
    role: 'assistant',
    content: 'Hello. This is a barebones assistant response.',
  },
  {
    id: 2,
    role: 'user',
    content: 'And this is a barebones user response.',
  },
]

function App() {
  const [messages, setMessages] = useState(initialMessages)
  const [draft, setDraft] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const content = draft.trim()
    if (!content) {
      return
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: Date.now(), role: 'user', content },
    ])
    setDraft('')
  }

  return (
    <main className="app-shell">
      <section className="chat-card" aria-label="Chat transcript">
        <div className="message assistant">
          <div className="label">Assistant</div>
          <p>{messages[0].content}</p>
        </div>

        <div className="message user">
          <div className="label">User</div>
          <p>{messages[1].content}</p>
        </div>

        {messages.slice(2).map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="label">
              {message.role === 'assistant' ? 'Assistant' : 'User'}
            </div>
            <p>{message.content}</p>
          </div>
        ))}

        <form className="composer" onSubmit={handleSubmit}>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type a message"
            rows={3}
          />
          <button type="submit">Send</button>
        </form>
      </section>
    </main>
  )
}

export default App