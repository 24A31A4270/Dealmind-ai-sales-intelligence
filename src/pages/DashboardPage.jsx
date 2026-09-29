import { useEffect, useState } from "react"
import { api } from "../api.js"
import { Card, PageHeader } from "../components/ui.jsx"

export default function DashboardPage({ auth, goTo }) {
  const [insights, setInsights] = useState(null)
  const [deals, setDeals] = useState(null)
  const [err, setErr] = useState("")

  useEffect(() => {
    api("/insights", undefined, auth.token)
      .then(setInsights)
      .catch((e) => setErr(e.message))

    api("/deals", undefined, auth.token)
      .then(setDeals)
      .catch((e) => setErr(e.message))
  }, [auth.token])

  const stats = insights
    ? [
        ["Customers", insights.totals.customers],
        ["Deals", insights.totals.deals],
        ["Interactions logged", insights.totals.interactions],
        ["AI agent runs", insights.totals.agent_runs],
      ]
    : []

  return (
    <div className="p-6 space-y-6 max-w-6xl">

      {/* Header */}
      <PageHeader
        title={`Welcome back, ${auth.user.name || auth.user.email}`}
        subtitle={`${auth.org.name} · Your sales workspace`}
      />

      {/* Error */}
      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {err}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">
              {value}
            </p>
          </Card>
        ))}
      </div>

      {/* Recent Deals */}
      <Card t="Recent deals">
        {!deals?.length ? (
          <div className="py-5">
            <p className="font-medium text-slate-800">
              No deals yet
            </p>

            <p className="text-sm text-slate-500 mt-1">
              Add a customer and create your first deal to start tracking
              your sales pipeline.
            </p>

            <button
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
              onClick={() => goTo("customers")}
            >
              Add customer
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {deals.slice(0, 6).map((d) => (
              <li
                key={d.id}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">
                    {d.customer}
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    {d.stage}
                    {" · "}
                    {d.value || "Value not set"}
                  </p>
                </div>

                <button
                  className="shrink-0 text-indigo-600 text-xs font-medium hover:underline"
                  onClick={() => goTo("agent", d.id)}
                >
                  Open in AI Agent →
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-800 mb-3">
          Quick actions
        </h2>

        <div className="grid sm:grid-cols-3 gap-4">

          <button
            onClick={() => goTo("customers")}
            className="bg-white border border-slate-200 rounded-xl p-5 text-left hover:border-indigo-200 hover:shadow-sm transition"
          >
            <p className="font-medium text-slate-800">
              + Add a customer
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Start tracking a new account
            </p>
          </button>

          <button
            onClick={() => goTo("interactions")}
            className="bg-white border border-slate-200 rounded-xl p-5 text-left hover:border-indigo-200 hover:shadow-sm transition"
          >
            <p className="font-medium text-slate-800">
              + Log an interaction
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Record a call, email, meeting, or customer update
            </p>
          </button>

          <button
            onClick={() => goTo("insights")}
            className="bg-white border border-slate-200 rounded-xl p-5 text-left hover:border-indigo-200 hover:shadow-sm transition"
          >
            <p className="font-medium text-slate-800">
              View sales insights
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Understand customer and deal activity
            </p>
          </button>

        </div>
      </div>

    </div>
  )
}