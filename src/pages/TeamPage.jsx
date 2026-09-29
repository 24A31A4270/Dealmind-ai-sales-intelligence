import { useEffect, useState } from "react"
import { api } from "../api.js"
import { Card, PageHeader } from "../components/ui.jsx"

function MemberAvatar({ name, email }) {
  const value = (name || email || "?").trim()

  return (
    <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700 shrink-0">
      {value.charAt(0).toUpperCase()}
    </div>
  )
}

function formatDate(value) {
  if (!value) return "—"

  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return value
  }
}

export default function TeamPage({ auth }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setErr("")

    api("/team", undefined, auth.token)
      .then(setData)
      .catch((e) => {
        setErr(e.message || "Unable to load team information")
      })
  }, [auth.token])

  const copyWorkspaceId = async () => {
    try {
      await navigator.clipboard?.writeText(auth.org.slug)
      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 1800)
    } catch {
      setErr("Unable to copy the workspace ID")
    }
  }

  const members = data?.members || []

  return (
    <div className="p-6 space-y-6 max-w-6xl">

      {/* Header */}
      <PageHeader
        title="Team & Workspace"
        subtitle="Manage your sales workspace and collaborate with your team."
      />

      {/* Error */}
      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex gap-3">

            <span className="text-red-600">⚠</span>

            <div>
              <p className="font-medium text-red-800">
                Something went wrong
              </p>

              <p className="text-sm text-red-700 mt-1">
                {err}
              </p>
            </div>

          </div>
        </div>
      )}

      {/* Workspace overview */}
      <div className="grid md:grid-cols-3 gap-4">

        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Workspace
          </p>

          <p className="text-lg font-semibold text-slate-900 mt-2 truncate">
            {auth.org.name}
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Your sales workspace
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Team members
          </p>

          <p className="text-2xl font-semibold text-slate-900 mt-2">
            {data ? members.length : "—"}
          </p>

          <p className="text-xs text-slate-500 mt-1">
            People in this workspace
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Workspace ID
          </p>

          <p className="text-sm font-mono font-medium text-slate-800 mt-3 truncate">
            {auth.org.slug}
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Used to join this workspace
          </p>
        </Card>

      </div>

      {/* Invite teammates */}
      <Card>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

          <div className="flex gap-4">

            <div className="h-11 w-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl shrink-0">
              👥
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Invite teammates
              </h2>

              <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-6">
                Share your workspace ID with teammates so they can join the
                same sales workspace and work with the same customers, deals
                and shared context.
              </p>
            </div>

          </div>

          <button
            onClick={copyWorkspaceId}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium border transition ${
              copied
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            }`}
          >
            {copied ? "✓ Copied" : "Copy workspace ID"}
          </button>

        </div>

        <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200 p-4">

          <p className="text-xs font-medium text-slate-500 mb-2">
            Workspace ID
          </p>

          <div className="flex items-center gap-3">

            <code className="flex-1 min-w-0 font-mono text-sm text-slate-800 break-all">
              {auth.org.slug}
            </code>

            <button
              onClick={copyWorkspaceId}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              Copy
            </button>

          </div>

        </div>

      </Card>

      {/* Members */}
      <Card>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">

          <div>
            <h2 className="font-semibold text-slate-900">
              Team members
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              People currently working in this workspace.
            </p>
          </div>

          {data && (
            <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
              {members.length}{" "}
              {members.length === 1 ? "member" : "members"}
            </span>
          )}

        </div>

        {!data ? (
          <div className="py-10 text-center">

            <div className="text-2xl animate-pulse mb-3">
              👥
            </div>

            <p className="text-sm font-medium text-slate-700">
              Loading team...
            </p>

          </div>
        ) : members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">

            <div className="text-3xl mb-3">
              👥
            </div>

            <p className="font-medium text-slate-800">
              No teammates yet
            </p>

            <p className="text-sm text-slate-500 mt-1">
              Share the workspace ID above to invite your first teammate.
            </p>

          </div>
        ) : (
          <div className="divide-y divide-slate-100">

            {members.map((member) => (

              <div
                key={member.id}
                className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
              >

                <div className="flex items-center gap-3 min-w-0">

                  <MemberAvatar
                    name={member.name}
                    email={member.email}
                  />

                  <div className="min-w-0">

                    <p className="font-medium text-sm text-slate-900 truncate">
                      {member.name || member.email}
                    </p>

                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {member.email}
                    </p>

                  </div>

                </div>

                <div className="text-right shrink-0">

                  <span className="inline-flex px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">
                    Member
                  </span>

                  <p className="text-xs text-slate-400 mt-1">
                    Joined {formatDate(member.created_at)}
                  </p>

                </div>

              </div>

            ))}

          </div>
        )}

      </Card>

      {/* Collaboration note */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">

        <div className="flex gap-4">

          <div className="h-10 w-10 rounded-xl bg-white border border-indigo-100 flex items-center justify-center text-lg shrink-0">
            ✦
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">
              One workspace, shared customer context
            </h3>

            <p className="text-sm text-slate-600 mt-1 leading-6">
              Your team can work from the same customer and deal information,
              making conversations easier to continue even when accounts move
              between team members.
            </p>
          </div>

        </div>

      </div>

    </div>
  )
}