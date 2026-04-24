import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from 'react-oidc-context'
import './App.css'

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
}

const awsApiUrl = import.meta.env.VITE_AWS_API_URL as string | undefined

const parseAssistantContent = (payload: unknown): string | null => {
  if (typeof payload === 'string') {
    return payload
  }

  if (!payload || typeof payload !== 'object') {
    return null
  }

  const candidate = payload as {
    response?: unknown
    message?: unknown
    reply?: unknown
    body?: unknown
    output?: unknown
    status?: unknown
  }

  if (typeof candidate.response === 'string') {
    return candidate.response
  }

  if (typeof candidate.message === 'string') {
    return candidate.message
  }

  if (typeof candidate.reply === 'string') {
    return candidate.reply
  }

  if (typeof candidate.body === 'string') {
    return candidate.body
  }

  if (typeof candidate.output === 'string') {
    return candidate.output
  }

  if (typeof candidate.status === 'string') {
    return `Request status: ${candidate.status}`
  }

  return null
}

const initialMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Hello. This is a barebones assistant response.',
  },
  {
    id: '2',
    role: 'user',
    content: 'And this is a barebones user response.',
  },
]

function App() {
  const auth = useAuth()
  const cognitoClientId = import.meta.env.VITE_COGNITO_CLIENT_ID as
    | string
    | undefined
  const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN as
    | string
    | undefined
  const logoutUri =
    (import.meta.env.VITE_COGNITO_LOGOUT_REDIRECT_URI as string | undefined) ||
    `${window.location.origin}/`

  const [messages, setMessages] = useState(initialMessages)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [lastCurlPreview, setLastCurlPreview] = useState('')

  useEffect(() => {
    if (auth.isLoading || auth.isAuthenticated) {
      return
    }

    const shouldRelogin = sessionStorage.getItem('forceRelogin') === '1'
    if (shouldRelogin) {
      sessionStorage.removeItem('forceRelogin')
      void auth.signinRedirect()
    }
  }, [auth])

  const signOutRedirect = () => {
    if (!cognitoClientId || !cognitoDomain) {
      void auth.removeUser()
      return
    }

    sessionStorage.setItem('forceRelogin', '1')
    window.location.href = `${cognitoDomain}/logout?client_id=${cognitoClientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const content = draft.trim()
    if (!content || isSending) {
      return
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    }

    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setDraft('')

    if (!awsApiUrl) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            'Missing VITE_AWS_API_URL in your environment. Add it to a .env file and restart Vite.',
        },
      ])
      return
    }

    setIsSending(true)

    try {
      const requestJson = JSON.stringify({ query: content })
      const escapedForSingleQuotes = requestJson.replace(/'/g, "'\\''")
      const curlPreview = `curl -X POST "${awsApiUrl}" -H "Content-Type: application/json" -d '${escapedForSingleQuotes}'`

      console.log(`About to call AWS API:\n${curlPreview}`)
      setLastCurlPreview(curlPreview)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (auth.user?.access_token) {
        headers.Authorization = `Bearer ${auth.user.access_token}`
      }

      const response = await fetch(awsApiUrl, {
        method: 'POST',
        headers,
        body: requestJson,
      })


      const responseText = await response.text()

      if (!response.ok) {
        throw new Error(responseText || `Request failed with ${response.status}`)
      }

      let parsedPayload: unknown = responseText
      try {
        parsedPayload = responseText ? JSON.parse(responseText) : null
      } catch {
        parsedPayload = responseText
      }

      const assistantContent =
        parseAssistantContent(parsedPayload) ||
        'Request succeeded, but no assistant response was found in the API payload.'

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: assistantContent,
        },
      ])
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown network error'

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `API error: ${errorMessage}`,
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  if (auth.isLoading) {
    return <main className="app-shell">Loading sign-in...</main>
  }

  if (auth.error) {
    return (
      <main className="app-shell">Auth error: {auth.error.message}</main>
    )
  }

  if (!auth.isAuthenticated) {
    return (
      <main className="app-shell">
        <section className="chat-card" aria-label="Authentication">
          <h2>Sign in required</h2>
          <p>Use Cognito login to access the chat app.</p>
          <button type="button" onClick={() => void auth.signinRedirect()}>
            Sign in
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="chat-card" aria-label="Chat transcript">
        <div className="message assistant">
          <div className="label">Signed in as</div>
          <p>{auth.user?.profile.email || auth.user?.profile.sub || 'Unknown user'}</p>
          <button type="button" onClick={signOutRedirect}>
            Sign out
          </button>
        </div>

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
            disabled={isSending}
          />
          <button type="submit" disabled={isSending || !draft.trim()}>
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </form>

        {lastCurlPreview ? (
          <div className="request-preview" aria-live="polite">
            <div className="label">Last Request</div>
            <pre>{lastCurlPreview}</pre>
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default App