import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from 'react-oidc-context'
import './App.css'

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
}

const awsApiUrl = import.meta.env.VITE_AWS_API_URL as string | undefined

const extractAssistantText = (payload: unknown): string | null => {
  if (typeof payload === 'string') {
    const trimmedPayload = payload.trim()
    if (!trimmedPayload) {
      return null
    }

    try {
      const parsedPayload = JSON.parse(trimmedPayload) as unknown
      if (parsedPayload !== payload) {
        return extractAssistantText(parsedPayload) || trimmedPayload
      }
    } catch {
      return trimmedPayload
    }

    return trimmedPayload
  }

  if (!payload || typeof payload !== 'object') {
    return null
  }

  const record = payload as Record<string, unknown>

  if (
    'bedrock' in record &&
    record.bedrock &&
    typeof record.bedrock === 'object'
  ) {
    const bedrockRecord = record.bedrock as Record<string, unknown>

    if (
      'Output' in bedrockRecord &&
      bedrockRecord.Output &&
      typeof bedrockRecord.Output === 'object' &&
      'Text' in (bedrockRecord.Output as Record<string, unknown>) &&
      typeof (bedrockRecord.Output as Record<string, unknown>).Text ===
        'string'
    ) {
      return (bedrockRecord.Output as { Text: string }).Text
    }

    const extracted = extractAssistantText(bedrockRecord)
    if (extracted) {
      return extracted
    }
  }

  if (
    'Output' in record &&
    record.Output &&
    typeof record.Output === 'object' &&
    'Text' in (record.Output as Record<string, unknown>) &&
    typeof (record.Output as Record<string, unknown>).Text === 'string'
  ) {
    return (record.Output as { Text: string }).Text
  }

  const nestedTextCandidates = [
    record.Text,
    record.text,
    record.message,
    record.response,
    record.reply,
    record.body,
    record.output,
  ]

  for (const candidate of nestedTextCandidates) {
    const extracted = extractAssistantText(candidate)
    if (extracted) {
      return extracted
    }
  }

  if ('Output' in record) {
    const extracted = extractAssistantText(record.Output)
    if (extracted) {
      return extracted
    }
  }

  if ('GeneratedResponsePart' in record) {
    const extracted = extractAssistantText(record.GeneratedResponsePart)
    if (extracted) {
      return extracted
    }
  }

  if ('TextResponsePart' in record) {
    const extracted = extractAssistantText(record.TextResponsePart)
    if (extracted) {
      return extracted
    }
  }

  if ('Citations' in record && Array.isArray(record.Citations)) {
    for (const citation of record.Citations) {
      const extracted = extractAssistantText(citation)
      if (extracted) {
        return extracted
      }
    }
  }

  if (typeof record.status === 'string') {
    return `Request status: ${record.status}`
  }

  return null
}

const parseAssistantContent = (payload: unknown): string | null => {
  return extractAssistantText(payload)
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

  useEffect(() => {
  if (!auth.isAuthenticated) return
  if (!awsApiUrl) return
  if (!auth.user?.access_token) return

  // If awsApiUrl is your POST /query endpoint, derive /history
  const historyUrl = import.meta.env.VITE_HISTORY_URL

  void (async () => {
    try {
      const res = await fetch(historyUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${auth.user!.access_token}`,
        },
      })

      const text = await res.text()
      if (!res.ok) {
        console.error('History request failed:', res.status, text)
        return
      }

      const data = text ? (JSON.parse(text) as { items?: Array<any> }) : {}
      const items = Array.isArray(data.items) ? data.items : []

      const loadedMessages: ChatMessage[] = items
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
          id: String(item.ts ?? crypto.randomUUID()),
          role: item.role === 'assistant' ? 'assistant' : 'user',
          content: String(item.content ?? ''),
        }))

      // Keep your initial assistant greeting (messages[0]) and append history
      setMessages((current) => [current[0], ...loadedMessages])
    } catch (err) {
      console.error('History load error:', err)
    }
  })()
}, [auth.isAuthenticated, auth.user?.access_token, awsApiUrl])

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

    localStorage.clear();
    sessionStorage.clear();

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
      const userId =
        auth.user?.access_token ||
        'unknown-user'

      const requestJson = JSON.stringify({ query: content, UserId: userId })
      const escapedForSingleQuotes = requestJson.replace(/'/g, "'\\''")
      const curlPreview = `curl -X POST "${awsApiUrl}" -H "Content-Type: application/json" -d '${escapedForSingleQuotes}'`

      console.log(`About to call AWS API:\n${curlPreview}`)

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

        {messages.map((message) => (
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
      </section>
    </main>
  )
}

export default App
