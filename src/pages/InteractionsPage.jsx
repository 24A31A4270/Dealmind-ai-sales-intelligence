import { useEffect, useState, useCallback } from "react"
import { api } from "../api.js"
import { Card, Btn, PageHeader } from "../components/ui.jsx"
import DealPicker from "../components/DealPicker.jsx"

export default function InteractionsPage({ auth, dealId, setDealId }) {
  const [s, setS] = useState(null)
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState("")

  const [f, setF] = useState({
    type: "call",
    title: "",
    notes: "",
    outcome: "",
    date: "",
  })

  const load = useCallback(() => {
    if (!dealId) {
      setS(null)
      return
    }

    api(`/deals/${dealId}`, undefined, auth.token)
      .then(setS)
      .catch((e) => setErr(e.message))
  }, [dealId, auth.token])

  useEffect(() => {
    load()
  }, [load])

  const updateField = (key, value) => {
    setF((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const run = async (fn) => {
    setBusy(true)
    setErr("")
    setOk("")

    try {
      await fn()
    } catch (e) {
      setErr(e.message)
    }

    setBusy(false)
  }

  const saveInteraction = async () => {
    await api(
      `/deals/${dealId}/interactions`,
      f,
      auth.token
    )

    setOk(
      "Interaction saved. DealMind will use it to improve future recommendations."
    )

    setF({
      type: "call",
      title: "",
      notes: "",
      outcome: "",
      date: "",
    })

    await load()
  }

  const typeStyles = {
    call: "bg-blue-50 text-blue-700 border-blue-200",
    meeting: "bg-purple-50 text-purple-700 border-purple-200",
    email: "bg-slate-50 text-slate-700 border-slate-200",
    demo: "bg-amber-50 text-amber-700 border-amber-200",
    outcome: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }

  const typeLabels = {
    call: "Call",
    meeting: "Meeting",
    email: "Email",
    demo: "Demo",
    outcome: "Outcome",
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">

      {/* Header */}
      <PageHeader
        title="Interactions"
        subtitle="Capture customer conversations, decisions and outcomes"
      />

      {/* Deal selector */}
      <DealPicker
        auth={auth}
        dealId={dealId}
        onChange={setDealId}
      />

      {/* Error */}
      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
          {err}
        </div>
      )}

      {/* No deal selected */}
      {!dealId && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">

          <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-xl">
            +
          </div>

          <h3 className="mt-4 font-semibold text-slate-900">
            Select a deal
          </h3>

          <p className="text-sm text-slate-500 mt-1">
            Choose a deal above to view its interaction history
            and log a new customer interaction.
          </p>

        </div>
      )}

      {dealId && s && (
        <>

          {/* Deal overview */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">
                  Customer
                </p>

                <h2 className="text-xl font-semibold text-slate-900 mt-1">
                  {s.deal.customer}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {s.deal.product || "Sales opportunity"}
                </p>
              </div>

              <div className="text-left sm:text-right">

                <p className="text-xs text-slate-400">
                  Deal stage
                </p>

                <span className="inline-flex mt-1 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                  {s.deal.stage}
                </span>

              </div>

            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">

              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">
                  Deal value
                </p>

                <p className="font-semibold text-slate-800 mt-1">
                  {s.deal.value || "Not set"}
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">
                  Interactions
                </p>

                <p className="font-semibold text-slate-800 mt-1">
                  {s.interactions.length}
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 col-span-2 sm:col-span-1">
                <p className="text-xs text-slate-400">
                  Customer history
                </p>

                <p className="font-semibold text-emerald-600 mt-1">
                  {s.interactions.length
                    ? "Building"
                    : "Not started"}
                </p>
              </div>

            </div>
          </div>

          {/* Add interaction */}
          <Card>

            <div className="mb-5">
              <h2 className="font-semibold text-slate-900">
                Log an interaction
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Record what happened so DealMind can understand
                the customer relationship over time.
              </p>
            </div>

            <div className="space-y-4">

              {/* Interaction type */}
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Interaction type
                </label>

                <div className="flex flex-wrap gap-2 mt-2">

                  {Object.keys(typeLabels).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        updateField("type", type)
                      }
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition ${
                        f.type === type
                          ? typeStyles[type]
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {typeLabels[type]}
                    </button>
                  ))}

                </div>
              </div>

              {/* Title + date */}
              <div className="grid md:grid-cols-3 gap-3">

                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-slate-600">
                    Interaction title
                  </label>

                  <input
                    placeholder="e.g. Pricing discussion with customer"
                    value={f.title}
                    onChange={(e) =>
                      updateField("title", e.target.value)
                    }
                    className="mt-1 border border-slate-300 rounded-lg p-3 text-sm w-full outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600">
                    Date
                  </label>

                  <input
                    type="date"
                    value={f.date}
                    onChange={(e) =>
                      updateField("date", e.target.value)
                    }
                    className="mt-1 border border-slate-300 rounded-lg p-3 text-sm w-full outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-slate-600">
                  What happened?
                </label>

                <textarea
                  rows={5}
                  placeholder="Capture stakeholders, questions, objections, requirements, commitments, concerns, what worked and what did not..."
                  value={f.notes}
                  onChange={(e) =>
                    updateField("notes", e.target.value)
                  }
                  className="mt-1 border border-slate-300 rounded-lg p-3 text-sm w-full resize-none outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Outcome */}
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Outcome
                </label>

                <textarea
                  rows={3}
                  placeholder="What was the result of this interaction?"
                  value={f.outcome}
                  onChange={(e) =>
                    updateField("outcome", e.target.value)
                  }
                  className="mt-1 border border-slate-300 rounded-lg p-3 text-sm w-full resize-none outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Save */}
              <div className="flex items-center gap-3 pt-1">

                <Btn
                  busy={busy}
                  disabled={
                    !f.title ||
                    !f.notes ||
                    !f.outcome
                  }
                  onClick={() =>
                    run(saveInteraction)
                  }
                >
                  Save interaction
                </Btn>

                {ok && (
                  <p className="text-sm text-emerald-600">
                    {ok}
                  </p>
                )}

              </div>

            </div>
          </Card>

          {/* Timeline */}
          <div>

            <div className="flex items-center justify-between mb-3">

              <div>
                <h2 className="font-semibold text-slate-900">
                  Interaction timeline
                </h2>

                <p className="text-sm text-slate-500">
                  The history of conversations and outcomes for this deal
                </p>
              </div>

              <span className="text-xs text-slate-400">
                {s.interactions.length}{" "}
                {s.interactions.length === 1
                  ? "interaction"
                  : "interactions"}
              </span>

            </div>

            {!s.interactions.length && (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">

                <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  +
                </div>

                <p className="font-medium text-slate-800 mt-3">
                  No interactions yet
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  Start by logging the first customer conversation.
                </p>

              </div>
            )}

            {s.interactions.length > 0 && (
              <div className="relative">

                <div className="absolute left-5 top-3 bottom-3 w-px bg-slate-200" />

                <div className="space-y-4">

                  {s.interactions.map((i, k) => (
                    <div
                      key={k}
                      className="relative pl-12"
                    >

                      {/* Timeline dot */}
                      <div className="absolute left-3 top-5 w-5 h-5 rounded-full bg-white border-2 border-indigo-400 z-10" />

                      <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition">

                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">

                          <div>
                            <h3 className="font-semibold text-slate-800">
                              {i.title}
                            </h3>

                            <div className="flex flex-wrap items-center gap-2 mt-1">

                              <span
                                className={`text-xs px-2 py-1 rounded-full border ${
                                  typeStyles[i.type] ||
                                  "bg-slate-50 text-slate-600 border-slate-200"
                                }`}
                              >
                                {typeLabels[i.type] ||
                                  i.type}
                              </span>

                              <span className="text-xs text-slate-400">
                                {i.date || "Date not set"}
                              </span>

                            </div>
                          </div>

                        </div>

                        <div className="mt-4">
                          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                            Notes
                          </p>

                          <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">
                            {i.notes}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100">

                          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                            Outcome
                          </p>

                          <p className="text-sm text-indigo-700 mt-1">
                            {i.outcome}
                          </p>

                        </div>

                      </div>

                    </div>
                  ))}

                </div>

              </div>
            )}

          </div>

        </>
      )}

    </div>
  )
}
