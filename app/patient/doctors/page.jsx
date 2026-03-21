"use client";
import { createClient } from "../../../lib/supabase";
import { useState, useEffect, useCallback } from "react";
import Sidebar    from "../../../components/shared/Sidebar";
import DoctorCard from "../../../components/patient/doctors/DoctorCard";

const SPECIALTIES = ["All","General Medicine","Cardiology","Dermatology","Endocrinology","Gastroenterology","Neurology","Obstetrics & Gynecology","Oncology","Ophthalmology","Orthopedics","Pediatrics","Psychiatry","Pulmonology","Surgery","Urology"];

export default function DoctorsPage() {
  const [user, setUser]         = useState(null);
  const [profile, setProfile]   = useState(null);
  const [ready, setReady]       = useState(false);
  const [doctors, setDoctors]   = useState([]);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch]     = useState("");
  const [specialty, setSpecialty] = useState("");
  const [location, setLocation] = useState("");

  // Auth check
  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = "/login"; return; }
      setUser(session.user);
      createClient().from("profiles").select("*").eq("id", session.user.id).single()
        .then(({ data }) => { setProfile(data); setReady(true); });
    });
  }, []);

  // Fetch doctors
  const fetchDoctors = useCallback(async () => {
    setFetching(true);
    const params = new URLSearchParams();
    if (search)                       params.set("search", search);
    if (specialty && specialty !== "All") params.set("specialty", specialty);
    if (location)                     params.set("location", location);
    const res  = await fetch(`/api/doctors?${params}`);
    const data = await res.json();
    setDoctors(data.doctors || []);
    setFetching(false);
  }, [search, specialty, location]);

  // Load doctors once auth is ready
  useEffect(() => {
    if (ready) fetchDoctors();
  }, [ready]);

  // Debounce search input
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => fetchDoctors(), 400);
    return () => clearTimeout(t);
  }, [search]);

  if (!ready) return (
    <div className="page-bg min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="page-bg">
      <Sidebar role="patient" user={user} profile={profile} />
      <main className="main-content animate-fade-in">
        <div className="max-w-6xl">

          <div className="mb-8">
            <h1 className="page-title">Find a Doctor 🔍</h1>
            <p className="text-slate-500 text-sm mt-1">Browse verified doctors and book an appointment</p>
          </div>

          {/* Filters */}
          <div className="card p-4 mb-6 flex flex-wrap gap-3">
            <input type="text" placeholder="Search by name..." className="input flex-1 min-w-48"
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input w-52" value={specialty}
              onChange={e => { setSpecialty(e.target.value); setTimeout(fetchDoctors, 0); }}>
              {SPECIALTIES.map(s => <option key={s} value={s === "All" ? "" : s}>{s}</option>)}
            </select>
            <input type="text" placeholder="Filter by location..." className="input w-48"
              value={location} onChange={e => setLocation(e.target.value)} onBlur={fetchDoctors} />
            <button onClick={fetchDoctors} className="btn-primary px-5">Search</button>
          </div>

          {/* Results */}
          {fetching ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            </div>
          ) : doctors.length === 0 ? (
            <div className="card p-16 text-center">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-slate-400">No doctors found</p>
              <button onClick={() => { setSearch(""); setSpecialty(""); setLocation(""); }}
                className="mt-4 text-blue-400 text-sm hover:text-blue-300">Clear filters</button>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500 mb-4">{doctors.length} doctor{doctors.length !== 1 ? "s" : ""} found</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {doctors.map(d => <DoctorCard key={d.id} doctor={d} />)}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
