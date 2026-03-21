"use client";
import { createClient } from "../../../lib/supabase";
import { useState, useEffect } from "react";
import Sidebar       from "../../../components/shared/Sidebar";
import LoadingScreen from "../../../components/shared/LoadingScreen";

export default function ProfilePage() {
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
  const [form, setForm]     = useState({ full_name:"", phone:"", date_of_birth:"", blood_type:"", allergies:"", chronic_conditions:"" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [patient, setPatient] = useState(null);

  useEffect(() => {
    if (!profile) return;
    setForm(f => ({ ...f, full_name: profile.full_name || "", phone: profile.phone || "" }));
    supabase.from("patients").select("*").eq("id", profile.id).single()
      .then(({ data }) => {
        if (data) {
          setPatient(data);
          setForm(f => ({
            ...f,
            date_of_birth: data.date_of_birth || "",
            blood_type: data.blood_type || "",
            allergies: (data.allergies || []).join(", "),
            chronic_conditions: (data.chronic_conditions || []).join(", "),
          }));
        }
      });
  }, [profile]);

  const handleSave = async () => {
    setSaving(true); setSuccess(false);
    await supabase.from("profiles").update({ full_name: form.full_name, phone: form.phone }).eq("id", user.id);
    await supabase.from("patients").update({
      date_of_birth: form.date_of_birth || null,
      blood_type: form.blood_type || null,
      allergies: form.allergies ? form.allergies.split(",").map(s=>s.trim()).filter(Boolean) : [],
      chronic_conditions: form.chronic_conditions ? form.chronic_conditions.split(",").map(s=>s.trim()).filter(Boolean) : [],
    }).eq("id", user.id);
    setSaving(false); setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  if (loading) return <LoadingScreen />;

  return (
    <div className="page-bg">
      <Sidebar role="patient" user={user} profile={profile} />
      <main className="main-content animate-fade-in">
        <div className="max-w-2xl">
          <div className="mb-8">
            <h1 className="page-title">My Profile 👤</h1>
            <p className="text-slate-500 text-sm mt-1">Manage your personal and medical information</p>
          </div>

          {success && <div className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-sm px-4 py-3 rounded-xl mb-5">✅ Profile updated successfully!</div>}

          {/* Avatar */}
          <div className="card p-6 mb-5 flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-4xl">
              {profile?.full_name?.[0]?.toUpperCase() || "👤"}
            </div>
            <div>
              <p className="text-lg font-bold text-slate-100">{profile?.full_name}</p>
              <p className="text-sm text-slate-400">{user?.email}</p>
              <span className="badge badge-confirmed mt-1 inline-block">Patient</span>
            </div>
          </div>

          {/* Personal Info */}
          <div className="card p-6 mb-5 space-y-4">
            <h2 className="section-title">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Full Name</label><input type="text" className="input" value={form.full_name} onChange={e=>set("full_name",e.target.value)}/></div>
              <div><label className="label">Phone</label><input type="tel" className="input" value={form.phone} onChange={e=>set("phone",e.target.value)}/></div>
            </div>
            <div><label className="label">Email (cannot change)</label><input type="email" className="input opacity-50 cursor-not-allowed" value={user?.email || ""} disabled/></div>
          </div>

          {/* Medical Info */}
          <div className="card p-6 mb-5 space-y-4">
            <h2 className="section-title">Medical Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Date of Birth</label>
                <input type="date" className="input" value={form.date_of_birth} onChange={e=>set("date_of_birth",e.target.value)}/>
              </div>
              <div>
                <label className="label">Blood Type</label>
                <select className="input" value={form.blood_type} onChange={e=>set("blood_type",e.target.value)}>
                  <option value="">Unknown</option>
                  {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Known Allergies (comma separated)</label>
              <input type="text" className="input" placeholder="e.g. Penicillin, Peanuts" value={form.allergies} onChange={e=>set("allergies",e.target.value)}/>
            </div>
            <div>
              <label className="label">Chronic Conditions (comma separated)</label>
              <input type="text" className="input" placeholder="e.g. Diabetes, Hypertension" value={form.chronic_conditions} onChange={e=>set("chronic_conditions",e.target.value)}/>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} className="btn-primary px-8">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </main>
    </div>
  );
}
