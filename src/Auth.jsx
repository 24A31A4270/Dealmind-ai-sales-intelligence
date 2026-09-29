import { useState } from "react"
import { api } from "./api.js"

const Input = (p) => (
  <input {...p} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
)

export default function Auth({ onAuth, onBack }) {
  const [mode, setMode] = useState("signup") // signup | login | join
  const [f, setF] = useState({ org_name: "", org_slug: "", name: "", email: "", password: "" })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr("")
    try {
      const path = mode === "signup" ? "/auth/signup" : mode === "join" ? "/auth/join" : "/auth/login"
      const body =
        mode === "signup" ? { org_name: f.org_name, name: f.name, email: f.email, password: f.password } :
        mode === "join" ? { org_slug: f.org_slug, name: f.name, email: f.email, password: f.password } :
        { email: f.email, password: f.password }
      const data = await api(path, body)
      onAuth(data)
    } catch (e2) {
      setErr(e2.message)
    }
    setBusy(false)
  }

  const tabs = [
    ["signup", "Create workspace"],
    ["join", "Join a team"],
    ["login", "Log in"],
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        {onBack && (
          <button onClick={onBack} className="text-xs text-slate-400 hover:text-slate-600 mb-3">&larr; Back</button>
        )}
        <h1 className="text-2xl font-bold text-slate-900 mb-1">DealMind</h1>
        <p className="text-sm text-slate-500 mb-6">AI Sales Intelligence · memory by Hindsight</p>
        <div className="flex bg-slate-100 rounded-lg p-1 mb-6 text-sm">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setMode(id); setErr("") }}
              className={`flex-1 py-1.5 rounded-md font-medium transition ${mode === id ? "bg-white shadow text-indigo-600" : "text-slate-500"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="text-xs text-slate-500">Company / team name</label>
              <Input required placeholder="e.g. Northwind Sales" value={f.org_name} onChange={set("org_name")} />
              <p className="text-xs text-slate-400 mt-1">This creates a brand-new, private workspace with its own unique ID.</p>
            </div>
          )}
          {mode === "join" && (
            <div>
              <label className="text-xs text-slate-500">Workspace ID</label>
              <Input required placeholder="e.g. northwind-sales" value={f.org_slug} onChange={set("org_slug")} />
              <p className="text-xs text-slate-400 mt-1">Ask a teammate for your company's workspace ID (shown in their dashboard header).</p>
            </div>
          )}
          {mode !== "login" && (
            <div>
              <label className="text-xs text-slate-500">Your name</label>
              <Input required placeholder="Full name" value={f.name} onChange={set("name")} />
            </div>
          )}
          <div>
            <label className="text-xs text-slate-500">Email</label>
            <Input required type="email" placeholder="you@company.com" value={f.email} onChange={set("email")} />
          </div>
          <div>
            <label className="text-xs text-slate-500">Password</label>
            <Input required type="password" minLength={8} placeholder="At least 8 characters" value={f.password} onChange={set("password")} />
          </div>
          {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{err}</p>}
          <button
            disabled={busy}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm"
          >
            {busy ? "Please wait…" : mode === "signup" ? "Create workspace" : mode === "join" ? "Join workspace" : "Log in"}
          </button>
        </form>
      </div>
    </div>
  )
}
