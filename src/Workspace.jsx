import { useState } from "react"
import Sidebar from "./components/Sidebar.jsx"
import DashboardPage from "./pages/DashboardPage.jsx"
import CustomersPage from "./pages/CustomersPage.jsx"
import DealsPage from "./pages/DealsPage.jsx"
import InteractionsPage from "./pages/InteractionsPage.jsx"
import AgentPage from "./pages/AgentPage.jsx"
import MeetingPrepPage from "./pages/MeetingPrepPage.jsx"
import MemoryPage from "./pages/MemoryPage.jsx"
import InsightsPage from "./pages/InsightsPage.jsx"
import TeamPage from "./pages/TeamPage.jsx"

export default function Workspace({ auth, initialDealId, onLogout }) {
  const [page, setPage] = useState("dashboard")
  const [dealId, setDealId] = useState(initialDealId || null)

  const goTo = (p, dId) => { setPage(p); if (dId) setDealId(dId) }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar page={page} setPage={setPage} auth={auth} onLogout={onLogout} />
      <div className="flex-1 overflow-y-auto">
        {page === "dashboard" && <DashboardPage auth={auth} goTo={goTo} />}
        {page === "customers" && <CustomersPage auth={auth} goTo={goTo} />}
        {page === "deals" && <DealsPage auth={auth} goTo={goTo} />}
        {page === "interactions" && <InteractionsPage auth={auth} dealId={dealId} setDealId={setDealId} />}
        {page === "agent" && <AgentPage auth={auth} dealId={dealId} setDealId={setDealId} />}
        {page === "prep" && <MeetingPrepPage auth={auth} dealId={dealId} setDealId={setDealId} />}
        {page === "memory" && <MemoryPage auth={auth} dealId={dealId} setDealId={setDealId} />}
        {page === "insights" && <InsightsPage auth={auth} />}
        {page === "team" && <TeamPage auth={auth} />}
      </div>
    </div>
  )
}
