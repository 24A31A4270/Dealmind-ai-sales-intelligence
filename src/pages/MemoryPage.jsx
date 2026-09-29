import { useState } from "react"
import { api } from "../api.js"
import { Card, Btn, Mem, PageHeader } from "../components/ui.jsx"
import DealPicker from "../components/DealPicker.jsx"

function EmptyState({ searched }) {
  return (
    <div className="text-center py-10">
      <div className="text-3xl mb-3">
        {searched ? "🔎" : "🧠"}
      </div>

      <p className="font-medium text-slate-800">
        {searched ? "No matching memories" : "No memories retrieved yet"}
      </p>

      <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
        {searched
          ? "Try a different question or search term."
          : "Ask DealMind about customer objections, commitments, previous conversations, or deal history."}
      </p>
    </div>
  )
}

export default function MemoryPage({
  auth,
  dealId,
  setDealId,
}) {
  const [mode, setMode] = useState("workspace")
  const [q, setQ] = useState("objections and commitments")
  const [mems, setMems] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")

  const search = async () => {
    if (!q.trim()) return

    setBusy(true)
    setErr("")

    try {
      const result =
        mode === "workspace"
          ? await api(
              "/memory/search",
              { question: q.trim() },
              auth.token
            )
          : await api(
              `/deals/${dealId}/recall`,
              { question: q.trim() },
              auth.token
            )

      setMems(result.memories || [])
    } catch (e) {
      setErr(e.message || "Unable to retrieve memories")
    } finally {
      setBusy(false)
    }
  }

  const suggestions = [
    "What objections has this customer raised?",
    "What commitments were made?",
    "What happened in previous meetings?",
    "What concerns did the customer mention?",
  ]

  return (
    <div className="p-6 space-y-6 max-w-6xl">

      {/* Header */}
      <PageHeader
        title="Memory Inspector"
        subtitle="Explore the customer knowledge DealMind can recall from previous interactions."
      />

      {/* Intro */}
      <Card>
        <div className="flex gap-4">

          <div className="h-11 w-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl shrink-0">
            🧠
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">
              Explore DealMind's remembered context
            </h2>

            <p className="text-sm text-slate-500 mt-1 leading-6">
              Search recorded customer information to see what context is
              available when DealMind answers questions and prepares
              recommendations.
            </p>
          </div>

        </div>
      </Card>

      {/* Scope selector */}
      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">
          Search scope
        </p>

        <div className="inline-flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">

          <button
            onClick={() => {
              setMode("workspace")
              setMems(null)
              setErr("")
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              mode === "workspace"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Entire workspace
          </button>

          <button
            onClick={() => {
              setMode("deal")
              setMems(null)
              setErr("")
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              mode === "deal"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Specific deal
          </button>

        </div>
      </div>

      {/* Deal selector */}
      {mode === "deal" && (
        <DealPicker
          auth={auth}
          dealId={dealId}
          onChange={(id) => {
            setDealId(id)
            setMems(null)
            setErr("")
          }}
        />
      )}

      {/* Search */}
      <Card>

        <div className="mb-4">
          <h3 className="font-semibold text-slate-900">
            What do you want to remember?
          </h3>

          <p className="text-sm text-slate-500 mt-1">
            Ask a question about previous customer conversations,
            objections, commitments, or outcomes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") search()
            }}
            className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
            placeholder="Example: What objections did the customer raise?"
          />

          <Btn
            busy={busy}
            disabled={mode === "deal" && !dealId}
            onClick={search}
          >
            Search memory
          </Btn>

        </div>

        {/* Suggested searches */}
        <div className="mt-4">

          <p className="text-xs font-medium text-slate-500 mb-2">
            Try asking
          </p>

          <div className="flex flex-wrap gap-2">

            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setQ(suggestion)}
                className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 transition"
              >
                {suggestion}
              </button>
            ))}

          </div>

        </div>

      </Card>

      {/* Error */}
      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">

          <div className="flex gap-3">

            <span className="text-red-600">⚠</span>

            <div>
              <p className="font-medium text-red-800">
                Memory search failed
              </p>

              <p className="text-sm text-red-700 mt-1">
                {err}
              </p>
            </div>

          </div>

        </div>
      )}

      {/* Results */}
      {mems !== null && !busy && (
        <Card>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">

            <div>
              <h2 className="font-semibold text-slate-900">
                Retrieved context
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                {mems.length === 0
                  ? "No matching customer context was found."
                  : `${mems.length} ${
                      mems.length === 1 ? "memory" : "memories"
                    } retrieved`}
              </p>
            </div>

            {mems.length > 0 && (
              <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                Context available
              </span>
            )}

          </div>

          {mems.length === 0 ? (
            <EmptyState searched />
          ) : (
            <div className="space-y-3">

              {mems.map((memory, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                >

                  <div className="flex gap-3">

                    <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-500 shrink-0">
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <Mem m={memory} />
                    </div>

                  </div>

                </div>
              ))}

            </div>
          )}

        </Card>
      )}

      {/* Initial state */}
      {mems === null && !busy && !err && (
        <Card>
          <EmptyState searched={false} />
        </Card>
      )}

      {/* Loading */}
      {busy && (
        <Card>

          <div className="py-8 text-center">

            <div className="text-3xl animate-pulse mb-3">
              🧠
            </div>

            <p className="font-medium text-slate-800">
              Searching remembered context...
            </p>

            <p className="text-sm text-slate-500 mt-1">
              Finding the most relevant customer information.
            </p>

          </div>

        </Card>
      )}

    </div>
  )
}