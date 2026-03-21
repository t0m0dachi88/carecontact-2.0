"use client";
import { createClient } from "../../../lib/supabase";
import { useState, useEffect } from "react";
import Sidebar       from "../../../components/shared/Sidebar";
import LoadingScreen from "../../../components/shared/LoadingScreen";

const SPECIALTIES = ["General Medicine","Cardiology","Dermatology","Endocrinology","Gastroenterology","Neurology","Obstetrics & Gynecology","Oncology","Ophthalmology","Orthopedics","Pediatrics","Psychiatry","Pulmonology","Surgery","Urology"];

export default function DoctorProfilePage() {
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
  const [form, setForm]     = useState({ full_name:"", phone:"", specialty:"", bio:"", consultation_fee:"", location_text:"", experience_yrs:"", available:true });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  useEffect(() => {
    if (!user) return;
    supabase.from("doctors").select("*").eq("id", user.id).single()
      .then(({ data }) => {
        if (data) setForm({ full_name:profile?.full_name||"", phone:profile?.phone||"", specialty:data.specialty||"", bio:data.bio||"", consultation_fee:data.consultation_fee||"", location_text:data.location_text||"", experience_yrs:data.experience_yrs||"", available:data.available??true });
      });
  }, [user, profile]);

  const handleSave = async () => {
    setSaving(true); setSuccess(false);
    await supabase.from("profiles").update({ full_name:form.full_name, phone:form.phone }).eq("id", user.id);
    await supabase.from("doctors").update({ specialty:form.specialty, bio:form.bio, consultation_fee:parseFloat(form.consultation_fee)||0, location_text:form.location_text, experience_yrs:parseInt(form.experience_yrs)||0, available:form.available }).eq("id", user.id);
    setSaving(false); setSuccess(true);
    setTimeout(()=>setSuccess(false), 3000);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="page-bg">
      <Sidebar role="doctor" user={user} profile={profile} />
      <main className="main-content animate-fade-in">
        <div className="max-w-2xl">
          <div className="mb-8">
            <h1 className="page-title">My Profile 👤</h1>
            <p className="text-slate-500 text-sm mt-1">Update your professional information</p>
          </div>

          {success && <div className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-sm px-4 py-3 rounded-xl mb-5">✅ Profile updated!</div>}

          <div className="card p-6 mb-5 space-y-4">
            <h2 className="section-title">Personal Info</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Full Name</label><input type="text" className="input" value={form.full_name} onChange={e=>set("full_name",e.target.value)}/></div>
              <div><label className="label">Phone</label><input type="tel" className="input" value={form.phone} onChange={e=>set("phone",e.target.value)}/></div>
            </div>
            <div><label className="label">Email (cannot change)</label><input type="email" className="input opacity-50 cursor-not-allowed" value={user?.email||""} disabled/></div>
          </div>

          <div className="card p-6 mb-5 space-y-4">
            <h2 className="section-title">Professional Info</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Specialty</label>
                <select className="input" value={form.specialty} onChange={e=>set("specialty",e.target.value)}>
                  {SPECIALTIES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="label">Experience (years)</label>
                <input type="number" className="input" value={form.experience_yrs} onChange={e=>set("experience_yrs",e.target.value)} min="0"/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Consultation Fee (BDT)</label><input type="number" className="input" value={form.consultation_fee} onChange={e=>set("consultation_fee",e.target.value)}/></div>
              <div><label className="label">Location</label><input type="text" className="input" value={form.location_text} onChange={e=>set("location_text",e.target.value)}/></div>
            </div>
            <div><label className="label">Bio</label><textarea className="input resize-none" rows={4} value={form.bio} onChange={e=>set("bio",e.target.value)}/></div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.available} onChange={e=>set("available",e.target.checked)} className="w-4 h-4 accent-blue-500"/>
              <span className="text-sm text-slate-300">Available for new appointments</span>
            </label>
          </div>

          <button onClick={handleSave} disabled={saving} className="btn-primary px-8">{saving?"Saving...":"Save Changes"}</button>
        </div>
      </main>
    </div>
  );
}
