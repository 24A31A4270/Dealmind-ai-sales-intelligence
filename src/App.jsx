import { useState } from "react"
import Landing from "./Landing.jsx"
import Auth from "./Auth.jsx"
import Workspace from "./Workspace.jsx"

const loadAuth = () => { try { return JSON.parse(localStorage.getItem("dealmind_auth")) } catch { return null } }

export default function App() {
  const [auth, setAuth] = useState(loadAuth)
  const [screen, setScreen] = useState("landing") // landing | auth
  const [initialDealId, setInitialDealId] = useState(null)

  const onAuth = (data, dealId) => {
    localStorage.setItem("dealmind_auth", JSON.stringify(data))
    setAuth(data)
    if (dealId) setInitialDealId(dealId)
  }
  const onLogout = () => {
    localStorage.removeItem("dealmind_auth")
    setAuth(null); setInitialDealId(null); setScreen("landing")
  }

  if (auth) return <Workspace auth={auth} initialDealId={initialDealId} onLogout={onLogout} />
  if (screen === "auth") return <Auth onAuth={onAuth} onBack={() => setScreen("landing")} />
  return <Landing onGetStarted={onAuth} onLogin={() => setScreen("auth")} />
}
