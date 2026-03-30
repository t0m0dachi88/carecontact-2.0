"use client";
import { createClient } from "../../../lib/supabase";
import { useState } from "react";
import Link from "next/link";

const SPECIALTIES = ["General Medicine","Cardiology","Dermatology","Endocrinology","Gastroenterology","Neurology","Obstetrics & Gynecology","Oncology","Ophthalmology","Orthopedics","Pediatrics","Psychiatry","Pulmonology","Surgery","Urology"];

export default function DoctorRegisterPage() {
  const [form, setForm] = useState({ full_name:"",email:"",password:"",phone:"",specialty:"",license_number:"",experience_yrs:"",bio:"",consultation_fee:"",location_text:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleRegister = async (e) => {
    e.preventDefault(); setLoading(true); setError(null);
    const { error } = await supabase.auth.signUp({ email:form.email, password:form.password, options:{ data:{ full_name:form.full_name, phone:form.phone, role:"doctor", specialty:form.specialty, license_number:form.license_number, experience_yrs:parseInt(form.experience_yrs)||0, bio:form.bio, consultation_fee:parseFloat(form.consultation_fee)||0, location_text:form.location_text } } });
    if (error) { setError(error.message); setLoading(false); return; }
    setSuccess(true); setLoading(false);
  };

  if (success) return (
    <div className="page-bg min-h-screen flex items-center justify-center p-5">
      <div className="auth-card text-center animate-slide-up">
        <div className="text-5xl mb-4">⏳</div>
        <h1 className="text-2xl font-bold text-slate-100 mb-2" style={{fontFamily:"'Syne',sans-serif"}}>Application Submitted!</h1>
        <p className="text-slate-500 text-sm mb-2">An admin will verify your license within 24-48 hours.</p>
        <p className="text-blue-400 text-sm mb-6">Check your email to confirm your account first.</p>
        <Link href="/login" className="btn-primary inline-block">Go to Sign In →</Link>
      </div>
    </div>
  );

  return (
    <div className="page-bg min-h-screen flex items-center justify-center p-5 py-10">
      <div className="w-full max-w-lg animate-slide-up">
        <div className="card p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🩺</div>
            <h1 className="text-2xl font-bold text-slate-100 mb-1" style={{fontFamily:"'Syne',sans-serif"}}>Doctor Registration</h1>
            <p className="text-sm text-slate-500">Join CareContact as a verified doctor</p>
          </div>
          {error && <div className="bg-red-950/40 border border-red-800/40 text-red-400 text-sm px-4 py-3 rounded-xl mb-5">⚠️ {error}</div>}
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="border border-white/10 rounded-xl p-4 space-y-4">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Personal Info</p>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Full Name</label><input type="text" className="input" placeholder="Dr. John Doe" value={form.full_name} onChange={e=>set("full_name",e.target.value)} required/></div>
                <div><label className="label">Phone</label><input type="tel" className="input" placeholder="+880..." value={form.phone} onChange={e=>set("phone",e.target.value)}/></div>
              </div>
              <div><label className="label">Email</label><input type="email" className="input" placeholder="doctor@example.com" value={form.email} onChange={e=>set("email",e.target.value)} required/></div>
              <div><label className="label">Password</label><input type="password" className="input" placeholder="Min. 6 characters" value={form.password} onChange={e=>set("password",e.target.value)} required minLength={6}/></div>
            </div>
            <div className="border border-white/10 rounded-xl p-4 space-y-4">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Professional Info</p>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Specialty</label><select className="input" value={form.specialty} onChange={e=>set("specialty",e.target.value)} required><option value="">Select specialty</option>{SPECIALTIES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="label">Experience (yrs)</label><input type="number" className="input" placeholder="5" value={form.experience_yrs} onChange={e=>set("experience_yrs",e.target.value)} min="0"/></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">License Number</label><input type="text" className="input" placeholder="BMDC-12345" value={form.license_number} onChange={e=>set("license_number",e.target.value)} required/></div>
                <div><label className="label">Fee (BDT)</label><input type="number" className="input" placeholder="500" value={form.consultation_fee} onChange={e=>set("consultation_fee",e.target.value)}/></div>
              </div>
              <div><label className="label">Location</label><input type="text" className="input" placeholder="Dhaka Medical College" value={form.location_text} onChange={e=>set("location_text",e.target.value)}/></div>
              <div><label className="label">Short Bio</label><textarea className="input resize-none" rows={3} placeholder="Brief description..." value={form.bio} onChange={e=>set("bio",e.target.value)}/></div>
            </div>
            <div className="bg-yellow-950/30 border border-yellow-800/30 rounded-xl p-3 text-xs text-yellow-500">⚠️ Your account needs admin verification before activation.</div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>{loading?"Submitting...":"Submit Application →"}</button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">Already have an account? <Link href="/login" className="text-blue-400 font-medium">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
