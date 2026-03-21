"use client";
import Link from "next/link";

function Stars({ rating }) {
  const r = Math.round(rating || 0);
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`text-xs ${i <= r ? "text-yellow-400" : "text-slate-700"}`}>★</span>
      ))}
      <span className="text-xs text-slate-500 ml-1">{rating ? rating.toFixed(1) : "New"}</span>
    </div>
  );
}

export default function DoctorCard({ doctor }) {
  const { id, specialty, experience_yrs, consultation_fee, location_text, available, avg_rating, review_count } = doctor;
  const name = doctor.profile?.full_name || "Unknown";

  return (
    <div className="card-hover p-5 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-2xl flex-shrink-0">🩺</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-100">Dr. {name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${available ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" : "bg-slate-800/60 text-slate-500 border border-slate-700/40"}`}>
              {available ? "Available" : "Unavailable"}
            </span>
          </div>
          <p className="text-xs text-blue-400 font-medium mt-0.5">{specialty}</p>
          <Stars rating={avg_rating} />
          <p className="text-xs text-slate-500 mt-0.5">{review_count || 0} reviews</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label:"Experience", value:`${experience_yrs || 0} yrs` },
          { label:"Fee",        value:`৳${consultation_fee || 0}` },
          { label:"Location",   value: location_text ? location_text.split(",")[0] : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/5 rounded-xl p-2">
            <p className="text-xs font-semibold text-slate-200 truncate">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Link href={`/doctors/${id}`}
          className="flex-1 text-center text-xs btn-secondary py-2">
          View Profile
        </Link>
        <Link href={`/patient/appointments?doctor=${id}`}
          className="flex-1 text-center text-xs btn-primary py-2">
          Book Now
        </Link>
      </div>
    </div>
  );
}
