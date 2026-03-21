import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase(request) {
  const auth  = request.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}
  );
  return { supabase, token };
}

export async function PATCH(request, { params }) {
  const { supabase, token } = getSupabase(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  const body   = await request.json();
  const { status, notes, scheduled_at } = body;

  const allowed = ["pending","confirmed","cancelled","completed"];
  if (status && !allowed.includes(status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const updates = {};
  if (status)       updates.status       = status;
  if (notes)        updates.notes        = notes;
  if (scheduled_at) updates.scheduled_at = scheduled_at;

  const { data, error } = await supabase
    .from("appointments").update(updates).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ appointment: data });
}
