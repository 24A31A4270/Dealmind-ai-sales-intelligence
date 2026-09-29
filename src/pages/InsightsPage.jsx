import { useEffect, useState } from "react"
import { api } from "../api.js"
import { Card, Bar, PageHeader } from "../components/ui.jsx"

const SENT_COLOR = {
  Positive: "bg-emerald-500",
  Negative: "bg-red-500",
  Mixed: "bg-amber-500",
  Neutral: "bg-slate-400",
}

function StatCard({ label, value, description }) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="text-2xl font-semibold text-slate-900 mt-2">
        {value}
      </p>

      {description && (
        <p className="text-xs text-slate-500 mt-1">
          {description}
        </p>
      )}
    </Card>
  )
}

function EmptyChart({ icon, title, text }) {
  return (
    <div className="py-8 text-center">
      <div className="text-2xl mb-2">{icon}</div>

      <p className="text-sm font-medium text-slate-700">
        {title}
      </p>

      <p className="text-xs text-slate-500 mt-1">
        {text}
      </p>
    </div>
  )
}

export default function InsightsPage({ auth }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState("")

  useEffect(() => {
    setErr("")

    api("/insights", undefined, auth.token)
      .then(setData)
      .catch((e) => setErr(e.message || "Unable to load insights"))
  }, [auth.token])

  if (err) {
    return (
      <div className="p-6 max-w-6xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex gap-3">
            <span className="text-red-600">⚠</span>

            <div>
              <p className="font-medium text-red-800">
                Unable to load insights
              </p>

              <p className="text-sm text-red-700 mt-1">
                {err}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 max-w-6xl">
        <Card>
          <div className="py-10 text-center">
            <div className="text-3xl animate-pulse mb-3">
              📊
            </div>

            <p className="font-medium text-slate-800">
              Loading sales insights...
            </p>

            <p className="text-sm text-slate-500 mt-1">
              Preparing your workspace intelligence.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  const totals = data.totals || {}

  const stageBreakdown = data.stage_breakdown || []
  const sentimentBreakdown = data.sentiment_breakdown || []
  const typeBreakdown = data.type_breakdown || []
  const learningCurve = data.learning_curve || []

  const maxStage = Math.max(
    1,
    ...stageBreakdown.map((s) => s.count)
  )

  const maxSent = Math.max(
    1,
    ...sentimentBreakdown.map((s) => s.count)
  )

  const maxType = Math.max(
    1,
    ...typeBreakdown.map((s) => s.count)
  )

  const maxMem = Math.max(
    1,
    ...learningCurve.map((l) => l.n_memories)
  )

  return (
    <div className="p-6 space-y-6 max-w-6xl">

      {/* Header */}
      <PageHeader
        title="Insights"
        subtitle="Understand your sales activity and how DealMind's intelligence is being used across the workspace."
      />

      {/* Overview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-slate-900">
              Workspace overview
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              A snapshot of your current sales activity.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">

          <StatCard
            label="Customers"
            value={totals.customers ?? 0}
            description="Accounts tracked"
          />

          <StatCard
            label="Deals"
            value={totals.deals ?? 0}
            description="Deals in workspace"
          />

          <StatCard
            label="Interactions"
            value={totals.interactions ?? 0}
            description="Customer interactions"
          />

          <StatCard
            label="Agent runs"
            value={totals.agent_runs ?? 0}
            description="AI analysis runs"
          />

          <StatCard
            label="Avg. memories"
            value={totals.avg_memories_per_run ?? 0}
            description="Recalled per agent run"
          />

        </div>
      </div>

      {/* Deal & customer activity */}
      <div className="grid lg:grid-cols-2 gap-5">

        <Card>
          <div className="mb-5">
            <h3 className="font-semibold text-slate-900">
              Deals by stage
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Current distribution of deals across the sales pipeline.
            </p>
          </div>

          {stageBreakdown.length ? (
            <div className="space-y-3">
              {stageBreakdown.map((s) => (
                <Bar
                  key={s.stage}
                  label={s.stage}
                  value={s.count}
                  max={maxStage}
                />
              ))}
            </div>
          ) : (
            <EmptyChart
              icon="📈"
              title="No deal data yet"
              text="Create deals to start building your pipeline insights."
            />
          )}
        </Card>

        <Card>
          <div className="mb-5">
            <h3 className="font-semibold text-slate-900">
              Interaction sentiment
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Sentiment distribution across recorded customer interactions.
            </p>
          </div>

          {sentimentBreakdown.length ? (
            <div className="space-y-3">
              {sentimentBreakdown.map((s) => (
                <Bar
                  key={s.sentiment}
                  label={s.sentiment}
                  value={s.count}
                  max={maxSent}
                  color={
                    SENT_COLOR[s.sentiment] ||
                    "bg-indigo-500"
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyChart
              icon="💬"
              title="No interaction data yet"
              text="Record customer conversations to see sentiment trends."
            />
          )}
        </Card>

      </div>

      {/* Interaction analysis */}
      <Card>
        <div className="mb-5">
          <h3 className="font-semibold text-slate-900">
            Interaction activity
          </h3>

          <p className="text-sm text-slate-500 mt-1">
            See which types of customer interactions your team records.
          </p>
        </div>

        {typeBreakdown.length ? (
          <div className="space-y-3">
            {typeBreakdown.map((s) => (
              <Bar
                key={s.type}
                label={s.type}
                value={s.count}
                max={maxType}
                color="bg-sky-500"
              />
            ))}
          </div>
        ) : (
          <EmptyChart
            icon="📝"
            title="No interactions recorded"
            text="Calls, meetings, emails and other interactions will appear here."
          />
        )}
      </Card>

      {/* Learning curve */}
      <Card>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-5">

          <div>
            <h3 className="font-semibold text-slate-900">
              DealMind learning activity
            </h3>

            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Track how much remembered customer context is being retrieved
              across AI agent runs.
            </p>
          </div>

          {learningCurve.length > 0 && (
            <span className="px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-medium text-indigo-700">
              {learningCurve.length} runs recorded
            </span>
          )}

        </div>

        {learningCurve.length ? (
          <div className="space-y-3">
            {learningCurve.map((l) => (
              <Bar
                key={l.run}
                label={`Run ${l.run} · ${l.n_interactions} interactions`}
                value={l.n_memories}
                max={maxMem}
                color="bg-emerald-500"
              />
            ))}
          </div>
        ) : (
          <EmptyChart
            icon="🧠"
            title="Learning activity will appear here"
            text="Run the AI Sales Agent after recording customer interactions to build this view."
          />
        )}

      </Card>

      {/* Product story */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">

        <div className="flex gap-4">

          <div className="h-10 w-10 rounded-xl bg-white border border-indigo-100 flex items-center justify-center text-lg shrink-0">
            ✦
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">
              From activity to intelligence
            </h3>

            <p className="text-sm text-slate-600 mt-1 leading-6">
              DealMind combines customer interactions with remembered context
              so your sales team can move from simply recording conversations
              to using those conversations in future decisions.
            </p>
          </div>

        </div>

      </div>

    </div>
  )
}