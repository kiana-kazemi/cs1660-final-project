import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from 'react-oidc-context'
import './index.css'
import App from './App.tsx'

const redirectUri =
  (import.meta.env.VITE_COGNITO_REDIRECT_URI as string | undefined) ||
  `${window.location.origin}/`
const postLogoutRedirectUri =
  (import.meta.env.VITE_COGNITO_LOGOUT_REDIRECT_URI as string | undefined) ||
  redirectUri



 const cognitoAuthConfig = {
  authority: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_inKaPS9H7",
  client_id: "2h4r31okdnjon9dfr2o0ldhl2m",
  redirect_uri: redirectUri,
  post_logout_redirect_uri: postLogoutRedirectUri,
  response_type: "code",
  scope: "email openid phone",
};


createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <AuthProvider {...cognitoAuthConfig}>
        <App />
      </AuthProvider>
  </StrictMode>,
)
