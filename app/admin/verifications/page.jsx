"use client";
import { createClient } from "../../../lib/supabase";
import { useState, useEffect } from "react";
import Sidebar       from "../../../components/shared/Sidebar";
import LoadingScreen from "../../../components/shared/LoadingScreen";

export default function VerificationsPage() {
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
  const [doctors, setDoctors] = useState([]);
  const [filter, setFilter]   = useState("pending");
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchDoctors = async (f) => {
    setFilter(f); setFetching(true);
    let q = supabase.from("doctors").select(`*, profile:profiles(full_name,email,phone,created_at)`).order("created_at",{ascending:false});
    if (f === "pending")  q = q.eq("verified",false);
    if (f === "verified") q = q.eq("verified",true);
    const { data } = await q;
    setDoctors(data||[]); setFetching(false);
  };

  useEffect(() => { if (user) fetchDoctors("pending"); }, [user]);

  const handleAction = async (doctorId, approve, reason=null) => {
    setActionLoading(doctorId);
    await supabase.from("doctors").update({ verified:approve, rejection_reason:reason }).eq("id",doctorId);
    await fetchDoctors(filter);
    setActionLoading(null);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="page-bg">
      <Sidebar role="admin" user={user} profile={profile} />
      <main className="main-content animate-fade-in">
        <div className="max-w-5xl">
          <div className="mb-8">
            <h1 className="page-title">Doctor Verifications ✅</h1>
            <p className="text-slate-500 text-sm mt-1">Review and manage doctor applications</p>
          </div>
          <div className="flex gap-2 mb-6">
            {["pending","verified","all"].map(f=>(
              <button key={f} onClick={()=>fetchDoctors(f)} className={filter===f?"btn-primary text-sm px-4 py-2":"btn-secondary text-sm px-4 py-2"}>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
          {fetching ? <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"/></div>
          : doctors.length === 0 ? <div className="card p-16 text-center"><div className="text-4xl mb-3">✅</div><p className="text-slate-400 text-sm">No doctors in this category</p></div>
          : (
            <div className="space-y-4">
              {doctors.map(doctor=>(
                <div key={doctor.id} className="card p-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-800/40 flex items-center justify-center text-2xl flex-shrink-0">🩺</div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-slate-200">Dr. {doctor.profile?.full_name}</p>
                          <span className={doctor.verified?"badge-verified":"badge-pending-v badge"}>
                            {doctor.verified?"Verified":"Pending"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2">
                          {[["Specialty",doctor.specialty],["License",doctor.license_number],["Experience",`${doctor.experience_yrs||0} yrs`],["Fee",`৳${doctor.consultation_fee||0}`],["Email",doctor.profile?.email],["Location",doctor.location_text||"—"]].map(([k,v])=>(
                            <p key={k} className="text-xs text-slate-500"><span className="text-slate-400 font-medium">{k}:</span> {v}</p>
                          ))}
                        </div>
                        {doctor.rejection_reason && <p className="text-xs text-red-400 mt-2">Rejected: {doctor.rejection_reason}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {!doctor.verified ? (
                        <>
                          <button onClick={()=>handleAction(doctor.id,true)} disabled={actionLoading===doctor.id} className="btn-success text-xs px-4 py-2">{actionLoading===doctor.id?"...":"✅ Approve"}</button>
                          <button onClick={()=>{const r=prompt("Rejection reason:");handleAction(doctor.id,false,r);}} disabled={actionLoading===doctor.id} className="btn-danger text-xs px-4 py-2">{actionLoading===doctor.id?"...":"❌ Reject"}</button>
                        </>
                      ) : (
                        <button onClick={()=>handleAction(doctor.id,false,"Revoked by admin")} disabled={actionLoading===doctor.id} className="btn-danger text-xs px-4 py-2">Revoke</button>
                      )}
                    </div>
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
