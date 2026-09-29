const NAV = [
  ["dashboard", "Dashboard", "▦"],
  ["customers", "Customers", "◉"],
  ["deals", "Deals", "◇"],
  ["interactions", "Interactions", "◌"],
  ["agent", "AI Sales Agent", "✦"],
  ["prep", "Meeting Prep", "◫"],
  ["memory", "Memory", "◎"],
  ["insights", "Insights", "◒"],
  ["team", "Team", "♙"],
]

const ICON_COLORS = {
  dashboard: "text-blue-500",
  customers: "text-violet-500",
  deals: "text-amber-500",
  interactions: "text-cyan-500",
  agent: "text-fuchsia-500",
  prep: "text-emerald-500",
  memory: "text-indigo-500",
  insights: "text-orange-500",
  team: "text-rose-500",
}

export default function Sidebar({ page, setPage, auth, onLogout }) {
  const initials = auth?.user?.email
    ? auth.user.email.slice(0, 2).toUpperCase()
    : "DM"

  return (
    <aside className="w-52 shrink-0 bg-white text-slate-700 flex flex-col min-h-screen border-r border-slate-200">

      {/* ==================== BRAND ==================== */}
      <div className="px-4 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">

          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 via-indigo-400 to-blue-400 flex items-center justify-center shadow-sm">
            <span className="text-sm font-bold text-white">
              D
            </span>
          </div>

          <div className="min-w-0">
            <p className="font-bold text-base text-slate-900 leading-tight">
              DealMind
            </p>

            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {auth?.org?.name || "Workspace"}
            </p>
          </div>

        </div>
      </div>

      {/* ==================== NAVIGATION ==================== */}
      <nav className="flex-1 px-2.5 py-4">

        <p className="px-2.5 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Workspace
        </p>

        <div className="space-y-0.5">

          {NAV.map(([id, label, icon]) => {

            const active = page === id

            return (
              <button
                key={id}
                onClick={() => setPage(id)}
                className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all duration-150 ${
                  active
                    ? "bg-gradient-to-r from-violet-50 to-indigo-50 text-indigo-700 font-medium"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >

                {/* Icon */}
                <span
                  className={`w-6 h-6 flex items-center justify-center rounded-md text-sm ${
                    active
                      ? "text-indigo-600"
                      : ICON_COLORS[id]
                  }`}
                >
                  {icon}
                </span>

                {/* Label */}
                <span className="flex-1 text-left">
                  {label}
                </span>

                {/* Active indicator */}
                {active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                )}

              </button>
            )
          })}

        </div>
      </nav>

      {/* ==================== USER SECTION ==================== */}
      <div className="border-t border-slate-200 p-3">

        {/* User */}
        <div className="flex items-center gap-2.5 px-1 py-2">

          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 border border-indigo-100 flex items-center justify-center text-[10px] font-semibold text-indigo-600 shrink-0">
            {initials}
          </div>

          <div className="min-w-0 flex-1">

            <p className="text-xs text-slate-700 truncate">
              {auth?.user?.email}
            </p>

            <p className="text-[10px] text-slate-400 mt-0.5">
              Workspace member
            </p>

          </div>

        </div>

        {/* Workspace ID */}
        <div className="mt-2 mb-2 rounded-md bg-slate-50 border border-slate-200 px-2.5 py-1.5">

          <p className="text-[9px] uppercase tracking-wide text-slate-400">
            Workspace ID
          </p>

          <p className="text-[10px] font-mono text-slate-600 truncate mt-0.5">
            {auth?.org?.slug}
          </p>

        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full rounded-lg py-2 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-800 border border-slate-200 transition"
        >
          Log out
        </button>

      </div>

    </aside>
  )
}