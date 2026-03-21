"use client";
import { createClient } from "../../../lib/supabase";
import { useState } from "react";
import Link from "next/link";

export default function PatientRegisterPage() {
  const [form, setForm] = useState({ full_name:"", email:"", password:"", phone:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleRegister = async (e) => {
    e.preventDefault(); setLoading(true); setError(null);
    const { error } = await supabase.auth.signUp({ email:form.email, password:form.password, options:{ data:{ full_name:form.full_name, phone:form.phone, role:"patient" } } });
    if (error) { setError(error.message); setLoading(false); return; }
    setSuccess(true); setLoading(false);
  };

  if (success) return (
    <div className="page-bg min-h-screen flex items-center justify-center p-5">
      <div className="auth-card text-center animate-slide-up">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-slate-100 mb-2" style={{fontFamily:"'Syne',sans-serif"}}>Account Created!</h1>
        <p className="text-slate-500 text-sm mb-6">Check your email to confirm your account, then sign in.</p>
        <Link href="/login" className="btn-primary inline-block">Go to Sign In →</Link>
      </div>
    </div>
  );

  return (
    <div className="page-bg min-h-screen flex items-center justify-center p-5">
      <div className="auth-card animate-slide-up">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">👤</div>
          <h1 className="text-2xl font-bold text-slate-100 mb-1" style={{fontFamily:"'Syne',sans-serif"}}>Patient Registration</h1>
          <p className="text-sm text-slate-500">Create your patient account</p>
        </div>
        {error && <div className="bg-red-950/40 border border-red-800/40 text-red-400 text-sm px-4 py-3 rounded-xl mb-5">⚠️ {error}</div>}
        <form onSubmit={handleRegister} className="space-y-4">
          <div><label className="label">Full Name</label><input type="text" className="input" placeholder="John Doe" value={form.full_name} onChange={e=>set("full_name",e.target.value)} required/></div>
          <div><label className="label">Email</label><input type="email" className="input" placeholder="you@example.com" value={form.email} onChange={e=>set("email",e.target.value)} required/></div>
          <div><label className="label">Phone</label><input type="tel" className="input" placeholder="+880..." value={form.phone} onChange={e=>set("phone",e.target.value)}/></div>
          <div><label className="label">Password</label><input type="password" className="input" placeholder="Min. 6 characters" value={form.password} onChange={e=>set("password",e.target.value)} required minLength={6}/></div>
          <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>{loading?"Creating...":"Create Account →"}</button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-6">Already have an account? <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign in</Link></p>
      </div>
    </div>
  );
}
