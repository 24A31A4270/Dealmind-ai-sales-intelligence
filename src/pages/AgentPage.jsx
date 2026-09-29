import { useState } from "react"
import { api } from "../api.js"
import { Card, Btn, PageHeader } from "../components/ui.jsx"
import DealPicker from "../components/DealPicker.jsx"

const SUGGESTIONS = [
  "How should I approach the next call with this account?",
  "What objections should I prepare for?",
  "Why is this deal stuck?",
  "What should I do next?",
  "What has worked with this customer before?",
]

function SectionTitle({ number, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
        {number}
      </div>

      <div>
        <h2 className="font-semibold text-slate-900">{title}</h2>

        {subtitle && (
          <p className="text-sm text-slate-500 mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

function EmptyBlock({ text = "No information available yet." }) {
  return (
    <div className="text-sm text-slate-400 bg-slate-50 rounded-xl p-4">
      {text}
    </div>
  )
}

function MemoryItem({ memory, index }) {
  const text =
    typeof memory === "string"
      ? memory
      : memory?.text || "Memory details unavailable."

  return (
    <div className="relative pl-8">
      <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-indigo-50" />

      {index > 0 && (
        <div className="absolute left-[5px] -top-5 h-5 w-px bg-slate-200" />
      )}

      <p className="text-sm text-slate-700 leading-6">
        {text}
      </p>

      {memory?.date && (
        <p className="text-xs text-slate-400 mt-1">
          {memory.date}
        </p>
      )}
    </div>
  )
}

export default function AgentPage({ auth, dealId, setDealId }) {
  const [q, setQ] = useState(
    "How should I approach the next call with this account?"
  )

  const [cmp, setCmp] = useState(null)
  const [refl, setRefl] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")

  const run = async (fn) => {
    setBusy(true)
    setErr("")

    try {
      await fn()
    } catch (e) {
      setErr(e.message || "Something went wrong. Please try again.")
    }

    setBusy(false)
  }

  const askQuestion = async () => {
    if (!dealId || !q.trim()) return

    await run(async () => {
      const result = await api(
        `/deals/${dealId}/compare`,
        { question: q },
        auth.token
      )

      setCmp(result)
      setRefl("")
    })
  }

  const reflect = async () => {
    if (!dealId || !q.trim()) return

    await run(async () => {
      const result = await api(
        `/deals/${dealId}/reflect`,
        { question: q },
        auth.token
      )

      setRefl(result.text)
    })
  }

  const chooseSuggestion = (question) => {
    setQ(question)
  }

  const memories = cmp?.memories || []

  return (
    <div className="p-6 space-y-7 max-w-7xl">

      {/* =========================================================
          HEADER
      ========================================================= */}

      <PageHeader
        title="AI Sales Agent"
        subtitle="Your sales copilot for customer intelligence, deal strategy and next actions"
      />

      {/* =========================================================
          DEAL SELECTOR
      ========================================================= */}

      <DealPicker
        auth={auth}
        dealId={dealId}
        onChange={(id) => {
          setDealId(id)
          setCmp(null)
          setRefl("")
          setErr("")
        }}
      />

      {/* =========================================================
          ERROR
      ========================================================= */}

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              !
            </div>

            <div>
              <p className="font-medium text-sm">
                Unable to complete the request
              </p>

              <p className="text-sm mt-1">
                {err}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          NO DEAL
      ========================================================= */}

      {!dealId && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">

          <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl">
            ✦
          </div>

          <h3 className="mt-5 text-xl font-semibold text-slate-900">
            Choose a deal to get started
          </h3>

          <p className="text-sm text-slate-500 mt-2 max-w-lg mx-auto leading-6">
            Select a deal above and ask DealMind about the customer,
            previous conversations, objections, deal risks or your
            next action.
          </p>

        </div>
      )}

      {dealId && (
        <>

          {/* =====================================================
              ASK DEALMIND
          ===================================================== */}

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

            <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">

              <div className="flex items-center gap-3">

                <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-sm">
                  ✦
                </div>

                <div>
                  <h2 className="font-semibold text-slate-900 text-lg">
                    Ask DealMind
                  </h2>

                  <p className="text-sm text-slate-500 mt-0.5">
                    Ask a question about the selected customer or deal.
                  </p>
                </div>

              </div>

            </div>

            <div className="p-6">

              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Your question
              </label>

              <div className="mt-2 flex flex-col sm:flex-row gap-3">

                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      askQuestion()
                    }
                  }}
                  placeholder="Ask about this customer or deal..."
                  className="border border-slate-300 rounded-xl px-4 py-3 text-sm flex-1 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                <Btn
                  busy={busy}
                  disabled={!q.trim()}
                  onClick={askQuestion}
                >
                  Ask DealMind
                </Btn>

              </div>

              {/* Suggestions */}

              <div className="mt-5">

                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-slate-500">
                    Suggested questions
                  </p>

                  <p className="text-xs text-slate-400">
                    Click to use
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">

                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => chooseSuggestion(suggestion)}
                      className={`px-3 py-2 rounded-lg border text-xs transition ${
                        q === suggestion
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}

                </div>

              </div>

            </div>

          </div>

          {/* =====================================================
              RESULTS
          ===================================================== */}

          {cmp && (
            <>

              {/* -------------------------------------------------
                  RESULT HEADER
              ------------------------------------------------- */}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                <SectionTitle
                  number="01"
                  title="Deal Intelligence"
                  subtitle="See what changes when customer history is available."
                />

                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">

                  <span className="w-2 h-2 rounded-full bg-emerald-500" />

                  {memories.length} relevant memories

                </div>

              </div>

              {/* -------------------------------------------------
                  BEFORE / AFTER
              ------------------------------------------------- */}

              <div className="grid lg:grid-cols-2 gap-5">

                {/* WITHOUT MEMORY */}

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

                  <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">

                    <div className="flex items-center gap-2">

                      <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />

                      <h3 className="font-semibold text-slate-800">
                        Without customer history
                      </h3>

                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                      Generic sales reasoning
                    </p>

                  </div>

                  <div className="p-5">

                    {cmp.before ? (
                      <p className="text-sm text-slate-600 whitespace-pre-wrap leading-7">
                        {cmp.before}
                      </p>
                    ) : (
                      <EmptyBlock />
                    )}

                  </div>

                </div>

                {/* WITH MEMORY */}

                <div className="bg-white border border-emerald-200 rounded-2xl overflow-hidden">

                  <div className="px-5 py-4 border-b border-emerald-100 bg-emerald-50">

                    <div className="flex items-center gap-2">

                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />

                      <h3 className="font-semibold text-emerald-800">
                        With DealMind's memory
                      </h3>

                    </div>

                    <p className="text-xs text-emerald-600 mt-1">
                      Personalized using available customer history
                    </p>

                  </div>

                  <div className="p-5">

                    {cmp.after ? (
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-7">
                        {cmp.after}
                      </p>
                    ) : (
                      <EmptyBlock />
                    )}

                  </div>

                </div>

              </div>

              {/* -------------------------------------------------
                  MEMORY USED
              ------------------------------------------------- */}

              <div className="bg-white border border-slate-200 rounded-2xl p-6">

                <SectionTitle
                  number="02"
                  title="Memory Used"
                  subtitle="Customer history that was available to the agent for this question."
                />

                <div className="mt-5">

                  {memories.length === 0 ? (
                    <EmptyBlock text="No relevant customer memories were found for this question." />
                  ) : (
                    <div className="space-y-5">

                      {memories.map((memory, index) => (
                        <MemoryItem
                          key={`${index}-${memory?.text || "memory"}`}
                          memory={memory}
                          index={index}
                        />
                      ))}

                    </div>
                  )}

                </div>

              </div>

              {/* -------------------------------------------------
                  WHY IT MATTERS
              ------------------------------------------------- */}

              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">

                <div className="flex gap-4">

                  <div className="w-10 h-10 rounded-xl bg-white text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                    ✦
                  </div>

                  <div>

                    <p className="font-semibold text-indigo-900">
                      Why this matters
                    </p>

                    <p className="text-sm text-indigo-800/80 mt-1 leading-6">
                      DealMind uses customer history to make the
                      recommendation specific to this relationship,
                      rather than treating every sales opportunity
                      the same way.
                    </p>

                  </div>

                </div>

              </div>

            </>
          )}

          {/* =====================================================
              DEEPER ANALYSIS
          ===================================================== */}

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

            <div className="p-6">

              <SectionTitle
                number="03"
                title="Deeper Deal Analysis"
                subtitle="Ask DealMind to identify patterns and explain the situation."
              />

              <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">

                <p className="text-sm text-slate-500 max-w-2xl">
                  Use the current question to generate a deeper analysis
                  based on the available customer history.
                </p>

                <Btn
                  busy={busy}
                  className="!bg-slate-700 shrink-0"
                  disabled={!q.trim()}
                  onClick={reflect}
                >
                  Analyze this deal
                </Btn>

              </div>

              {refl && (
                <div className="mt-6 pt-6 border-t border-slate-100">

                  <div className="flex items-center gap-3 mb-4">

                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      ✦
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Deal analysis
                      </p>

                      <p className="text-xs text-slate-400 mt-0.5">
                        Based on available customer history
                      </p>
                    </div>

                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">

                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-7">
                      {refl}
                    </p>

                  </div>

                </div>
              )}

            </div>

          </div>

          {/* =====================================================
              PRODUCT STORY
          ===================================================== */}

          {!cmp && !refl && (
            <div>

              <div className="mb-4">

                <h2 className="font-semibold text-slate-900">
                  How DealMind works
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  The more customer interactions your team records,
                  the more context the agent can use.
                </p>

              </div>

              <div className="grid md:grid-cols-3 gap-4">

                {/* Remember */}

                <Card>

                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-semibold">
                    01
                  </div>

                  <h3 className="font-semibold text-slate-800 mt-4">
                    Remember
                  </h3>

                  <p className="text-sm text-slate-500 mt-2 leading-6">
                    Customer conversations, objections,
                    commitments and outcomes become part of
                    the deal history.
                  </p>

                </Card>

                {/* Understand */}

                <Card>

                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-semibold">
                    02
                  </div>

                  <h3 className="font-semibold text-slate-800 mt-4">
                    Understand
                  </h3>

                  <p className="text-sm text-slate-500 mt-2 leading-6">
                    The agent connects previous interactions
                    with the customer's current situation.
                  </p>

                </Card>

                {/* Recommend */}

                <Card>

                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-semibold">
                    03
                  </div>

                  <h3 className="font-semibold text-slate-800 mt-4">
                    Recommend
                  </h3>

                  <p className="text-sm text-slate-500 mt-2 leading-6">
                    Recommendations become more relevant as
                    the customer relationship develops.
                  </p>

                </Card>

              </div>

            </div>
          )}

        </>
      )}

    </div>
  )
}