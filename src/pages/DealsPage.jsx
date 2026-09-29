import { useEffect, useState, useCallback } from "react"
import { api, apiDelete } from "../api.js"
import { Card, PageHeader } from "../components/ui.jsx"

export default function DealsPage({ auth, goTo }) {
  const [deals, setDeals] = useState(null)
  const [pipelines, setPipelines] = useState([])
  const [err, setErr] = useState("")
  const [search, setSearch] = useState("")
  const [pipelineFilter, setPipelineFilter] = useState("All")
  const [stageFilter, setStageFilter] = useState("All")

  const [showPipelineManager, setShowPipelineManager] = useState(false)

  const [selectedPipelineId, setSelectedPipelineId] = useState(null)

  const [newStageName, setNewStageName] = useState("")
  const [editingStageId, setEditingStageId] = useState(null)
  const [editingStageName, setEditingStageName] = useState("")

  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      api("/deals", undefined, auth.token),
      api("/pipelines", undefined, auth.token),
    ])
      .then(([dealData, pipelineData]) => {
        setDeals(dealData)
        setPipelines(pipelineData)

        if (
          !selectedPipelineId &&
          pipelineData.length
        ) {
          setSelectedPipelineId(
            pipelineData[0].id
          )
        }
      })
      .catch((e) => setErr(e.message))
  }, [auth.token, selectedPipelineId])

  useEffect(() => {
    load()
  }, [load])

  const remove = async (id) => {
    if (
      !confirm(
        "Delete this deal and its interactions?"
      )
    ) {
      return
    }

    try {
      await apiDelete(
        `/deals/${id}`,
        auth.token
      )

      await load()
    } catch (e) {
      setErr(e.message)
    }
  }

  const updateDealStage = async (
    dealId,
    stage
  ) => {
    try {
      setErr("")

      await api(
        `/deals/${dealId}/stage`,
        {
          method: "PUT",
          body: JSON.stringify({
            stage,
          }),
        },
        auth.token
      )

      await load()
    } catch (e) {
      setErr(e.message)
    }
  }

  const addStage = async () => {
    const name = newStageName.trim()

    if (!name || !selectedPipelineId) {
      return
    }

    try {
      setSaving(true)
      setErr("")

      await api(
        `/pipelines/${selectedPipelineId}/stages`,
        {
          method: "POST",
          body: JSON.stringify({
            name,
          }),
        },
        auth.token
      )

      setNewStageName("")

      await load()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (stage) => {
    setEditingStageId(stage.id)
    setEditingStageName(stage.name)
  }

  const cancelEdit = () => {
    setEditingStageId(null)
    setEditingStageName("")
  }

  const saveStage = async (stage) => {
    const name = editingStageName.trim()

    if (!name) {
      return
    }

    try {
      setSaving(true)
      setErr("")

      await api(
        `/pipeline-stages/${stage.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name,
            is_won: Boolean(stage.is_won),
            is_lost: Boolean(stage.is_lost),
          }),
        },
        auth.token
      )

      cancelEdit()

      await load()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteStage = async (stage) => {
    if (
      !confirm(
        `Delete the "${stage.name}" stage?`
      )
    ) {
      return
    }

    try {
      setSaving(true)
      setErr("")

      await apiDelete(
        `/pipeline-stages/${stage.id}`,
        auth.token
      )

      await load()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const moveStage = async (
    stages,
    index,
    direction
  ) => {
    const newIndex =
      direction === "up"
        ? index - 1
        : index + 1

    if (
      newIndex < 0 ||
      newIndex >= stages.length
    ) {
      return
    }

    const reordered = [...stages]

    const temp = reordered[index]

    reordered[index] = reordered[newIndex]
    reordered[newIndex] = temp

    try {
      setSaving(true)
      setErr("")

      await api(
        `/pipelines/${selectedPipelineId}/stages/reorder`,
        {
          method: "PUT",
          body: JSON.stringify({
            ordered_ids:
              reordered.map((s) => s.id),
          }),
        },
        auth.token
      )

      await load()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const selectedPipeline =
    pipelines.find(
      (p) => p.id === selectedPipelineId
    ) || pipelines[0]

  const stages =
    selectedPipeline?.stages || []

  const stageColor = (stage) => {
    const lower =
      stage?.toLowerCase() || ""

    if (
      lower.includes("won") ||
      lower === "closed"
    ) {
      return "bg-emerald-100 text-emerald-700"
    }

    if (
      lower.includes("lost")
    ) {
      return "bg-red-100 text-red-700"
    }

    if (
      lower.includes("negotiat")
    ) {
      return "bg-amber-100 text-amber-700"
    }

    if (
      lower.includes("proposal") ||
      lower.includes("demo")
    ) {
      return "bg-blue-100 text-blue-700"
    }

    return "bg-slate-100 text-slate-700"
  }

  const filteredDeals =
    deals?.filter((d) => {
      const q =
        search.toLowerCase().trim()

      const matchesSearch =
        !q ||
        d.customer
          ?.toLowerCase()
          .includes(q) ||
        d.product
          ?.toLowerCase()
          .includes(q)

      const matchesPipeline =
        pipelineFilter === "All" ||
        String(d.pipeline_id) ===
          String(pipelineFilter)

      const matchesStage =
        stageFilter === "All" ||
        d.stage === stageFilter

      return (
        matchesSearch &&
        matchesPipeline &&
        matchesStage
      )
    }) || []

  const totalDeals =
    deals?.length || 0

  const activeDeals =
    deals?.filter(
      (d) =>
        !d.stage_is_won &&
        !d.stage_is_lost
    ).length || 0

  const wonDeals =
    deals?.filter(
      (d) =>
        Boolean(d.stage_is_won) ||
        d.stage
          ?.toLowerCase()
          .includes("won")
    ).length || 0

  const lostDeals =
    deals?.filter(
      (d) =>
        Boolean(d.stage_is_lost) ||
        d.stage
          ?.toLowerCase()
          .includes("lost")
    ).length || 0

  return (
    <div className="p-6 space-y-6 max-w-6xl">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <PageHeader
          title="Deals"
          subtitle="Track opportunities across your customer accounts"
        />

        {pipelines.length > 0 && (
          <button
            onClick={() =>
              setShowPipelineManager(
                !showPipelineManager
              )
            }
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {showPipelineManager
              ? "Close pipeline settings"
              : "Customize pipeline"}
          </button>
        )}
      </div>

      {/* Error */}
      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {err}
        </div>
      )}

      {/* Pipeline Manager */}
      {showPipelineManager &&
        selectedPipeline && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

              <div>
                <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">
                  Sales pipeline
                </p>

                <h2 className="text-lg font-semibold text-slate-900 mt-1">
                  {selectedPipeline.name}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Customize the stages your sales team uses.
                </p>
              </div>

              <select
                value={
                  selectedPipelineId ||
                  selectedPipeline.id
                }
                onChange={(e) => {
                  setSelectedPipelineId(
                    Number(e.target.value)
                  )
                  setStageFilter("All")
                }}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                {pipelines.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                  >
                    {p.name}
                  </option>
                ))}
              </select>

            </div>

            {/* Add stage */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">

              <p className="text-sm font-medium text-slate-800">
                Add a stage
              </p>

              <div className="flex flex-col sm:flex-row gap-2 mt-3">

                <input
                  value={newStageName}
                  onChange={(e) =>
                    setNewStageName(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter"
                    ) {
                      addStage()
                    }
                  }}
                  placeholder="Example: Security Review"
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                <button
                  onClick={addStage}
                  disabled={
                    saving ||
                    !newStageName.trim()
                  }
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium"
                >
                  Add stage
                </button>

              </div>

            </div>

            {/* Stage list */}
            <div>
              <div className="flex items-center justify-between mb-3">

                <p className="text-sm font-semibold text-slate-900">
                  Pipeline stages
                </p>

                <span className="text-xs text-slate-400">
                  {stages.length}{" "}
                  {stages.length === 1
                    ? "stage"
                    : "stages"}
                </span>

              </div>

              <div className="space-y-2">

                {stages.map(
                  (stage, index) => (
                    <div
                      key={stage.id}
                      className="border border-slate-200 rounded-lg p-3 bg-white"
                    >

                      {editingStageId ===
                      stage.id ? (
                        <div className="flex flex-col sm:flex-row gap-2">

                          <input
                            autoFocus
                            value={
                              editingStageName
                            }
                            onChange={(e) =>
                              setEditingStageName(
                                e.target.value
                              )
                            }
                            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                          />

                          <button
                            onClick={() =>
                              saveStage(
                                stage
                              )
                            }
                            disabled={saving}
                            className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium"
                          >
                            Save
                          </button>

                          <button
                            onClick={
                              cancelEdit
                            }
                            className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium"
                          >
                            Cancel
                          </button>

                        </div>
                      ) : (
                        <div className="flex items-center gap-3">

                          {/* Reorder */}
                          <div className="flex flex-col gap-1">

                            <button
                              disabled={
                                index === 0 ||
                                saving
                              }
                              onClick={() =>
                                moveStage(
                                  stages,
                                  index,
                                  "up"
                                )
                              }
                              className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30"
                            >
                              ▲
                            </button>

                            <button
                              disabled={
                                index ===
                                  stages.length -
                                    1 ||
                                saving
                              }
                              onClick={() =>
                                moveStage(
                                  stages,
                                  index,
                                  "down"
                                )
                              }
                              className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30"
                            >
                              ▼
                            </button>

                          </div>

                          <div className="flex-1 min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <span
                                className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium ${stageColor(
                                  stage.name
                                )}`}
                              >
                                {stage.name}
                              </span>

                              {Boolean(
                                stage.is_won
                              ) && (
                                <span className="text-[11px] text-emerald-600">
                                  Won stage
                                </span>
                              )}

                              {Boolean(
                                stage.is_lost
                              ) && (
                                <span className="text-[11px] text-red-600">
                                  Lost stage
                                </span>
                              )}

                            </div>

                            <p className="text-xs text-slate-400 mt-1">
                              Position {index + 1}
                            </p>

                          </div>

                          <button
                            onClick={() =>
                              startEdit(
                                stage
                              )
                            }
                            className="text-xs text-slate-500 hover:text-indigo-600"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              deleteStage(
                                stage
                              )
                            }
                            className="text-xs text-slate-400 hover:text-red-600"
                          >
                            Delete
                          </button>

                        </div>
                      )}

                    </div>
                  )
                )}

              </div>
            </div>

          </div>
        )}

      {/* Summary */}
      {deals?.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

          <Card>
            <p className="text-xs text-slate-500">
              Total deals
            </p>

            <p className="text-2xl font-semibold text-slate-900 mt-1">
              {totalDeals}
            </p>
          </Card>

          <Card>
            <p className="text-xs text-slate-500">
              Active pipeline
            </p>

            <p className="text-2xl font-semibold text-slate-900 mt-1">
              {activeDeals}
            </p>
          </Card>

          <Card>
            <p className="text-xs text-slate-500">
              Closed won
            </p>

            <p className="text-2xl font-semibold text-emerald-600 mt-1">
              {wonDeals}
            </p>
          </Card>

          <Card>
            <p className="text-xs text-slate-500">
              Closed lost
            </p>

            <p className="text-2xl font-semibold text-red-500 mt-1">
              {lostDeals}
            </p>
          </Card>

        </div>
      )}

      {/* Search + Filters */}
      {deals?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col lg:flex-row gap-3">

          <input
            type="text"
            placeholder="Search by customer or product..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm flex-1 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />

          <select
            value={pipelineFilter}
            onChange={(e) => {
              setPipelineFilter(
                e.target.value
              )
              setStageFilter("All")
            }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm lg:w-52"
          >
            <option value="All">
              All pipelines
            </option>

            {pipelines.map((p) => (
              <option
                key={p.id}
                value={p.id}
              >
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={stageFilter}
            onChange={(e) =>
              setStageFilter(
                e.target.value
              )
            }
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm lg:w-52"
          >
            <option value="All">
              All stages
            </option>

            {(
              pipelineFilter !== "All"
                ? pipelines.find(
                    (p) =>
                      String(p.id) ===
                      String(
                        pipelineFilter
                      )
                  )?.stages || []
                : stages
            ).map((stage) => (
              <option
                key={stage.id}
                value={stage.name}
              >
                {stage.name}
              </option>
            ))}
          </select>

        </div>
      )}

      {/* Loading */}
      {!deals && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-sm text-slate-500">
            Loading deals…
          </p>
        </div>
      )}

      {/* Empty State */}
      {deals && !deals.length && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">

          <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-xl">
            $
          </div>

          <h3 className="mt-4 font-semibold text-slate-900">
            No deals yet
          </h3>

          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Create a deal from a customer account to start
            tracking your sales opportunities.
          </p>

          <button
            onClick={() =>
              goTo("customers")
            }
            className="mt-5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
          >
            Go to customers
          </button>

        </div>
      )}

      {/* No Search Results */}
      {deals?.length > 0 &&
        filteredDeals.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">

            <p className="font-medium text-slate-800">
              No matching deals
            </p>

            <p className="text-sm text-slate-500 mt-1">
              Try changing your search or stage filter.
            </p>

          </div>
        )}

      {/* Deal Cards */}
      <div className="grid md:grid-cols-2 gap-4">

        {filteredDeals.map((d) => (
          <div
            key={d.id}
            className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition"
          >

            {/* Deal Header */}
            <div className="flex items-start justify-between gap-3">

              <div className="min-w-0">

                <p className="text-xs text-slate-400 uppercase tracking-wide">
                  Customer
                </p>

                <h3 className="font-semibold text-slate-900 mt-1 truncate">
                  {d.customer}
                </h3>

              </div>

              <button
                onClick={() =>
                  remove(d.id)
                }
                className="text-xs text-slate-400 hover:text-red-600"
              >
                Delete
              </button>

            </div>

            {/* Pipeline */}
            <div className="mt-4">

              <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">
                Pipeline
              </p>

              <p className="text-xs font-medium text-slate-600">
                {d.pipeline_name ||
                  "Default Sales Pipeline"}
              </p>

            </div>

            {/* Stage */}
            <div className="mt-3">

              <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">
                Stage
              </p>

              <select
                value={d.stage || ""}
                onChange={(e) =>
                  updateDealStage(
                    d.id,
                    e.target.value
                  )
                }
                className={`text-xs px-3 py-2 rounded-lg font-medium border border-transparent ${stageColor(
                  d.stage
                )} outline-none cursor-pointer`}
              >

                {(
                  pipelines.find(
                    (p) =>
                      p.id ===
                      d.pipeline_id
                  )?.stages ||
                  []
                ).map((stage) => (
                  <option
                    key={stage.id}
                    value={stage.name}
                  >
                    {stage.name}
                  </option>
                ))}

                {!pipelines.find(
                  (p) =>
                    p.id ===
                    d.pipeline_id
                ) && (
                  <option
                    value={d.stage}
                  >
                    {d.stage}
                  </option>
                )}

              </select>

            </div>

            {/* Deal Information */}
            <div className="grid grid-cols-2 gap-3 mt-4">

              <div className="bg-slate-50 rounded-lg p-3">

                <p className="text-xs text-slate-400">
                  Deal value
                </p>

                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {d.value ||
                    "Not set"}
                </p>

              </div>

              <div className="bg-slate-50 rounded-lg p-3">

                <p className="text-xs text-slate-400">
                  Product / solution
                </p>

                <p className="text-sm font-medium text-slate-800 mt-1 truncate">
                  {d.product ||
                    "Not specified"}
                </p>

              </div>

            </div>

            {/* Interactions */}
            <div className="mt-4 flex items-center justify-between">

              <p className="text-xs text-slate-500">
                {d.n}{" "}
                {d.n === 1
                  ? "interaction"
                  : "interactions"}{" "}
                logged
              </p>

              <span className="text-xs text-slate-400">
                {d.stage_is_won
                  ? "Won"
                  : d.stage_is_lost
                    ? "Lost"
                    : "Active opportunity"}
              </span>

            </div>

            {/* Actions */}
            <div className="border-t border-slate-100 mt-4 pt-4 flex flex-wrap gap-2">

              <button
                className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium hover:bg-indigo-100"
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
                className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700"
                onClick={() =>
                  goTo(
                    "agent",
                    d.id
                  )
                }
              >
                Open AI Agent
              </button>

              <button
                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50"
                onClick={() =>
                  goTo(
                    "prep",
                    d.id
                  )
                }
              >
                Meeting Prep
              </button>

            </div>

          </div>
        ))}

      </div>

    </div>
  )
}