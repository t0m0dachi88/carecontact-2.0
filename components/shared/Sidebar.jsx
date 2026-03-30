"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "../../lib/supabase";
import clsx from "clsx";

const NAV = {
  patient: [
    { href:"/patient/dashboard",    icon:"🏠", label:"Dashboard" },
    { href:"/patient/doctors",       icon:"🔍", label:"Find Doctors" },
    { href:"/patient/appointments",  icon:"📅", label:"Appointments" },
    { href:"/patient/ai-consultant", icon:"🤖", label:"AI Consultant" },
    { href:"/patient/records",       icon:"📋", label:"Medical Records" },
    { href:"/patient/messages",      icon:"💬", label:"Messages" },
    { href:"/patient/profile",       icon:"👤", label:"Profile" },
  ],
  doctor: [
    { href:"/doctor/dashboard",      icon:"🏠", label:"Dashboard" },
    { href:"/doctor/appointments",   icon:"📅", label:"Appointments" },
    { href:"/doctor/patients",       icon:"👥", label:"My Patients" },
    { href:"/doctor/schedule",       icon:"🗓️", label:"Schedule" },
    { href:"/doctor/profile",        icon:"👤", label:"Profile" },
  ],
  admin: [
    { href:"/admin/dashboard",       icon:"📊", label:"Dashboard" },
    { href:"/admin/verifications",   icon:"✅", label:"Verifications" },
    { href:"/admin/users",           icon:"👥", label:"Users" },
  ],
};

const GRADIENTS = {
  patient: "from-blue-600 to-cyan-500",
  doctor:  "from-purple-600 to-blue-500",
  admin:   "from-red-600 to-orange-500",
};

const PORTAL_TITLES = {
  patient: "Patient Portal",
  doctor:  "Doctor Portal",
  admin:   "Admin Panel",
};

export default function Sidebar({ role, user, profile }) {
  const pathname = usePathname();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.replace("/login");
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className={`bg-gradient-to-r ${GRADIENTS[role]} p-5`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">🏥</div>
          <div>
            <div className="font-bold text-white text-sm" style={{fontFamily:"'Syne',sans-serif"}}>CareContact</div>
            <div className="text-white/60 text-xs">{PORTAL_TITLES[role]}</div>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-800/40 flex items-center justify-center text-sm font-bold text-blue-300 flex-shrink-0">
            {profile?.full_name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="overflow-hidden">
            <div className="text-sm font-medium text-slate-200 truncate">{profile?.full_name || "User"}</div>
            <div className="text-xs text-slate-500 truncate">{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {(NAV[role] || []).map(({ href, icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                active
                  ? "bg-blue-600/20 text-blue-300 border border-blue-600/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}>
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-white/10 pt-3">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-950/30 transition-all duration-150 cursor-pointer">
          <span>🚪</span> Sign Out
        </button>
      </div>
    </aside>
  );
}
