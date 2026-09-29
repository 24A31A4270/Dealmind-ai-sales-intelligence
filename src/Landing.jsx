import { useState } from "react"

const FEATURES = [
  ["Persistent memory", "Every call, demo, email and outcome is remembered — so your team never loses track of a stakeholder, objection, or commitment."],
  ["Meeting prep in seconds", "Generates a complete pre-call brief with the customer snapshot, pain points, stakeholders, past objections, what worked, and the next best action."],
  ["See the memory work", "See the key customer insights and past interactions the agent used to build its recommendations — no black box."],
  ["Gets smarter over time", "See how recommendations improve as more customer interactions and outcomes are recorded over time."],
]

export default function Landing({ onGetStarted, onLogin }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <span className="text-xl font-bold text-slate-900">DealMind</span>
        <div className="flex gap-2">
          <button
            onClick={onLogin}
            className="text-sm px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-100"
          >
            Log in
          </button>

          <button
            onClick={onLogin}
            className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            Sign up
          </button>
        </div>
      </header>

      <section className="max-w-4xl mx-auto text-center px-6 pt-12 pb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
          The AI sales agent that{" "}
          <span className="text-indigo-600">remembers every deal</span>
        </h1>

        <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
          DealMind remembers every customer interaction, learns from past outcomes, and helps your sales team make smarter decisions on every deal.
        </p>

        <div className="mt-8 flex justify-center">
          <button
            onClick={onLogin}
            className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            Create your workspace
          </button>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20 grid sm:grid-cols-2 gap-5">
        {FEATURES.map(([t, d]) => (
          <div
            key={t}
            className="bg-white border border-slate-200 rounded-xl p-5"
          >
            <h3 className="font-semibold text-slate-800 mb-1">{t}</h3>
            <p className="text-sm text-slate-500">{d}</p>
          </div>
        ))}
      </section>

      <footer className="text-center text-xs text-slate-400 pb-8">
        DealMind — built for teams who never want to say "remind me what we discussed" again.
      </footer>
    </div>
  )
}