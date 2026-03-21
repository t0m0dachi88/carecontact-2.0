"use client";

const STATUS_STYLES = {
  pending:   "badge-pending",
  confirmed: "badge-confirmed",
  completed: "badge-completed",
  cancelled: "badge-cancelled",
};

export default function AppointmentCard({ appointment }) {
  const { doctor, patient, scheduled_at, status, duration_mins } = appointment;
  const date    = new Date(scheduled_at);
  const isToday = new Date().toDateString() === date.toDateString();
  const dateStr = date.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
  const timeStr = date.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
  const name    = doctor?.profile?.full_name || patient?.profile?.full_name || "Unknown";
  const sub     = doctor?.specialty || patient?.profile?.email || "";

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all duration-200">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold flex-shrink-0">
        {doctor ? "🩺" : "👤"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate">{doctor ? `Dr. ${name}` : name}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-slate-400">
            {isToday ? <span className="text-cyan-400 font-medium">Today</span> : dateStr}
            {" · "}{timeStr}
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-xs text-slate-500">{duration_mins || 30} min</span>
        </div>
      </div>
      <span className={STATUS_STYLES[status] || "badge-pending"}>{status}</span>
    </div>
  );
}
