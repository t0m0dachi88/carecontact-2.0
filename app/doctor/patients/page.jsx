"use client";
import { createClient } from "../../../lib/supabase";
import { useState, useEffect } from "react";
import Sidebar from "../../../components/shared/Sidebar";

const TYPE_ICONS = {
  prescription: "💊",
  lab_report:   "🧪",
  scan:         "🔬",
  ai_report:    "🤖",
  other:        "📄",
};

export default function DoctorPatientsPage() {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [ready, setReady]     = useState(false);
  const [patients, setPatients]   = useState([]);
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState(null);
  const [records, setRecords]     = useState([]);
  const [aiSessions, setAiSessions] = useState([]);
  const [activeTab, setActiveTab] = useState("records");
  const [uploading, setUploading] = useState(false);
  const [desc, setDesc]     = useState("");
  const [recType, setRecType] = useState("prescription");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = "/login"; return; }
      setUser(session.user);
      supabase.from("profiles").select("*").eq("id", session.user.id).single()
        .then(({ data: p }) => {
          setProfile(p);
          // Load patients who booked this doctor
          supabase.from("appointments")
            .select(`patient_id, patient:patients(id, blood_type, allergies, chronic_conditions, profile:profiles(full_name, email, phone))`)
            .eq("doctor_id", session.user.id)
            .then(({ data }) => {
              const unique = {};
              (data || []).forEach(a => {
                if (a.patient && !unique[a.patient_id]) unique[a.patient_id] = a.patient;
              });
              setPatients(Object.values(unique));
              setReady(true);
            });
        });
    });
  }, []);

  const selectPatient = async (p) => {
    setSelected(p);
    setRecords([]);
    setAiSessions([]);
    setActiveTab("records");

    const supabase = createClient();

    // Fetch medical records
    const { data: recs } = await supabase
      .from("medical_records")
      .select("*")
      .eq("patient_id", p.id)
      .order("created_at", { ascending: false });

    // Fetch AI sessions (pre-consultation reports)
    const { data: sessions } = await supabase
      .from("ai_sessions")
      .select("id, status, report_url, created_at, appointment_id")
      .eq("patient_id", p.id)
      .order("created_at", { ascending: false });

    setRecords(recs || []);
    setAiSessions(sessions || []);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setUploading(true);
    const supabase = createClient();
    const path = `${user.id}/${selected.id}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("records").upload(path, file, { upsert: true });
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from("records").getPublicUrl(path);
      await supabase.from("medical_records").insert({
        patient_id: selected.id, doctor_id: user.id,
        type: recType, description: desc, file_url: publicUrl,
      });
      setDesc(""); e.target.value = "";
      selectPatient(selected);
    }
    setUploading(false);
  };

  const filtered = patients.filter(p =>
    p.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.profile?.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (!ready) return (
    <div className="page-bg min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <p className="text-slate-400 text-sm">Loading patients...</p>
      </div>
    </div>
  );

  return (
    <div className="page-bg">
      <Sidebar role="doctor" user={user} profile={profile} />
      <main className="main-content animate-fade-in">
        <div className="max-w-6xl">
          <div className="mb-8">
            <h1 className="page-title">My Patients 👥</h1>
            <p className="text-slate-500 text-sm mt-1">{patients.length} patients who have booked with you</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Patient list */}
            <div className="card p-4">
              <input type="text" className="input mb-4" placeholder="Search patients..."
                value={search} onChange={e => setSearch(e.target.value)} />
              {filtered.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">👥</div>
                  <p className="text-slate-500 text-sm">No patients found</p>
                  <p className="text-slate-600 text-xs mt-1">Patients appear here after booking</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(p => (
                    <button key={p.id} onClick={() => selectPatient(p)}
                      className={`w-full text-left p-3 rounded-xl transition-all duration-150 ${
                        selected?.id === p.id
                          ? "bg-blue-600/20 border border-blue-600/30"
                          : "hover:bg-white/5"
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                          {p.profile?.full_name?.[0]?.toUpperCase() || "P"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">{p.profile?.full_name}</p>
                          <p className="text-xs text-slate-500 truncate">{p.profile?.email}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Patient detail */}
            <div className="lg:col-span-2">
              {!selected ? (
                <div className="card p-16 text-center">
                  <div className="text-5xl mb-4">👤</div>
                  <p className="text-slate-400">Select a patient to view their details and reports</p>
                </div>
              ) : (
                <div className="space-y-4">

                  {/* Patient info */}
                  <div className="card p-5">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white">
                        {selected.profile?.full_name?.[0]?.toUpperCase() || "P"}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-100">{selected.profile?.full_name}</h2>
                        <p className="text-xs text-slate-400">{selected.profile?.email}</p>
                        {selected.profile?.phone && <p className="text-xs text-slate-500">{selected.profile.phone}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ["Blood Type",  selected.blood_type || "Unknown"],
                        ["Phone",       selected.profile?.phone || "—"],
                        ["Allergies",   (selected.allergies || []).join(", ") || "None"],
                        ["Conditions",  (selected.chronic_conditions || []).join(", ") || "None"],
                      ].map(([k, v]) => (
                        <div key={k} className="bg-white/5 rounded-xl p-3">
                          <p className="text-xs text-slate-500">{k}</p>
                          <p className="text-sm text-slate-200 font-medium mt-0.5">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-2">
                    <button onClick={() => setActiveTab("records")}
                      className={activeTab === "records" ? "btn-primary text-sm px-4 py-2" : "btn-secondary text-sm px-4 py-2"}>
                      📋 Medical Records ({records.length})
                    </button>
                    <button onClick={() => setActiveTab("ai")}
                      className={activeTab === "ai" ? "btn-primary text-sm px-4 py-2" : "btn-secondary text-sm px-4 py-2"}>
                      🤖 AI Reports ({aiSessions.length})
                    </button>
                    <button onClick={() => setActiveTab("upload")}
                      className={activeTab === "upload" ? "btn-primary text-sm px-4 py-2" : "btn-secondary text-sm px-4 py-2"}>
                      📎 Upload
                    </button>
                  </div>

                  {/* Medical Records Tab */}
                  {activeTab === "records" && (
                    <div className="card p-5">
                      <h3 className="section-title mb-4">Medical Records</h3>
                      {records.length === 0 ? (
                        <div className="text-center py-6">
                          <div className="text-3xl mb-2">📋</div>
                          <p className="text-slate-500 text-sm">No medical records yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {records.map(r => (
                            <div key={r.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                              <span className="text-xl flex-shrink-0">{TYPE_ICONS[r.type] || "📄"}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-200 capitalize font-medium">{r.type?.replace("_", " ")}</p>
                                {r.description && <p className="text-xs text-slate-500">{r.description}</p>}
                                <p className="text-xs text-slate-600">{new Date(r.created_at).toLocaleDateString()}</p>
                              </div>
                              {r.file_url && (
                                <a href={r.file_url} target="_blank" rel="noopener noreferrer"
                                  className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0">
                                  View
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Sessions Tab */}
                  {activeTab === "ai" && (
                    <div className="card p-5">
                      <h3 className="section-title mb-4">AI Pre-Consultation Reports</h3>
                      {aiSessions.length === 0 ? (
                        <div className="text-center py-6">
                          <div className="text-3xl mb-2">🤖</div>
                          <p className="text-slate-500 text-sm">No AI consultations found</p>
                          <p className="text-slate-600 text-xs mt-1">Patient must complete the AI check-in and download the PDF first</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {aiSessions.map(s => (
                            <div key={s.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-2xl flex-shrink-0">
                                🤖
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-200">Pre-Consultation Report</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {new Date(s.created_at).toLocaleDateString("en-US", {
                                    weekday: "short", month: "long", day: "numeric", year: "numeric"
                                  })}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className={s.status === "completed" ? "badge-completed" : "badge-pending"}>
                                    {s.status === "completed" ? "Completed" : "In Progress"}
                                  </span>
                                  {s.appointment_id && (
                                    <span className="text-xs text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded-full">
                                      Linked to appointment
                                    </span>
                                  )}
                                </div>
                              </div>
                              {s.report_url ? (
                                <a href={s.report_url} target="_blank" rel="noopener noreferrer"
                                  className="btn-primary text-xs px-4 py-2 flex-shrink-0">
                                  📄 View PDF
                                </a>
                              ) : (
                                <span className="text-xs text-slate-500 flex-shrink-0">PDF not yet generated</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Upload Tab */}
                  {activeTab === "upload" && (
                    <div className="card p-5">
                      <h3 className="section-title mb-4">Upload Medical Record</h3>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="label">Record Type</label>
                          <select className="input" value={recType} onChange={e => setRecType(e.target.value)}>
                            {["prescription","lab_report","scan","other"].map(t => (
                              <option key={t} value={t}>{t.replace("_", " ")}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="label">Description</label>
                          <input type="text" className="input" placeholder="Brief description..."
                            value={desc} onChange={e => setDesc(e.target.value)} />
                        </div>
                      </div>
                      <label className={`block w-full text-center py-4 px-4 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-blue-500/50 transition-colors ${uploading ? "opacity-50 cursor-wait" : ""}`}>
                        <div className="text-3xl mb-2">📎</div>
                        <span className="text-sm text-slate-400">{uploading ? "Uploading..." : "Click to upload file"}</span>
                        <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                      </label>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}