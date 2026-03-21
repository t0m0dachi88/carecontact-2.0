"use client";
import { createClient } from "../../../lib/supabase";

export default function PendingPage() {
  const supabase = createClient();
  const handleLogout = async () => { await supabase.auth.signOut(); window.location.replace("/login"); };
  return (
    <div className="page-bg min-h-screen flex items-center justify-center p-5">
      <div className="auth-card text-center animate-slide-up">
        <div className="text-6xl mb-5">⏳</div>
        <h1 className="text-2xl font-bold text-slate-100 mb-3" style={{fontFamily:"'Syne',sans-serif"}}>Verification Pending</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-2">Your application is under review. An admin will verify your medical license within <span className="text-blue-400 font-medium">24-48 hours</span>.</p>
        <p className="text-slate-500 text-sm mb-8">You will receive an email notification once approved.</p>
        <div className="bg-blue-950/30 border border-blue-800/30 rounded-xl p-4 mb-6 text-left space-y-2">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">What happens next?</p>
          {["Admin reviews your license","Credentials verified","Account activated — email notification","Full doctor portal access granted"].map((step,i)=>(
            <div key={i} className="flex items-center gap-3 text-sm text-slate-400">
              <span className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-600/40 text-blue-400 text-xs flex items-center justify-center flex-shrink-0 font-bold">{i+1}</span>
              {step}
            </div>
          ))}
        </div>
        <button onClick={handleLogout} className="btn-secondary w-full">Sign Out</button>
      </div>
    </div>
  );
}
