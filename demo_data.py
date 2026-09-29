# {c} is replaced with the deal's actual customer name at seed time.
DEMO_INTERACTIONS = [
 {"date": "2026-08-04", "type": "call", "title": "Discovery call",
  "notes": "CTO Priya Nair wants to cut customer onboarding from 6 weeks to 2. CFO Mark Doyle is budget-sensitive and joins later. {c} was burned by a previous vendor with a slow implementation. Priya worries about the security review.",
  "outcome": "Positive - demo agreed"},
 {"date": "2026-08-19", "type": "demo", "title": "Product demo",
  "notes": "Demo with Priya and IT lead Sam Ortiz. Feature-heavy walkthrough lost Priya's attention; she perked up at the ROI case study from a similar company. Sam raised SOC2 and SSO objections. We committed to send the SOC2 report by Aug 26.",
  "outcome": "Mixed - interest but security objections"},
 {"date": "2026-09-05", "type": "email", "title": "Pricing email from CFO",
  "notes": "Mark says pricing is too high versus a competitor. We missed the SOC2 deadline by 5 days, which dented trust with Sam.",
  "outcome": "Negative - deal stalled"},
]
DEMO_NEXT = {"date": "2026-09-25", "type": "meeting", "title": "Recovery meeting",
  "notes": "Sent SOC2 report and apologised for the delay. Offered a phased rollout with a 90-day pilot. Mark agreed to a pilot if payback is under 9 months. Priya will champion internally. Legal needs a DPA.",
  "outcome": "Positive - pilot proposal accepted in principle"}

def render(item, customer):
    d = dict(item)
    d["notes"] = d["notes"].format(c=customer)
    return d
