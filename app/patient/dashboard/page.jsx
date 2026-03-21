"use client";
import { createClient } from "../../../lib/supabase";
import { useState, useEffect } from "react";
import Sidebar          from "../../../components/shared/Sidebar";
import AppointmentCard  from "../../../components/patient/dashboard/AppointmentCard";
import ReportCard       from "../../../components/patient/dashboard/ReportCard";
import NotificationCard from "../../../components/patient/dashboard/NotificationCard";
import QuickActions     from "../../../components/patient/dashboard/QuickActions";
import Link             from "next/link";

function Section({ title, linkHref, linkLabel, children }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">{title}</h2>
        {linkHref && (
          <Link href={linkHref} className="text-xs text-blue-400 hover:text-blue-300 font-medium">
            {linkLabel} →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

export default function PatientDashboard() {
  const [ready, setReady]             = useState(false);
  const [user, setUser]               = useState(null);
  const [profile, setProfile]         = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [latestSession, setLatestSession] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();

      // Check session
      const { data: { session }, error: sessErr } = await supabase.auth.getSession();

      if (!session || sessErr) {
        window.location.href = "/login";
        return;
      }

      const uid = session.user.id;
      setUser(session.user);

      // Fetch all data in parallel
      const [p, a, s, n] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).single(),
        supabase.from("appointments")
          .select("id,scheduled_at,status,duration_mins,doctor:doctors(id,specialty,profile:profiles(full_name))")
          .eq("patient_id", uid)
          .in("status", ["pending","confirmed"])
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(3),
        supabase.from("ai_sessions")
          .select("id,status,report_url,created_at")
          .eq("patient_id", uid)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase.from("notifications")
          .select("id,type,title,body,read,created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setProfile(p.data);
      setAppointments(a.data || []);
      setLatestSession(s.data?.[0] || null);
      setNotifications(n.data || []);
      setReady(true);
    };

    run();
  }, []);

  if (!ready) return (
    <div className="page-bg min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <p className="text-slate-400 text-sm">Loading dashboard...</p>
      </div>
    </div>
  );

  const firstName   = profile?.full_name?.split(" ")[0] || "there";
  const unreadCount = notifications.filter(n => !n.read).length;
  const now         = new Date();
  const greeting    = now.getHours() < 12 ? "Good morning"
    : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="page-bg">
      <Sidebar role="patient" user={user} profile={profile} />
      <main className="main-content animate-fade-in">
        <div className="max-w-5xl space-y-6">

          <div className="flex items-start justify-between">
            <div>
              <h1 className="page-title">{greeting}, {firstName} 👋</h1>
              <p className="text-slate-500 text-sm mt-1">
                {now.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
              </p>
            </div>
            {unreadCount > 0 && (
              <div className="flex items-center gap-2 bg-blue-950/50 border border-blue-800/40 px-3 py-2 rounded-xl">
                <span>🔔</span>
                <span className="text-xs text-blue-400 font-medium">{unreadCount} new</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon:"📅", label:"Upcoming",    value:appointments.length,               color:"bg-blue-950/40 border-blue-900/40" },
              { icon:"🤖", label:"AI Sessions", value:latestSession ? "Active" : "None", color:"bg-purple-950/40 border-purple-900/40" },
              { icon:"🔔", label:"Unread",      value:unreadCount,                       color:"bg-cyan-950/40 border-cyan-900/40" },
            ].map(({ icon, label, value, color }) => (
              <div key={label} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${color}`}>
                <span className="text-xl">{icon}</span>
                <div>
                  <p className="text-lg font-bold text-slate-100 leading-none">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h2 className="section-title mb-3">Quick Actions</h2>
            <QuickActions />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Section title="Upcoming Appointments" linkHref="/patient/appointments" linkLabel="View all">
              {appointments.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="text-4xl mb-3">📅</div>
                  <p className="text-slate-400 text-sm">No upcoming appointments</p>
                  <Link href="/patient/doctors" className="mt-3 text-xs text-blue-400 font-medium">
                    Book your first appointment →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map(a => <AppointmentCard key={a.id} appointment={a} />)}
                </div>
              )}
            </Section>

            <Section title="Latest AI Report" linkHref="/patient/ai-consultant" linkLabel="New session">
              <ReportCard session={latestSession} />
            </Section>
          </div>

          <Section title="Recent Notifications">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-slate-400 text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map(n => <NotificationCard key={n.id} notification={n} />)}
              </div>
            )}
          </Section>

        </div>
      </main>
    </div>
  );
}
