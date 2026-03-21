"use client";
import { createClient } from "../../../lib/supabase";
import { useState, useEffect } from "react";
import Sidebar       from "../../../components/shared/Sidebar";
import LoadingScreen from "../../../components/shared/LoadingScreen";

export default function AdminUsersPage() {
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
  const [users, setUsers]   = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [fetching, setFetching] = useState(true);

  const fetchUsers = async (f) => {
    setFilter(f); setFetching(true);
    let q = supabase.from("profiles").select("*").neq("role","admin").order("created_at",{ascending:false});
    if (f !== "all") q = q.eq("role",f);
    const { data } = await q;
    setUsers(data||[]); setFetching(false);
  };

  useEffect(() => { if (user) fetchUsers("all"); }, [user]);

  const toggleActive = async (uid, current) => {
    await supabase.from("profiles").update({ is_active:!current }).eq("id",uid);
    setUsers(prev => prev.map(u => u.id===uid ? {...u,is_active:!current} : u));
  };

  const filtered = users.filter(u => u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  if (loading || fetching) return <LoadingScreen />;

  return (
    <div className="page-bg">
      <Sidebar role="admin" user={user} profile={profile} />
      <main className="main-content animate-fade-in">
        <div className="max-w-6xl">
          <div className="mb-8">
            <h1 className="page-title">User Management 👥</h1>
            <p className="text-slate-500 text-sm mt-1">Manage all platform users</p>
          </div>
          <div className="flex gap-3 mb-6 flex-wrap">
            <input type="text" className="input max-w-xs" placeholder="Search by name or email..." value={search} onChange={e=>setSearch(e.target.value)}/>
            {["all","patient","doctor"].map(f=>(
              <button key={f} onClick={()=>fetchUsers(f)} className={filter===f?"btn-primary text-sm px-4 py-2":"btn-secondary text-sm px-4 py-2"}>
                {f.charAt(0).toUpperCase()+f.slice(1)}s
              </button>
            ))}
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {["User","Role","Phone","Joined","Status","Action"].map(h=>(
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u,i)=>(
                  <tr key={u.id} className={`border-b border-white/5 ${i%2===0?"":"bg-white/[0.02]"}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-800/40 flex items-center justify-center text-sm font-bold text-blue-300">{u.full_name?.[0]?.toUpperCase()||"?"}</div>
                        <div><p className="text-sm font-medium text-slate-200">{u.full_name}</p><p className="text-xs text-slate-500">{u.email}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className={u.role==="doctor"?"badge-verified badge":"badge-confirmed badge"}>{u.role}</span></td>
                    <td className="px-5 py-4 text-xs text-slate-500">{u.phone||"—"}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-4"><span className={u.is_active!==false?"badge-completed badge":"badge-cancelled badge"}>{u.is_active!==false?"Active":"Inactive"}</span></td>
                    <td className="px-5 py-4">
                      <button onClick={()=>toggleActive(u.id,u.is_active!==false)} className={u.is_active!==false?"btn-danger text-xs px-3 py-1.5":"btn-success text-xs px-3 py-1.5"}>
                        {u.is_active!==false?"Deactivate":"Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length===0 && <div className="p-8 text-center text-slate-500 text-sm">No users found</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
