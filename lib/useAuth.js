"use client";
import { useState, useEffect } from "react";
import { createClient } from "../lib/supabase";

export function useAuth() {
  const [user, setUser]       = useState(undefined); // undefined = still loading
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        supabase.from("profiles").select("*").eq("id", session.user.id).single()
          .then(({ data }) => { setProfile(data); setLoading(false); });
      } else {
        setUser(null);
        setLoading(false);
      }
    });
  }, []);

  return { user, profile, loading, supabase };
}
