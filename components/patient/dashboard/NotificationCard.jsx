"use client";

const TYPE_CONFIG = {
  appointment: { icon:"📅", color:"text-blue-400",    bg:"bg-blue-600/15" },
  message:     { icon:"💬", color:"text-purple-400",  bg:"bg-purple-600/15" },
  reminder:    { icon:"⏰", color:"text-yellow-400",  bg:"bg-yellow-600/15" },
  verification:{ icon:"✅", color:"text-emerald-400", bg:"bg-emerald-600/15" },
  record:      { icon:"📋", color:"text-cyan-400",    bg:"bg-cyan-600/15" },
  review:      { icon:"⭐", color:"text-orange-400",  bg:"bg-orange-600/15" },
};

function timeAgo(d) {
  const diff  = Date.now() - new Date(d).getTime();
  const mins  = Math.floor(diff/60000);
  const hours = Math.floor(diff/3600000);
  const days  = Math.floor(diff/86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function NotificationCard({ notification }) {
  const cfg = TYPE_CONFIG[notification.type] || TYPE_CONFIG.reminder;
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-200 ${notification.read ? "opacity-60" : "bg-white/5 border border-white/10"}`}>
      <div className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center text-base flex-shrink-0`}>{cfg.icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${cfg.color}`}>{notification.title}</p>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{notification.body}</p>
        <p className="text-xs text-slate-600 mt-1">{timeAgo(notification.created_at)}</p>
      </div>
      {!notification.read && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />}
    </div>
  );
}
