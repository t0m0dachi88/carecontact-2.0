"use client";
import { createClient } from "../../../lib/supabase";
import { useState, useEffect } from "react";
import Sidebar from "../../../components/shared/Sidebar";
import Link   from "next/link";

export default function AdminDashboard() {
  const [user, setUser]         = useState(null);
  const [profile, setProfile]   = useState(null);
  const [ready, setReady]       = useState(false);
  const [stats, setStats]       = useState({ patients:0, doctors:0, pending:0, appointments:0, aiSessions:0, todayAppts:0 });
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [allPatients, setAllPatients]       = useState([]);
  const [allDoctors, setAllDoctors]         = useState([]);
  const [actionLoading, setActionLoading]   = useState(null);
  const [activeTab, setActiveTab]           = useState("overview");

  useEffect(() => {
    const supabase = createClient();
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }
      setUser(session.user);

      const { data: p } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setProfile(p);

      await fetchAll(supabase);
      setReady(true);
    };
    init();
  }, []);

  const fetchAll = async (supabase) => {
    const today    = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);

    const [
      { data: patients },
      { data: doctors },
      { data: pendingList },
      { data: appointments },
      { data: aiSessions },
      { data: todayAppts },
    ] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, phone, created_at, is_active").eq("role","patient").order("created_at",{ascending:false}),
      supabase.from("doctors").select("id, specialty, license_number, verified, experience_yrs, consultation_fee, location_text, created_at, profile:profiles(full_name, email)").order("created_at",{ascending:false}),
      supabase.from("doctors").select("id, specialty, license_number, experience_yrs, consultation_fee, location_text, bio, created_at, profile:profiles(full_name, email)").eq("verified",false).order("created_at",{ascending:false}),
      supabase.from("appointments").select("id").order("created_at",{ascending:false}),
      supabase.from("ai_sessions").select("id"),
      supabase.from("appointments").select("id").gte("scheduled_at",today.toISOString()).lt("scheduled_at",tomorrow.toISOString()),
    ]);

    const verifiedDoctors  = (doctors||[]).filter(d => d.verified);
    const pendingDoctorsList = (doctors||[]).filter(d => !d.verified);

    setAllPatients(patients || []);
    setAllDoctors(doctors || []);
    setPendingDoctors(pendingList || pendingDoctorsList);
    setStats({
      patients:     (patients||[]).length,
      doctors:      verifiedDoctors.length,
      pending:      (pendingList||pendingDoctorsList).length,
      appointments: (appointments||[]).length,
      aiSessions:   (aiSessions||[]).length,
      todayAppts:   (todayAppts||[]).length,
    });
  };

  const handleVerify = async (doctorId, approve) => {
    const supabase = createClient();
    setActionLoading(doctorId);
    await supabase.from("doctors").update({ verified: approve }).eq("id", doctorId);
    setPendingDoctors(prev => prev.filter(d => d.id !== doctorId));
    setStats(prev => ({ ...prev, pending: prev.pending - 1, doctors: approve ? prev.doctors + 1 : prev.doctors }));
    setActionLoading(null);
  };

  const toggleActive = async (userId, current) => {
    const supabase = createClient();
    await supabase.from("profiles").update({ is_active: !current }).eq("id", userId);
    setAllPatients(prev => prev.map(p => p.id === userId ? { ...p, is_active: !current } : p));
  };

  if (!ready) return (
    <div className="page-bg min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <p className="text-slate-400 text-sm">Loading admin dashboard...</p>
      </div>
    </div>
  );

  const STAT_CARDS = [
    { icon:"👤", label:"Total Patients",        value:stats.patients,      color:"bg-blue-600/20" },
    { icon:"🩺", label:"Total Doctors",         value:stats.doctors,       color:"bg-purple-600/20" },
    { icon:"⏳", label:"Pending Verifications", value:stats.pending,       color:"bg-yellow-600/20" },
    { icon:"📅", label:"Total Appointments",    value:stats.appointments,  color:"bg-cyan-600/20" },
    { icon:"🤖", label:"AI Sessions",           value:stats.aiSessions,    color:"bg-emerald-600/20" },
    { icon:"📆", label:"Appointments Today",    value:stats.todayAppts,    color:"bg-red-600/20" },
  ];

  return (
    <div className="page-bg">
      <Sidebar role="admin" user={user} profile={profile} />
      <main className="main-content animate-fade-in">
        <div className="max-w-6xl">

          {/* Header */}
          <div className="mb-8">
            <h1 className="page-title">Admin Dashboard 🔐</h1>
            <p className="text-slate-500 text-sm mt-1">Platform overview and management</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {STAT_CARDS.map(({ icon, label, value, color }) => (
              <div key={label} className="stat-card">
                <div className={`stat-icon ${color}`}>{icon}</div>
                <div>
                  <div className="stat-value">{value}</div>
                  <div className="stat-label">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {["overview","patients","doctors","verifications"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={activeTab === tab ? "btn-primary text-sm px-4 py-2" : "btn-secondary text-sm px-4 py-2"}>
                {tab === "overview"       ? "📊 Overview" :
                 tab === "patients"       ? `👤 Patients (${stats.patients})` :
                 tab === "doctors"        ? `🩺 Doctors (${stats.doctors})` :
                                           `⏳ Pending (${stats.pending})`}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <h2 className="section-title">Recent Patients</h2>
              {allPatients.slice(0,5).length === 0 ? (
                <div className="card p-8 text-center"><p className="text-slate-400 text-sm">No patients registered yet</p></div>
              ) : (
                <div className="space-y-2">
                  {allPatients.slice(0,5).map(pat => (
                    <div key={pat.id} className="card p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-800/40 flex items-center justify-center text-sm font-bold text-blue-300">
                          {pat.full_name?.[0]?.toUpperCase() || "P"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{pat.full_name}</p>
                          <p className="text-xs text-slate-500">{pat.email}</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">{new Date(pat.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
              {allPatients.length > 5 && (
                <button onClick={() => setActiveTab("patients")} className="text-xs text-blue-400 hover:text-blue-300">
                  View all {allPatients.length} patients →
                </button>
              )}
            </div>
          )}

          {/* Patients Tab */}
          {activeTab === "patients" && (
            <div>
              <h2 className="section-title mb-4">All Patients ({allPatients.length})</h2>
              {allPatients.length === 0 ? (
                <div className="card p-12 text-center"><div className="text-4xl mb-3">👤</div><p className="text-slate-400 text-sm">No patients registered yet</p></div>
              ) : (
                <div className="card overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        {["Patient","Email","Phone","Joined","Status","Action"].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allPatients.map((pat, i) => (
                        <tr key={pat.id} className={`border-b border-white/5 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-800/40 flex items-center justify-center text-xs font-bold text-blue-300">
                                {pat.full_name?.[0]?.toUpperCase() || "P"}
                              </div>
                              <span className="text-sm text-slate-200">{pat.full_name || "—"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">{pat.email}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{pat.phone || "—"}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{new Date(pat.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <span className={pat.is_active !== false ? "badge-completed" : "badge-cancelled"}>
                              {pat.is_active !== false ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => toggleActive(pat.id, pat.is_active !== false)}
                              className={pat.is_active !== false ? "btn-danger text-xs px-3 py-1.5" : "btn-success text-xs px-3 py-1.5"}>
                              {pat.is_active !== false ? "Deactivate" : "Reactivate"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Doctors Tab */}
          {activeTab === "doctors" && (
            <div>
              <h2 className="section-title mb-4">All Doctors ({allDoctors.length})</h2>
              {allDoctors.length === 0 ? (
                <div className="card p-12 text-center"><div className="text-4xl mb-3">🩺</div><p className="text-slate-400 text-sm">No doctors registered yet</p></div>
              ) : (
                <div className="space-y-3">
                  {allDoctors.map(doc => (
                    <div key={doc.id} className="card p-4 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-800/40 flex items-center justify-center text-lg">🩺</div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">Dr. {doc.profile?.full_name}</p>
                          <p className="text-xs text-slate-500">{doc.specialty} · {doc.experience_yrs} yrs · ৳{doc.consultation_fee}</p>
                          <p className="text-xs text-slate-600">{doc.profile?.email}</p>
                        </div>
                      </div>
                      <span className={doc.verified ? "badge-verified" : "badge-pending-v"}>
                        {doc.verified ? "Verified" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Verifications Tab */}
          {activeTab === "verifications" && (
            <div>
              <h2 className="section-title mb-4">Pending Verifications ({pendingDoctors.length})</h2>
              {pendingDoctors.length === 0 ? (
                <div className="card p-12 text-center"><div className="text-4xl mb-3">✅</div><p className="text-slate-400 text-sm">No pending verifications</p></div>
              ) : (
                <div className="space-y-3">
                  {pendingDoctors.map(doctor => (
                    <div key={doctor.id} className="card p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-purple-800/40 flex items-center justify-center text-2xl flex-shrink-0">🩺</div>
                          <div>
                            <p className="font-semibold text-slate-200">Dr. {doctor.profile?.full_name}</p>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2">
                              {[
                                ["Specialty",   doctor.specialty],
                                ["License",     doctor.license_number],
                                ["Experience",  `${doctor.experience_yrs} years`],
                                ["Fee",         `৳${doctor.consultation_fee}`],
                                ["Email",       doctor.profile?.email],
                                ["Location",    doctor.location_text || "Not provided"],
                              ].map(([k, v]) => (
                                <p key={k} className="text-xs text-slate-500">
                                  <span className="text-slate-400 font-medium">{k}:</span> {v}
                                </p>
                              ))}
                            </div>
                            {doctor.bio && <p className="text-xs text-slate-500 mt-2 max-w-lg">{doctor.bio}</p>}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => handleVerify(doctor.id, true)} disabled={actionLoading === doctor.id}
                            className="btn-success text-xs px-4 py-2">
                            {actionLoading === doctor.id ? "..." : "✅ Approve"}
                          </button>
                          <button onClick={() => handleVerify(doctor.id, false)} disabled={actionLoading === doctor.id}
                            className="btn-danger text-xs px-4 py-2">
                            {actionLoading === doctor.id ? "..." : "❌ Reject"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
