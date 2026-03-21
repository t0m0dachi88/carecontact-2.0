"use client";
import { createClient } from "../../../lib/supabase";
import { useState, useEffect } from "react";
import Sidebar       from "../../../components/shared/Sidebar";
import LoadingScreen from "../../../components/shared/LoadingScreen";
import Link          from "next/link";

export default function DoctorDashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return; }
      setUser(session.user);
      createClient().from('profiles').select('*').eq('id', session.user.id).single()
        .then(({ data }) => { setProfile(data); setLoading(false); });
    });
  }, []);
  const [doctor, setDoctor]   = useState(null);
  const [stats, setStats]     = useState({ today:0, total:0, patients:0, rating:"—" });
  const [todayAppts, setTodayAppts] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const { data: doc } = await supabase.from("doctors").select("*").eq("id", user.id).single();
      if (!doc?.verified) { window.location.replace("/doctor/pending"); return; }
      setDoctor(doc);

      const today = new Date(); today.setHours(0,0,0,0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);

      const [{ data: appts }, { data: all }, { data: reviews }] = await Promise.all([
        supabase.from("appointments").select(`id,scheduled_at,status,duration_mins,patient:patients(profile:profiles(full_name))`).eq("doctor_id",user.id).gte("scheduled_at",today.toISOString()).lt("scheduled_at",tomorrow.toISOString()).order("scheduled_at",{ascending:true}),
        supabase.from("appointments").select("patient_id").eq("doctor_id",user.id),
        supabase.from("reviews").select("rating").eq("doctor_id",user.id),
      ]);

      const unique = new Set((all||[]).map(a=>a.patient_id)).size;
      const avg = reviews?.length ? (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1) : "—";
      setTodayAppts(appts||[]);
      setStats({ today:appts?.length||0, total:all?.length||0, patients:unique, rating:avg });
      setDataLoading(false);
    };
    init();
  }, [user]);

  if (loading || dataLoading) return <LoadingScreen />;

  const STATUS_BADGE = { pending:"badge-pending", confirmed:"badge-confirmed", completed:"badge-completed", cancelled:"badge-cancelled" };

  return (
    <div className="page-bg">
      <Sidebar role="doctor" user={user} profile={profile} />
      <main className="main-content animate-fade-in">
        <div className="max-w-5xl">
          <div className="mb-8">
            <h1 className="page-title">Welcome, Dr. {profile?.full_name?.split(" ").slice(-1)[0]} 👨‍⚕️</h1>
            <p className="text-slate-500 text-sm mt-1">{doctor?.specialty} · {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</p>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { icon:"📅", label:"Today", value:stats.today, color:"bg-blue-600/20" },
              { icon:"📊", label:"Total Appointments", value:stats.total, color:"bg-purple-600/20" },
              { icon:"👥", label:"Total Patients", value:stats.patients, color:"bg-cyan-600/20" },
              { icon:"⭐", label:"Avg Rating", value:stats.rating, color:"bg-yellow-600/20" },
            ].map(({ icon, label, value, color }) => (
              <div key={label} className="stat-card">
                <div className={`stat-icon ${color}`}>{icon}</div>
                <div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Today's Schedule</h2>
            <Link href="/doctor/appointments" className="text-xs text-blue-400 hover:text-blue-300">Full calendar →</Link>
          </div>
          {todayAppts.length === 0 ? (
            <div className="card p-12 text-center"><div className="text-4xl mb-3">🎉</div><p className="text-slate-400 text-sm">No appointments today</p></div>
          ) : (
            <div className="space-y-3">
              {todayAppts.map(appt => (
                <div key={appt.id} className="card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-800/40 flex items-center justify-center text-lg">👤</div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{appt.patient?.profile?.full_name || "Patient"}</p>
                      <p className="text-xs text-slate-500">{appt.duration_mins||30} min session</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-blue-400">{new Date(appt.scheduled_at).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}</p>
                      <span className={STATUS_BADGE[appt.status]||"badge-pending"}>{appt.status}</span>
                    </div>
                    <Link href="/doctor/appointments" className="btn-secondary text-xs px-3 py-1.5">View →</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
