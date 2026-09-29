import { useEffect, useState, useCallback } from "react"
import { api, apiDelete } from "../api.js"
import { Card, Btn, PageHeader } from "../components/ui.jsx"

const Input = (p) => (
  <input
    {...p}
    className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
  />
)

export default function CustomersPage({ auth, goTo }) {
  const [customers, setCustomers] = useState(null)
  const [open, setOpen] = useState(null)
  const [detail, setDetail] = useState(null)
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showDealForm, setShowDealForm] = useState(false)
  const [search, setSearch] = useState("")

  const [f, setF] = useState({
    name: "",
    industry: "",
    website: "",
    notes: "",
  })

  const [df, setDf] = useState({
    value: "",
    stage: "Discovery",
    product: "",
  })

  const load = useCallback(() => {
    api("/customers", undefined, auth.token)
      .then(setCustomers)
      .catch((e) => setErr(e.message))
  }, [auth.token])

  useEffect(() => {
    load()
  }, [load])

  const openCustomer = async (id) => {
    if (open === id) {
      setOpen(null)
      setDetail(null)
      setShowDealForm(false)
      return
    }

    setOpen(id)
    setShowDealForm(false)
    setErr("")

    try {
      setDetail(await api(`/customers/${id}`, undefined, auth.token))
    } catch (e) {
      setErr(e.message)
    }
  }

  const createCustomer = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr("")

    try {
      await api("/customers", f, auth.token)

      setF({
        name: "",
        industry: "",
        website: "",
        notes: "",
      })

      setShowForm(false)
      await load()
    } catch (e2) {
      setErr(e2.message)
    }

    setBusy(false)
  }

  const removeCustomer = async (id) => {
    if (
      !confirm(
        "Delete this customer, its deals and interactions?"
      )
    ) {
      return
    }

    try {
      await apiDelete(`/customers/${id}`, auth.token)
      setOpen(null)
      setDetail(null)
      await load()
    } catch (e) {
      setErr(e.message)
    }
  }

  const createDeal = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr("")

    try {
      const d = await api(
        `/customers/${open}/deals`,
        df,
        auth.token
      )

      setDf({
        value: "",
        stage: "Discovery",
        product: "",
      })

      setShowDealForm(false)

      setDetail(
        await api(
          `/customers/${open}`,
          undefined,
          auth.token
        )
      )

      goTo("interactions", d.id)
    } catch (e2) {
      setErr(e2.message)
    }

    setBusy(false)
  }

  const filteredCustomers =
    customers?.filter((cu) => {
      const q = search.toLowerCase().trim()

      if (!q) return true

      return (
        cu.name?.toLowerCase().includes(q) ||
        cu.industry?.toLowerCase().includes(q) ||
        cu.website?.toLowerCase().includes(q)
      )
    }) || []

  return (
    <div className="p-6 space-y-6 max-w-6xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Customers"
          subtitle="Manage accounts, relationships, and sales opportunities"
        />

        <Btn onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New customer"}
        </Btn>
      </div>

      {/* Error */}
      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {err}
        </div>
      )}

      {/* Search */}
      {customers?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <Input
            placeholder="Search customers by name, industry, or website..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Create Customer */}
      {showForm && (
        <form
          onSubmit={createCustomer}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
        >
          <div className="mb-4">
            <h3 className="font-semibold text-slate-900">
              Add a new customer
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Create an account to start tracking deals and
              customer interactions.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              required
              placeholder="Customer name *"
              value={f.name}
              onChange={(e) =>
                setF({ ...f, name: e.target.value })
              }
            />

            <Input
              placeholder="Industry"
              value={f.industry}
              onChange={(e) =>
                setF({ ...f, industry: e.target.value })
              }
            />

            <Input
              placeholder="Website"
              value={f.website}
              onChange={(e) =>
                setF({ ...f, website: e.target.value })
              }
            />

            <Input
              placeholder="Account notes"
              value={f.notes}
              onChange={(e) =>
                setF({ ...f, notes: e.target.value })
              }
            />
          </div>

          <div className="mt-4">
            <Btn
              busy={busy}
              disabled={!f.name.trim()}
            >
              Create customer
            </Btn>
          </div>
        </form>
      )}

      {/* Loading */}
      {!customers && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-sm text-slate-500">
            Loading customers…
          </p>
        </div>
      )}

      {/* Empty State */}
      {customers && !customers.length && !showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-xl">
            +
          </div>

          <h3 className="mt-4 font-semibold text-slate-900">
            No customers yet
          </h3>

          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Add your first customer to start managing accounts,
            deals, interactions, and sales intelligence.
          </p>

          <Btn
            className="mt-5"
            onClick={() => setShowForm(true)}
          >
            + Add your first customer
          </Btn>
        </div>
      )}

      {/* No Search Results */}
      {customers?.length > 0 &&
        filteredCustomers.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <p className="font-medium text-slate-800">
              No customers found
            </p>

            <p className="text-sm text-slate-500 mt-1">
              Try a different name, industry, or website.
            </p>
          </div>
        )}

      {/* Customer Cards */}
      <div className="grid gap-4">

        {filteredCustomers.map((cu) => (
          <div
            key={cu.id}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-sm transition"
          >

            {/* Main Customer Card */}
            <div className="p-5">

              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

                <button
                  className="text-left flex-1"
                  onClick={() => openCustomer(cu.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold">
                      {cu.name?.charAt(0)?.toUpperCase() || "C"}
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {cu.name}
                      </h3>

                      <p className="text-sm text-slate-500 mt-0.5">
                        {cu.industry || "Industry not specified"}
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => removeCustomer(cu.id)}
                  className="text-xs text-slate-400 hover:text-red-600"
                >
                  Delete
                </button>
              </div>

              {/* Customer Meta */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">

                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-slate-400">
                    Deals
                  </p>

                  <p className="font-semibold text-slate-800 mt-0.5">
                    {cu.n_deals}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-slate-400">
                    Website
                  </p>

                  <p className="font-medium text-slate-700 mt-0.5 truncate">
                    {cu.website || "Not added"}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-lg px-3 py-2 hidden sm:block">
                  <p className="text-xs text-slate-400">
                    Account
                  </p>

                  <p className="font-medium text-slate-700 mt-0.5">
                    Active
                  </p>
                </div>

              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-wrap gap-2">

                <button
                  onClick={() => openCustomer(cu.id)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {open === cu.id
                    ? "Hide details"
                    : "View details"}
                </button>

                <button
                  onClick={() => {
                    if (open !== cu.id) {
                      openCustomer(cu.id)
                    } else {
                      setShowDealForm(true)
                    }
                  }}
                  className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium"
                >
                  + Add deal
                </button>

              </div>
            </div>

            {/* Expanded Details */}
            {open === cu.id && detail && (
              <div className="border-t border-slate-200 bg-slate-50 p-5">

                {/* Account Information */}
                <div className="grid sm:grid-cols-3 gap-3 mb-5">

                  <div>
                    <p className="text-xs text-slate-400">
                      Company
                    </p>

                    <p className="text-sm font-medium text-slate-800 mt-1">
                      {detail.customer.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Industry
                    </p>

                    <p className="text-sm font-medium text-slate-800 mt-1">
                      {detail.customer.industry || "Not specified"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Website
                    </p>

                    <p className="text-sm font-medium text-slate-800 mt-1 truncate">
                      {detail.customer.website || "Not added"}
                    </p>
                  </div>

                </div>

                {/* Notes */}
                {detail.customer.notes && (
                  <div className="bg-white rounded-lg border border-slate-200 p-4 mb-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Account notes
                    </p>

                    <p className="text-sm text-slate-600 mt-2">
                      {detail.customer.notes}
                    </p>
                  </div>
                )}

                {/* Deals */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-slate-800">
                        Deals
                      </h4>

                      <p className="text-xs text-slate-500 mt-0.5">
                        Opportunities associated with this account
                      </p>
                    </div>

                    <span className="text-xs text-slate-400">
                      {detail.deals.length}{" "}
                      {detail.deals.length === 1
                        ? "deal"
                        : "deals"}
                    </span>
                  </div>

                  {detail.deals.length > 0 && (
                    <div className="space-y-2">
                      {detail.deals.map((d) => (
                        <div
                          key={d.id}
                          className="bg-white border border-slate-200 rounded-lg p-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                            <div>
                              <p className="font-medium text-sm text-slate-800">
                                {d.stage}
                              </p>

                              <p className="text-xs text-slate-500 mt-1">
                                {d.value || "Value not set"}
                                {" · "}
                                {d.n}{" "}
                                {d.n === 1
                                  ? "interaction"
                                  : "interactions"}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-3 text-xs">
                              <button
                                className="text-indigo-600 hover:underline"
                                onClick={() =>
                                  goTo(
                                    "interactions",
                                    d.id
                                  )
                                }
                              >
                                Interactions
                              </button>

                              <button
                                className="text-indigo-600 hover:underline"
                                onClick={() =>
                                  goTo("agent", d.id)
                                }
                              >
                                AI Agent
                              </button>

                              <button
                                className="text-indigo-600 hover:underline"
                                onClick={() =>
                                  goTo("prep", d.id)
                                }
                              >
                                Meeting Prep
                              </button>
                            </div>

                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!detail.deals.length && (
                    <div className="bg-white border border-dashed border-slate-300 rounded-lg p-5 text-center">
                      <p className="text-sm font-medium text-slate-700">
                        No deals for this account yet
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        Create an opportunity to start tracking
                        this account's sales journey.
                      </p>
                    </div>
                  )}
                </div>

                {/* Add Deal */}
                <div className="mt-4">

                  <button
                    onClick={() =>
                      setShowDealForm((s) => !s)
                    }
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium"
                  >
                    {showDealForm
                      ? "Cancel"
                      : "+ Add deal"}
                  </button>

                  {showDealForm && (
                    <form
                      onSubmit={createDeal}
                      className="mt-3 bg-white border border-slate-200 rounded-lg p-4"
                    >
                      <h4 className="font-semibold text-slate-800 text-sm">
                        Create a new deal
                      </h4>

                      <div className="grid gap-3 sm:grid-cols-3 mt-3">

                        <Input
                          placeholder="Deal value (e.g. $90,000)"
                          value={df.value}
                          onChange={(e) =>
                            setDf({
                              ...df,
                              value: e.target.value,
                            })
                          }
                        />

                        <select
                          value={df.stage}
                          onChange={(e) =>
                            setDf({
                              ...df,
                              stage: e.target.value,
                            })
                          }
                          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        >
                          {[
                            "Discovery",
                            "Demo",
                            "Negotiation",
                            "Closed Won",
                            "Closed Lost",
                          ].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>

                        <Input
                          placeholder="Product or solution"
                          value={df.product}
                          onChange={(e) =>
                            setDf({
                              ...df,
                              product: e.target.value,
                            })
                          }
                        />

                      </div>

                      <div className="mt-3">
                        <Btn
                          busy={busy}
                          disabled={!df.product.trim()}
                        >
                          Create deal
                        </Btn>
                      </div>
                    </form>
                  )}

                </div>

              </div>
            )}

          </div>
        ))}

      </div>
    </div>
  )
}