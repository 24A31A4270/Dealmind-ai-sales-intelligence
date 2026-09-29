import { useEffect, useState } from "react"
import { api } from "../api.js"

export default function DealPicker({ auth, dealId, onChange }) {
  const [deals, setDeals] = useState(null)
  const [err, setErr] = useState("")

  useEffect(() => {
    api("/deals", undefined, auth.token).then((d) => {
      setDeals(d)
      if (!dealId && d.length) onChange(d[0].id)
    }).catch((e) => setErr(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (err) return <p className="text-sm text-red-600">{err}</p>
  if (!deals) return <p className="text-sm text-slate-500">Loading deals…</p>
  if (!deals.length) return <p className="text-sm text-slate-500">No deals yet. Create a customer and a deal first.</p>

  return (
    <select
      value={dealId || ""}
      onChange={(e) => onChange(Number(e.target.value))}
      className="border border-slate-300 rounded-lg p-2 text-sm bg-white"
    >
      {deals.map((d) => (
        <option key={d.id} value={d.id}>{d.customer} — {d.stage} ({d.n} interaction{d.n === 1 ? "" : "s"})</option>
      ))}
    </select>
  )
}
