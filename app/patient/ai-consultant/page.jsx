"use client";
import { createClient } from "../../../lib/supabase";
import { useState, useEffect, useRef } from "react";
import Sidebar          from "../../../components/shared/Sidebar";
import LoadingScreen    from "../../../components/shared/LoadingScreen";
import ChatWindow       from "../../../components/ai/ChatWindow";
import ReportModal      from "../../../components/ai/ReportModal";
import { extractReport, hasReport } from "../../../lib/utils";

const INIT_MSG = "Hello, I am here for my pre-appointment check-in.";

export default function AIConsultantPage() {
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
  const [appointments, setAppointments]   = useState([]);
  const [selectedAppt, setSelectedAppt]   = useState(null);
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState("");
  const [chatLoading, setChatLoading]     = useState(false);
  const [started, setStarted]             = useState(false);
  const [report, setReport]               = useState(null);
  const [showReport, setShowReport]       = useState(false);
  const [sessionId, setSessionId]         = useState(null);
  const [error, setError]                 = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("appointments").select(`id,scheduled_at,doctor:doctors(specialty,profile:profiles(full_name))`).eq("patient_id",user.id).in("status",["pending","confirmed"]).gte("scheduled_at",new Date().toISOString()).order("scheduled_at",{ascending:true})
      .then(({ data }) => setAppointments(data || []));
  }, [user]);

  const createSession = async () => {
    const { data, error } = await supabase.from("ai_sessions").insert({ patient_id:user.id, appointment_id:selectedAppt||null, status:"in_progress" }).select().single();
    if (error) { console.error(error); return null; }
    return data.id;
  };

  const saveMessage = async (sid, role, content) => {
    if (!sid) return;
    await supabase.from("ai_messages").insert({ session_id:sid, role, content });
  };

  const handleStart = async () => {
    setStarted(true); setChatLoading(true); setError(null);
    const sid = await createSession();
    setSessionId(sid);
    try {
      const res  = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ messages:[{ role:"user", content:INIT_MSG }] }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await saveMessage(sid, "user", INIT_MSG);
      await saveMessage(sid, "assistant", data.reply);
      setMessages([{ role:"user", content:INIT_MSG, hidden:true }, { role:"assistant", content:data.reply }]);
    } catch (err) {
      setError(err.message);
      setMessages([{ role:"assistant", content:"Hello! Could you start by telling me your name and age?" }]);
    }
    setChatLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || chatLoading) return;
    const userContent = input.trim(); setInput(""); setError(null);
    const newMessages = [...messages, { role:"user", content:userContent }];
    setMessages(newMessages); setChatLoading(true);
    await saveMessage(sessionId, "user", userContent);
    try {
      const apiMessages   = newMessages.filter(m=>!m.hidden).map(m=>({ role:m.role, content:m.content }));
      const finalMessages = messages.some(m=>m.hidden) ? [{ role:"user", content:INIT_MSG }, ...apiMessages] : apiMessages;
      const res  = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ messages:finalMessages }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await saveMessage(sessionId, "assistant", data.reply);
      const updated = [...newMessages, { role:"assistant", content:data.reply }];
      setMessages(updated);
      if (hasReport(data.reply)) {
        const r = extractReport(data.reply);
        if (r) { setReport(r); setTimeout(() => setShowReport(true), 1200); }
      }
    } catch (err) {
      setError(err.message);
      setMessages(prev => [...prev, { role:"assistant", content:"Connection error. Please try again." }]);
    }
    setChatLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKey = (e) => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const resetSession = () => {
    setMessages([]); setInput(""); setChatLoading(false);
    setStarted(false); setReport(null); setShowReport(false);
    setSessionId(null); setError(null); setSelectedAppt(null);
  };

  if (loading) return <LoadingScreen />;

  const patientName = profile?.full_name || "Patient";

  return (
    <div className="page-bg">
      <Sidebar role="patient" user={user} profile={profile} />
      <main className="main-content animate-fade-in">
        <div className="mb-6">
          <h1 className="page-title">AI Health Consultant 🤖</h1>
          <p className="text-slate-500 text-sm mt-1">Complete your pre-consultation before your appointment</p>
        </div>

        {/* Appointment selector */}
        {!started && appointments.length > 0 && (
          <div className="card p-5 mb-6 max-w-lg">
            <label className="label">Link to an upcoming appointment (optional)</label>
            <select className="input" value={selectedAppt || ""} onChange={e => setSelectedAppt(e.target.value || null)}>
              <option value="">No specific appointment</option>
              {appointments.map(a => (
                <option key={a.id} value={a.id}>
                  Dr. {a.doctor?.profile?.full_name} — {a.doctor?.specialty} · {new Date(a.scheduled_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Chat container */}
        <div className="chat-wrap" style={{ minHeight:"70vh" }}>
          <div className="chat-container">
            {/* Header */}
            <div className="chat-header">
              <div className="chat-avatar">🩺</div>
              <div style={{flex:1}}>
                <div style={{color:"#e2eeff",fontWeight:700,fontSize:"0.95rem",fontFamily:"'Syne',sans-serif"}}>MediPrep Assistant</div>
                <div style={{display:"flex",alignItems:"center",gap:5,marginTop:3}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:"#34d399",display:"inline-block"}} />
                  <span style={{color:"rgba(148,163,184,0.8)",fontSize:"0.68rem"}}>{patientName} · Pre-appointment screening</span>
                </div>
              </div>
              {report && <button onClick={() => setShowReport(true)} style={{background:"rgba(59,130,246,0.15)",border:"1px solid rgba(59,130,246,0.3)",color:"#93c5fd",padding:"6px 12px",borderRadius:9,cursor:"pointer",fontSize:"0.72rem",fontWeight:600}}>📋 Report</button>}
            </div>
            <div className="disclaimer-bar">⚕️ Pre-screening tool only · Not a substitute for medical advice · For physician review</div>
            {error && <div className="px-4 py-2 bg-red-950/40 border-b border-red-800/40 text-red-400 text-xs text-center">⚠️ {error}</div>}

            <div className="chat-main">
              {!started ? (
                <div className="welcome-screen">
                  <div style={{fontSize:"3.5rem",filter:"drop-shadow(0 0 22px rgba(59,130,246,0.5))"}}>🏥</div>
                  <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:"1.3rem",color:"#e2eeff",fontWeight:700}}>Ready for your check-in?</h1>
                  <p style={{color:"#475569",fontSize:"0.83rem",lineHeight:1.65,maxWidth:300,textAlign:"center"}}>I will ask you a few questions about your health concern before your appointment.</p>
                  <p style={{color:"#1e3a5f",fontSize:"0.74rem"}}>⏱ Takes about 3–5 minutes</p>
                  {selectedAppt && <p style={{color:"#60a5fa",fontSize:"0.75rem",background:"rgba(59,130,246,0.1)",padding:"6px 14px",borderRadius:20,border:"1px solid rgba(59,130,246,0.2)"}}>📅 Linked to appointment</p>}
                  <button className="start-btn" onClick={handleStart} disabled={chatLoading}>{chatLoading?"Starting...":"Begin Check-in →"}</button>
                  <p style={{color:"#1e3a5f",fontSize:"0.68rem"}}>⚕️ Pre-screening only · Not a substitute for medical advice</p>
                </div>
              ) : (
                <ChatWindow messages={messages.filter(m=>!m.hidden)} loading={chatLoading} onViewReport={() => setShowReport(true)} />
              )}
            </div>

            {started && (
              <div className="chat-input-bar">
                <textarea ref={inputRef} className="chat-input-box" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} placeholder="Type your answer..." disabled={chatLoading} rows={1} />
                <button className={`chat-send-btn ${input.trim()&&!chatLoading?"chat-send-active":"chat-send-inactive"}`} onClick={handleSend} disabled={!input.trim()||chatLoading}>
                  {chatLoading?"⏳":"➤"}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {showReport && report && (
        <ReportModal report={report} onClose={() => setShowReport(false)} onNewSession={resetSession} sessionId={sessionId} patientId={user?.id} patientName={patientName} />
      )}
    </div>
  );
}
