import { redirect } from "next/navigation";
import { createClient } from "../lib/supabaseServer";

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "admin")  redirect("/admin/dashboard");
  if (profile?.role === "doctor") redirect("/doctor/dashboard");
  redirect("/patient/dashboard");
}
