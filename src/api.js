const API_BASE = import.meta.env.VITE_API_URL || ""

export async function api(path, body, token) {
  const headers = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = "Bearer " + token

  const opts =
    body !== undefined
      ? { method: "POST", headers, body: JSON.stringify(body) }
      : { headers }

  const r = await fetch(API_BASE + "/api" + path, opts)
  const data = await r.json().catch(() => ({}))

  if (!r.ok) throw new Error(data.detail || r.statusText || "Request failed")
  return data
}

export async function apiDelete(path, token) {
  const r = await fetch(API_BASE + "/api" + path, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token },
  })

  const data = await r.json().catch(() => ({}))

  if (!r.ok) throw new Error(data.detail || r.statusText || "Request failed")
  return data
}
