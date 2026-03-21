import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const search    = searchParams.get("search")    || "";
  const specialty = searchParams.get("specialty") || "";
  const location  = searchParams.get("location")  || "";

  // Use service role or anon — doctors list is public
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  let query = supabase.from("doctors").select(`
    id, specialty, experience_yrs, consultation_fee,
    location_text, available, verified,
    profile:profiles ( full_name, email, avatar_url )
  `).eq("verified", true);

  if (specialty) query = query.eq("specialty", specialty);
  if (location)  query = query.ilike("location_text", `%${location}%`);

  const { data: doctors, error } = await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter by name client-side (join filtering is limited in Supabase free tier)
  let filtered = doctors || [];
  if (search) {
    filtered = filtered.filter(d =>
      d.profile?.full_name?.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Attach avg rating
  const enriched = await Promise.all(filtered.map(async (doc) => {
    const { data: reviews } = await supabase
      .from("reviews").select("rating").eq("doctor_id", doc.id);
    const avg = reviews?.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;
    return { ...doc, avg_rating: avg ? parseFloat(avg.toFixed(1)) : null, review_count: reviews?.length || 0 };
  }));

  return NextResponse.json({ doctors: enriched });
}
