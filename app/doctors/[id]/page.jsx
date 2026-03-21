"use client";
import { createClient } from "../../../lib/supabase";
import { useState, useEffect } from "react";
import Link from "next/link";

function Stars({ rating, size = "sm" }) {
  const r   = Math.round(rating || 0);
  const cls = size === "lg" ? "text-base" : "text-xs";
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`${cls} ${i <= r ? "text-yellow-400" : "text-slate-700"}`}>★</span>
      ))}
    </div>
  );
}

export default function DoctorProfilePage({ params }) {
  const { id } = params;
  const [doctor, setDoctor]   = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetch = async () => {
      const [{ data: doc }, { data: revs }] = await Promise.all([
        supabase.from("doctors").select(`*, profile:profiles(full_name, email, avatar_url)`).eq("id", id).single(),
        supabase.from("reviews").select(`*, patient:patients(profile:profiles(full_name))`).eq("doctor_id", id).order("created_at", { ascending: false }),
      ]);
      setDoctor(doc); setReviews(revs || []);
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) return (
    <div className="page-bg min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
  );

  if (!doctor) return (
    <div className="page-bg min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-400">Doctor not found</p>
        <Link href="/patient/doctors" className="text-blue-400 text-sm mt-2 block">← Back to doctors</Link>
      </div>
    </div>
  );

  const avgRating = reviews.length ? reviews.reduce((s,r)=>s+r.rating,0)/reviews.length : null;

  return (
    <div className="page-bg min-h-screen p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">

        <Link href="/patient/doctors" className="text-sm text-blue-400 hover:text-blue-300">← Back to doctors</Link>

        {/* Profile card */}
        <div className="card p-8">
          <div className="flex items-start gap-6 flex-wrap">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-4xl flex-shrink-0">🩺</div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-100" style={{fontFamily:"'Syne',sans-serif"}}>Dr. {doctor.profile?.full_name}</h1>
              <p className="text-blue-400 font-medium mt-1">{doctor.specialty}</p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {avgRating && <Stars rating={avgRating} size="lg" />}
                {avgRating && <span className="text-slate-400 text-sm">{avgRating.toFixed(1)} ({reviews.length} reviews)</span>}
                <span className={`badge ${doctor.available ? "badge-completed" : "badge-cancelled"}`}>
                  {doctor.available ? "Available" : "Unavailable"}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {[
                  { label:"Experience", value:`${doctor.experience_yrs || 0} years` },
                  { label:"Fee",        value:`৳${doctor.consultation_fee || 0}` },
                  { label:"License",    value:doctor.license_number || "—" },
                  { label:"Location",   value:doctor.location_text || "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/5 rounded-xl p-3">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-sm font-semibold text-slate-200 mt-1 truncate">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {doctor.bio && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">About</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{doctor.bio}</p>
            </div>
          )}

          <div className="mt-6">
            <Link href={`/patient/appointments?doctor=${doctor.id}`} className="btn-primary inline-block px-8">
              Book Appointment
            </Link>
          </div>
        </div>

        {/* Reviews */}
        <div className="card p-6">
          <h2 className="section-title mb-5">Patient Reviews ({reviews.length})</h2>
          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm">No reviews yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map(r => (
                <div key={r.id} className="border-b border-white/10 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-800/40 flex items-center justify-center text-xs font-bold text-blue-300">
                        {r.patient?.profile?.full_name?.[0] || "P"}
                      </div>
                      <span className="text-sm font-medium text-slate-200">{r.patient?.profile?.full_name || "Patient"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Stars rating={r.rating} />
                      <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {r.feedback && <p className="text-sm text-slate-400 ml-11">{r.feedback}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
