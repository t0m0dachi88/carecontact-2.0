"use client";
import Link from "next/link";

const ACTIONS = [
  { href:"/patient/doctors",       icon:"🔍", label:"Book Appointment", desc:"Find & book a doctor",       gradient:"from-blue-600 to-blue-700" },
  { href:"/patient/ai-consultant", icon:"🤖", label:"AI Consultation",  desc:"Pre-appointment check-in",  gradient:"from-purple-600 to-blue-600" },
  { href:"/patient/records",       icon:"📋", label:"Medical Records",  desc:"View your history",         gradient:"from-cyan-600 to-blue-600" },
  { href:"/patient/messages",      icon:"💬", label:"Messages",         desc:"Chat with your doctor",     gradient:"from-emerald-600 to-cyan-600" },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ACTIONS.map(({ href, icon, label, desc, gradient }) => (
        <Link key={href} href={href}
          className={`group relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${gradient} shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-200`}>
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="text-2xl mb-2">{icon}</div>
            <p className="text-sm font-bold text-white leading-tight">{label}</p>
            <p className="text-xs text-white/60 mt-0.5">{desc}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
