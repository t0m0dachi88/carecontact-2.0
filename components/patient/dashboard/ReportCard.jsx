"use client";
import Link from "next/link";

export default function ReportCard({ session }) {
  if (!session) return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="text-4xl mb-3">🤖</div>
      <p className="text-slate-400 text-sm">No AI consultations yet</p>
      <Link href="/patient/ai-consultant" className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-medium">Start your first check-in →</Link>
    </div>
  );

  const dateStr = new Date(session.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
  const done    = session.status === "completed";

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all duration-200">
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-xl flex-shrink-0">📋</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100">Pre-Consultation Report</p>
        <p className="text-xs text-slate-400 mt-0.5">{dateStr}</p>
        <span className={`mt-2 inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${done ? "badge-completed" : "badge-pending"}`}>
          {done ? "Completed" : "In Progress"}
        </span>
      </div>
      {done && session.report_url ? (
        <a href={session.report_url} target="_blank" rel="noopener noreferrer"
          className="flex-shrink-0 text-xs bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 text-blue-400 px-3 py-1.5 rounded-lg transition-colors font-medium">
          View PDF
        </a>
      ) : (
        <Link href="/patient/ai-consultant"
          className="flex-shrink-0 text-xs bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 text-blue-400 px-3 py-1.5 rounded-lg font-medium">
          Continue →
        </Link>
      )}
    </div>
  );
}
