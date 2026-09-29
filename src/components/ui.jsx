export const Card = ({ t, children, c = "" }) => (
  <div className={`bg-white rounded-xl border border-slate-200 p-5 shadow-sm ${c}`}>
    {t && <h3 className="font-semibold text-slate-800 mb-3">{t}</h3>}
    {children}
  </div>
)

export const Btn = ({ busy, className = "", children, ...p }) => (
  <button
    {...p}
    disabled={busy || p.disabled}
    className={`px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 ${className}`}
  >
    {busy ? "Working…" : children}
  </button>
)

export const Mem = ({ m }) => (
  <li className="text-sm border-l-2 border-indigo-400 pl-3 py-1 text-slate-700">
    {m.text}
    <span className="block text-xs text-slate-400">{m.type || "memory"} {m.date}</span>
  </li>
)

export const List = ({ v }) =>
  Array.isArray(v) ? (
    <ul className="list-disc pl-5 text-sm space-y-1">{v.map((x, i) => <li key={i}>{typeof x === "string" ? x : JSON.stringify(x)}</li>)}</ul>
  ) : (
    <p className="text-sm">{v}</p>
  )

export const Bar = ({ label, value, max, color = "bg-indigo-500" }) => (
  <div>
    <div className="flex justify-between text-xs text-slate-500 mb-1"><span>{label}</span><span>{value}</span></div>
    <div className="h-2 rounded bg-slate-100 overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
    </div>
  </div>
)

export const PageHeader = ({ title, subtitle }) => (
  <div className="mb-1">
    <h1 className="text-xl font-bold text-slate-900">{title}</h1>
    {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
  </div>
)
