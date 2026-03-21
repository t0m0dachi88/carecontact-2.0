"use client";
import { createClient } from "../../lib/supabase";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [status, setStatus]     = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatus("Signing in...");

    const supabase = createClient();

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      setStatus("");
      return;
    }

    setStatus("Loading your profile...");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    const role = profile?.role || "patient";
    setStatus("Redirecting...");

    // Use router.push style — let Next.js handle it
    if (role === "admin")       window.location.href = "/admin/dashboard";
    else if (role === "doctor") window.location.href = "/doctor/dashboard";
    else                        window.location.href = "/patient/dashboard";
  };

  return (
    <div className="page-bg min-h-screen flex items-center justify-center p-5">
      <div className="animate-slide-up auth-card">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏥</div>
          <h1 className="text-2xl font-bold text-slate-100 mb-1"
            style={{ fontFamily: "'Syne', sans-serif" }}>
            CareConnect
          </h1>
          <p className="text-sm text-slate-500">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-800/40 text-red-400 text-sm px-4 py-3 rounded-xl mb-5">
            ⚠️ {error}
          </div>
        )}

        {loading && status && (
          <div className="bg-blue-950/40 border border-blue-800/40 text-blue-400 text-sm px-4 py-3 rounded-xl mb-5 flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin flex-shrink-0" />
            {status}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              required disabled={loading} />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
              required disabled={loading} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Please wait..." : "Sign In →"}
          </button>
        </form>

        <div className="border-t border-white/10 mt-7 pt-6 text-center space-y-2">
          <p className="text-sm text-slate-500">
            New patient?{" "}
            <Link href="/register/patient" className="text-blue-400 hover:text-blue-300 font-medium">
              Register here
            </Link>
          </p>
          <p className="text-sm text-slate-500">
            Are you a doctor?{" "}
            <Link href="/register/doctor" className="text-blue-400 hover:text-blue-300 font-medium">
              Join as a doctor
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
