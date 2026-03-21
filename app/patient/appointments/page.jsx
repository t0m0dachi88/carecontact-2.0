"use client";
import { useState, useEffect, Suspense } from "react";
import { createClient } from "../../../lib/supabase";
import { authFetch } from "../../../lib/authFetch";
import { useSearchParams } from "next/navigation";
import Sidebar from "../../../components/shared/Sidebar";

const STATUS_BADGE = {
  pending:   "badge-pending",
  confirmed: "badge-confirmed",
  completed: "badge-completed",
  cancelled: "badge-cancelled",
};

function BookingModal({ preSelectedDoctorId, onClose, onBooked }) {
  const [doctors, setDoctors]   = useState([]);
  const [doctorId, setDoctorId] = useState(preSelectedDoctorId || "");
  const [date, setDate]         = useState("");
  const [time, setTime]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [fetchingDocs, setFetchingDocs] = useState(true);

  useEffect(() => {
    fetch("/api/doctors").then(r => r.json()).then(d => {
      setDoctors(d.doctors || []);
      setFetchingDocs(false);
    });
  }, []);

  const handleBook = async () => {
    if (!doctorId || !date || !time) { setError("Please fill all fields"); return; }
    setLoading(true); setError(null);
    const scheduled_at = new Date(`${date}T${time}`).toISOString();
    const res  = await authFetch("/api/appointments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctor_id: doctorId, scheduled_at }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    onBooked();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center">📅</div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Book Appointment</h2>
              <p className="text-xs text-slate-500">Select doctor, date and time</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl cursor-pointer">✕</button>
        </div>
        <div className="modal-body space-y-4">
          {error && <div className="bg-red-950/40 border border-red-800/40 text-red-400 text-sm px-4 py-3 rounded-xl">⚠️ {error}</div>}
          <div>
            <label className="label">Select Doctor</label>
            {fetchingDocs ? <p className="text-slate-500 text-sm">Loading doctors...</p> : (
              <select className="input" value={doctorId} onChange={e => setDoctorId(e.target.value)}>
                <option value="">Choose a doctor...</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>Dr. {d.profile?.full_name} — {d.specialty} (৳{d.consultation_fee})</option>
                ))}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={date}
                min={new Date().toISOString().split("T")[0]} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Time</label>
              <input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <button onClick={handleBook} disabled={loading} className="btn-primary w-full">
            {loading ? "Booking..." : "Confirm Booking →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppointmentsContent() {
  const searchParams = useSearchParams();
  const preDocId     = searchParams.get("doctor");
  const [user, setUser]           = useState(null);
  const [profile, setProfile]     = useState(null);
  const [ready, setReady]         = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [showModal, setShowModal] = useState(!!preDocId);
  const [filter, setFilter]       = useState("upcoming");
  const [actionLoading, setActionLoading] = useState(null);
  const [success, setSuccess]     = useState(null);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }
      setUser(session.user);
      const { data: p } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setProfile(p);
      const res  = await authFetch("/api/appointments");
      const data = await res.json();
      setAppointments(data.appointments || []);
      setReady(true);
    };
    init();
  }, []);

  const loadAppointments = async () => {
    const res  = await authFetch("/api/appointments");
    const data = await res.json();
    setAppointments(data.appointments || []);
  };

  const handleCancel = async (id) => {
    if (!confirm("Cancel this appointment?")) return;
    setActionLoading(id);
    await authFetch(`/api/appointments/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    await loadAppointments();
    setActionLoading(null);
  };

  const handleBooked = async () => {
    setShowModal(false);
    setSuccess("Appointment booked successfully!");
    await loadAppointments();
    setTimeout(() => setSuccess(null), 4000);
  };

  if (!ready) return (
    <div className="page-bg min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <p className="text-slate-400 text-sm">Loading appointments...</p>
      </div>
    </div>
  );

  const now = new Date();
  const filtered = appointments.filter(a => {
    const d = new Date(a.scheduled_at);
    if (filter === "upcoming")  return ["pending","confirmed"].includes(a.status) && d >= now;
    if (filter === "past")      return a.status === "completed" || d < now;
    if (filter === "cancelled") return a.status === "cancelled";
    return true;
  });

  return (
    <div className="page-bg">
      <Sidebar role="patient" user={user} profile={profile} />
      <main className="main-content animate-fade-in">
        <div className="max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="page-title">Appointments 📅</h1>
              <p className="text-slate-500 text-sm mt-1">Manage your healthcare visits</p>
            </div>
            <button onClick={() => setShowModal(true)} className="btn-primary">+ Book Appointment</button>
          </div>

          {success && (
            <div className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-sm px-4 py-3 rounded-xl mb-5">
              ✅ {success}
            </div>
          )}

          <div className="flex gap-2 mb-6 flex-wrap">
            {["upcoming","past","cancelled","all"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={filter === f ? "btn-primary text-sm px-4 py-2" : "btn-secondary text-sm px-4 py-2"}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="card p-16 text-center">
              <div className="text-5xl mb-4">📅</div>
              <p className="text-slate-400">No {filter} appointments</p>
              {filter === "upcoming" && (
                <button onClick={() => setShowModal(true)} className="btn-primary mt-4">Book Now</button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(appt => {
                const date    = new Date(appt.scheduled_at);
                const isPast  = date < now;
                const canCancel = ["pending","confirmed"].includes(appt.status) && !isPast;
                return (
                  <div key={appt.id} className="card p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-xl flex-shrink-0">🩺</div>
                        <div>
                          <p className="font-semibold text-slate-100">Dr. {appt.doctor?.profile?.full_name}</p>
                          <p className="text-xs text-blue-400 mt-0.5">{appt.doctor?.specialty}</p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-xs text-slate-400">📅 {date.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}</span>
                            <span className="text-xs text-slate-400">⏰ {date.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}</span>
                            <span className="text-xs text-slate-400">⏱ {appt.duration_mins || 30} min</span>
                          </div>
                          {appt.notes && <p className="text-xs text-slate-500 mt-2 italic">{appt.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={STATUS_BADGE[appt.status] || "badge-pending"}>{appt.status}</span>
                        {canCancel && (
                          <button onClick={() => handleCancel(appt.id)} disabled={actionLoading === appt.id}
                            className="btn-danger text-xs px-3 py-1.5">
                            {actionLoading === appt.id ? "..." : "Cancel"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <BookingModal
          preSelectedDoctorId={preDocId}
          onClose={() => setShowModal(false)}
          onBooked={handleBooked}
        />
      )}
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={
      <div className="page-bg min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    }>
      <AppointmentsContent />
    </Suspense>
  );
}
