"use client";
import { createClient } from "../../../lib/supabase";
import { authFetch } from "../../../lib/authFetch";
import { useState, useEffect } from "react";
import Sidebar       from "../../../components/shared/Sidebar";
import LoadingScreen from "../../../components/shared/LoadingScreen";

const STATUS_BADGE = { pending:"badge-pending", confirmed:"badge-confirmed", completed:"badge-completed", cancelled:"badge-cancelled" };

export default function DoctorAppointmentsPage() {
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
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter]   = useState("upcoming");
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchAppointments = async () => {
    const { data } = await supabase.from("appointments")
      .select(`id,scheduled_at,status,duration_mins,notes,patient:patients(profile:profiles(full_name,email,phone))`)
      .eq("doctor_id", user.id).order("scheduled_at",{ascending:true});
    setAppointments(data||[]);
    setFetching(false);
  };

  useEffect(() => { if (user) fetchAppointments(); }, [user]);

  const updateStatus = async (id, status) => {
    setActionLoading(id);
    await authFetch(`/api/appointments/${id}`,{ method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ status }) });
    await fetchAppointments();
    setActionLoading(null);
  };

  const addNotes = async (id, notes) => {
    await authFetch(`/api/appointments/${id}`,{ method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ notes }) });
    await fetchAppointments();
  };

  if (loading || fetching) return <LoadingScreen />;

  const now = new Date();
  const filtered = appointments.filter(a => {
    const apptDate = new Date(a.scheduled_at);
    if (filter === "upcoming")  return ["pending","confirmed"].includes(a.status) && apptDate >= now;
    if (filter === "today")     return apptDate.toDateString() === now.toDateString();
    if (filter === "past")      return a.status === "completed" || apptDate < now;
    if (filter === "cancelled") return a.status === "cancelled";
    return true;
  });

  return (
    <div className="page-bg">
      <Sidebar role="doctor" user={user} profile={profile} />
      <main className="main-content animate-fade-in">
        <div className="max-w-5xl">
          <div className="mb-8">
            <h1 className="page-title">Appointments 📅</h1>
            <p className="text-slate-500 text-sm mt-1">Manage your patient appointments</p>
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            {["today","upcoming","past","cancelled","all"].map(f => (
              <button key={f} onClick={()=>setFilter(f)}
                className={filter===f?"btn-primary text-sm px-4 py-2":"btn-secondary text-sm px-4 py-2"}>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="card p-16 text-center"><div className="text-5xl mb-4">📅</div><p className="text-slate-400">No {filter} appointments</p></div>
          ) : (
            <div className="space-y-4">
              {filtered.map(appt => {
                const date = new Date(appt.scheduled_at);
                const isToday = date.toDateString() === now.toDateString();
                const canAct  = ["pending","confirmed"].includes(appt.status);
                return (
                  <div key={appt.id} className="card p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-800/40 flex items-center justify-center text-2xl flex-shrink-0">👤</div>
                        <div>
                          <p className="font-semibold text-slate-100">{appt.patient?.profile?.full_name || "Patient"}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{appt.patient?.profile?.email}</p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-xs text-slate-400">{isToday ? <span className="text-cyan-400 font-medium">Today</span> : date.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</span>
                            <span className="text-xs text-slate-400">⏰ {date.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}</span>
                            <span className="text-xs text-slate-400">⏱ {appt.duration_mins||30} min</span>
                          </div>
                          {appt.notes && <p className="text-xs text-slate-500 mt-2 italic bg-white/5 px-3 py-1.5 rounded-lg">{appt.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={STATUS_BADGE[appt.status]||"badge-pending"}>{appt.status}</span>
                        {canAct && appt.status === "pending" && (
                          <button onClick={()=>updateStatus(appt.id,"confirmed")} disabled={actionLoading===appt.id} className="btn-success text-xs px-3 py-1.5">
                            {actionLoading===appt.id?"...":"✅ Confirm"}
                          </button>
                        )}
                        {canAct && (
                          <button onClick={()=>updateStatus(appt.id,"completed")} disabled={actionLoading===appt.id} className="btn-primary text-xs px-3 py-1.5">
                            {actionLoading===appt.id?"...":"Mark Done"}
                          </button>
                        )}
                        {canAct && (
                          <button onClick={()=>updateStatus(appt.id,"cancelled")} disabled={actionLoading===appt.id} className="btn-danger text-xs px-3 py-1.5">
                            {actionLoading===appt.id?"...":"Cancel"}
                          </button>
                        )}
                        {appt.status === "completed" && (
                          <button onClick={()=>{const n=prompt("Add notes for this visit:");if(n)addNotes(appt.id,n);}} className="btn-secondary text-xs px-3 py-1.5">📝 Notes</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
