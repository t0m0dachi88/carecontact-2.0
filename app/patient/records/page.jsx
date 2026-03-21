"use client";
import { createClient } from "../../../lib/supabase";
import { useState, useEffect } from "react";
import Sidebar       from "../../../components/shared/Sidebar";
import LoadingScreen from "../../../components/shared/LoadingScreen";

const TYPE_ICONS = { prescription:"💊", lab_report:"🧪", scan:"🔬", ai_report:"🤖", other:"📄" };

export default function RecordsPage() {
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
  const [records, setRecords]   = useState([]);
  const [filter, setFilter]     = useState("all");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("medical_records").select(`id,type,description,file_url,created_at,doctor:doctors(profile:profiles(full_name))`).eq("patient_id",user.id).order("created_at",{ascending:false})
      .then(({ data }) => { setRecords(data||[]); setFetching(false); });
  }, [user]);

  if (loading || fetching) return <LoadingScreen />;

  const filtered = filter === "all" ? records : records.filter(r => r.type === filter);

  return (
    <div className="page-bg">
      <Sidebar role="patient" user={user} profile={profile} />
      <main className="main-content animate-fade-in">
        <div className="max-w-4xl">
          <div className="mb-8">
            <h1 className="page-title">Medical Records 📋</h1>
            <p className="text-slate-500 text-sm mt-1">Your complete health history</p>
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            {["all","prescription","lab_report","scan","ai_report","other"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={filter===f ? "btn-primary text-xs px-3 py-2" : "btn-secondary text-xs px-3 py-2"}>
                {TYPE_ICONS[f] || "📋"} {f === "all" ? "All" : f.replace("_"," ")}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="card p-16 text-center">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-slate-400">No records found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(rec => (
                <div key={rec.id} className="card p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl flex-shrink-0">
                    {TYPE_ICONS[rec.type] || "📄"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100 capitalize">{rec.type?.replace("_"," ")}</p>
                    {rec.description && <p className="text-xs text-slate-400 mt-0.5">{rec.description}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      {rec.doctor && <span className="text-xs text-blue-400">Dr. {rec.doctor?.profile?.full_name}</span>}
                      <span className="text-xs text-slate-500">{new Date(rec.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {rec.file_url && (
                    <a href={rec.file_url} target="_blank" rel="noopener noreferrer"
                      className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0">Download</a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
