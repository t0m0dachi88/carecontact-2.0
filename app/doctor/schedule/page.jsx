"use client";
import { createClient } from "../../../lib/supabase";
import { useState, useEffect } from "react";
import Sidebar       from "../../../components/shared/Sidebar";
import LoadingScreen from "../../../components/shared/LoadingScreen";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const DEFAULT_SCHEDULE = DAYS.map(day => ({ day, enabled: !["Saturday","Sunday"].includes(day), start:"09:00", end:"17:00", break_start:"13:00", break_end:"14:00" }));

export default function SchedulePage() {
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
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [slotDuration, setSlotDuration] = useState(30);
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("doctors").select("working_hours, slot_duration").eq("id", user.id).single()
      .then(({ data }) => {
        if (data?.working_hours) setSchedule(data.working_hours);
        if (data?.slot_duration) setSlotDuration(data.slot_duration);
      });
  }, [user]);

  const updateDay = (idx, key, val) => {
    setSchedule(prev => prev.map((d,i) => i===idx ? { ...d, [key]:val } : d));
  };

  const handleSave = async () => {
    setSaving(true); setSuccess(false);
    await supabase.from("doctors").update({ working_hours: schedule, slot_duration: slotDuration }).eq("id", user.id);
    setSaving(false); setSuccess(true);
    setTimeout(()=>setSuccess(false), 3000);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="page-bg">
      <Sidebar role="doctor" user={user} profile={profile} />
      <main className="main-content animate-fade-in">
        <div className="max-w-3xl">
          <div className="mb-8">
            <h1 className="page-title">Schedule Management 🗓️</h1>
            <p className="text-slate-500 text-sm mt-1">Set your working hours and availability</p>
          </div>

          {success && <div className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-sm px-4 py-3 rounded-xl mb-5">✅ Schedule updated!</div>}

          <div className="card p-5 mb-5">
            <label className="label">Appointment Slot Duration</label>
            <select className="input max-w-xs" value={slotDuration} onChange={e=>setSlotDuration(Number(e.target.value))}>
              {[15,20,30,45,60].map(m=><option key={m} value={m}>{m} minutes</option>)}
            </select>
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="section-title">Working Hours</h2>
            {schedule.map((day, idx) => (
              <div key={day.day} className={`p-4 rounded-xl border transition-all ${day.enabled ? "border-blue-900/40 bg-blue-950/10" : "border-white/5 bg-white/2 opacity-60"}`}>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={day.enabled} onChange={e=>updateDay(idx,"enabled",e.target.checked)} className="w-4 h-4 accent-blue-500"/>
                    <span className="text-sm font-semibold text-slate-200">{day.day}</span>
                  </label>
                </div>
                {day.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Start Time</label>
                      <input type="time" className="input" value={day.start} onChange={e=>updateDay(idx,"start",e.target.value)}/>
                    </div>
                    <div>
                      <label className="label">End Time</label>
                      <input type="time" className="input" value={day.end} onChange={e=>updateDay(idx,"end",e.target.value)}/>
                    </div>
                    <div>
                      <label className="label">Break Start</label>
                      <input type="time" className="input" value={day.break_start} onChange={e=>updateDay(idx,"break_start",e.target.value)}/>
                    </div>
                    <div>
                      <label className="label">Break End</label>
                      <input type="time" className="input" value={day.break_end} onChange={e=>updateDay(idx,"break_end",e.target.value)}/>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button onClick={handleSave} disabled={saving} className="btn-primary px-8 mt-5">
            {saving ? "Saving..." : "Save Schedule"}
          </button>
        </div>
      </main>
    </div>
  );
}
