import { useState } from "react"
import { api } from "../api.js"
import { Card, Btn, PageHeader } from "../components/ui.jsx"
import DealPicker from "../components/DealPicker.jsx"

function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-3">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {subtitle && (
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      )}
    </div>
  )
}

function EmptyState({ icon = "📋", title, text }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <p className="font-medium text-slate-800">{title}</p>
      {text && <p className="text-sm text-slate-500 mt-1">{text}</p>}
    </div>
  )
}

function renderValue(value) {
  if (value === null || value === undefined || value === "") {
    return (
      <span className="text-slate-400 italic">
        Not available
      </span>
    )
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return (
        <span className="text-slate-400 italic">
          No information available
        </span>
      )
    }

    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div
            key={index}
            className="flex gap-3 items-start rounded-lg bg-slate-50 border border-slate-100 p-3"
          >
            <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-slate-200 text-slate-600 text-xs flex items-center justify-center">
              {index + 1}
            </span>

            <span className="text-sm text-slate-700 leading-6">
              {typeof item === "object"
                ? JSON.stringify(item)
                : String(item)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (typeof value === "object") {
    return (
      <div className="space-y-2">
        {Object.entries(value).map(([key, val]) => (
          <div
            key={key}
            className="flex justify-between gap-4 py-2 border-b border-slate-100 last:border-0"
          >
            <span className="text-sm text-slate-500">
              {key
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>

            <span className="text-sm text-slate-800 text-right max-w-[65%]">
              {typeof val === "object"
                ? JSON.stringify(val)
                : String(val)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <p className="text-sm text-slate-700 leading-6">
      {String(value)}
    </p>
  )
}

export default function MeetingPrepPage({
  auth,
  dealId,
  setDealId,
}) {
  const [prep, setPrep] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")

  const run = async (fn) => {
    setBusy(true)
    setErr("")

    try {
      await fn()
    } catch (e) {
      setErr(e.message || "Something went wrong")
    }

    setBusy(false)
  }

  const generatePrep = () =>
    run(async () => {
      const result = await api(
        `/deals/${dealId}/prep`,
        {},
        auth.token
      )

      setPrep(result)
    })

  return (
    <div className="p-6 space-y-6 max-w-6xl">

      {/* Header */}
      <PageHeader
        title="Meeting Prep"
        subtitle="Prepare for your next customer conversation using the information already available in DealMind."
      />

      {/* Deal selector */}
      <DealPicker
        auth={auth}
        dealId={dealId}
        onChange={(id) => {
          setDealId(id)
          setPrep(null)
          setErr("")
        }}
      />

      {/* Error */}
      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <div className="text-red-600">⚠</div>

            <div>
              <p className="font-medium text-red-800">
                Unable to generate meeting prep
              </p>

              <p className="text-sm text-red-700 mt-1">
                {err}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No deal selected */}
      {!dealId && (
        <Card>
          <EmptyState
            icon="📅"
            title="Select a deal to prepare"
            text="Choose a deal above and DealMind will build a pre-call briefing from the available customer and deal information."
          />
        </Card>
      )}

      {/* Deal selected but not generated */}
      {dealId && !prep && !busy && (
        <Card>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ready to prepare
                </span>
              </div>

              <h2 className="text-lg font-semibold text-slate-900">
                Build your meeting brief
              </h2>

              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                Review the available customer context, previous interactions,
                talking points and recommended next steps before your call.
              </p>
            </div>

            <Btn busy={busy} onClick={generatePrep}>
              Generate meeting prep
            </Btn>

          </div>
        </Card>
      )}

      {/* Loading */}
      {busy && (
        <Card>
          <div className="py-10 text-center">
            <div className="text-3xl mb-3 animate-pulse">
              ✦
            </div>

            <p className="font-medium text-slate-800">
              Preparing your meeting brief...
            </p>

            <p className="text-sm text-slate-500 mt-1">
              Reviewing the available deal and customer context.
            </p>
          </div>
        </Card>
      )}

      {/* Results */}
      {prep && !busy && (
        <div className="space-y-5">

          {/* Result header */}
          <Card>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />

                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Meeting brief ready
                  </span>
                </div>

                <h2 className="text-xl font-semibold text-slate-900">
                  Your pre-call briefing
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Review the available context before speaking with the customer.
                </p>
              </div>

              <Btn
                busy={busy}
                onClick={generatePrep}
              >
                Refresh brief
              </Btn>

            </div>
          </Card>

          {/* Main prep sections */}
          <div className="grid lg:grid-cols-2 gap-5">

            {prep.prep &&
              Object.entries(prep.prep).map(([key, value]) => (
                <Card key={key}>

                  <SectionTitle
                    title={key
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  />

                  {renderValue(value)}

                </Card>
              ))}

          </div>

          {/* Memory/context section */}
          {Array.isArray(prep.memories) && (
            <Card>

              <SectionTitle
                title="Customer context used"
                subtitle="Relevant information available to DealMind for this meeting."
              />

              {prep.memories.length > 0 ? (
                <div className="space-y-3">

                  {prep.memories.map((memory, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex gap-3">

                        <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm shrink-0">
                          {index + 1}
                        </div>

                        <p className="text-sm text-slate-700 leading-6">
                          {typeof memory === "object"
                            ? JSON.stringify(memory)
                            : String(memory)}
                        </p>

                      </div>
                    </div>
                  ))}

                </div>
              ) : (
                <EmptyState
                  icon="🧠"
                  title="No customer context found"
                  text="There is not enough recorded history to show additional customer context."
                />
              )}

            </Card>
          )}

          {/* Accuracy notice */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">

            <div className="flex gap-3">

              <div className="text-amber-600">
                ⚠
              </div>

              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Verify important details
                </p>

                <p className="text-sm text-amber-800 mt-1 leading-6">
                  Meeting prep is based on the information currently available
                  for this deal. Confirm important customer facts, commitments
                  and dates before using them in a customer conversation.
                </p>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  )
}