import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase(request) {
  // Get token from Authorization header
  const auth  = request.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    token ? {
      global: { headers: { Authorization: `Bearer ${token}` } },
    } : {}
  );
  return { supabase, token };
}

export async function GET(request) {
  const { supabase, token } = getSupabase(request);

  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = profile?.role;

  let query = supabase.from("appointments").select(`
    id, scheduled_at, status, duration_mins, notes,
    doctor:doctors ( id, specialty, profile:profiles(full_name) ),
    patient:patients ( id, profile:profiles(full_name, email) )
  `).order("scheduled_at", { ascending: true });

  if (role === "patient")      query = query.eq("patient_id", user.id);
  else if (role === "doctor")  query = query.eq("doctor_id",  user.id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ appointments: data || [] });
}

export async function POST(request) {
  const { supabase, token } = getSupabase(request);

  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { doctor_id, scheduled_at, duration_mins = 30 } = body;

  if (!doctor_id || !scheduled_at)
    return NextResponse.json({ error: "doctor_id and scheduled_at are required" }, { status: 400 });

  // Check doctor is verified
  const { data: doctor } = await supabase.from("doctors").select("id, verified").eq("id", doctor_id).single();
  if (!doctor?.verified)
    return NextResponse.json({ error: "Doctor not found or not verified" }, { status: 404 });

  // Check for conflicts
  const start = new Date(scheduled_at);
  const end   = new Date(start.getTime() + duration_mins * 60000);
  const { data: conflicts } = await supabase
    .from("appointments").select("id")
    .eq("doctor_id", doctor_id)
    .in("status", ["pending","confirmed"])
    .gte("scheduled_at", start.toISOString())
    .lt("scheduled_at", end.toISOString());

  if (conflicts?.length > 0)
    return NextResponse.json({ error: "This time slot is already booked" }, { status: 409 });

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({ patient_id: user.id, doctor_id, scheduled_at, duration_mins, status: "pending" })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify doctor
  await supabase.from("notifications").insert({
    user_id: doctor_id,
    type:    "appointment",
    title:   "New Appointment Request",
    body:    `A patient has booked an appointment on ${new Date(scheduled_at).toLocaleDateString()}`,
  });

  return NextResponse.json({ appointment }, { status: 201 });
}
