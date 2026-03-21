"use client";
import { createClient } from "../../../lib/supabase";
import { useState, useEffect, useRef } from "react";
import Sidebar       from "../../../components/shared/Sidebar";
import LoadingScreen from "../../../components/shared/LoadingScreen";

export default function MessagesPage() {
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
  const [conversations, setConversations] = useState([]);
  const [active, setActive]               = useState(null);
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState("");
  const [sending, setSending]             = useState(false);
  const [fetching, setFetching]           = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    fetchConversations();
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!active) return;
    fetchMessages(active.id);
    // Realtime subscription
    const channel = supabase
      .channel(`conv-${active.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${active.id}` },
        (payload) => setMessages(prev => [...prev, payload.new])
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [active]);

  const fetchConversations = async () => {
    const { data } = await supabase
      .from("conversations")
      .select(`id,created_at,doctor:doctors(id,specialty,profile:profiles(full_name))`)
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false });
    setConversations(data || []);
    setFetching(false);
  };

  const fetchMessages = async (convId) => {
    const { data } = await supabase
      .from("direct_messages")
      .select("id,content,sender_id,created_at,read")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    // Mark as read
    await supabase.from("direct_messages").update({ read: true })
      .eq("conversation_id", convId).neq("sender_id", user.id);
  };

  const handleSend = async () => {
    if (!input.trim() || !active || sending) return;
    setSending(true);
    await supabase.from("direct_messages").insert({
      conversation_id: active.id, sender_id: user.id, content: input.trim()
    });
    setInput("");
    setSending(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (loading || fetching) return <LoadingScreen />;

  return (
    <div className="page-bg">
      <Sidebar role="patient" user={user} profile={profile} />
      <main className="main-content animate-fade-in" style={{ padding: 0 }}>
        <div className="flex h-screen" style={{ marginLeft: 0 }}>

          {/* Sidebar conversation list */}
          <div className="w-72 border-r border-white/10 bg-white/[0.02] flex flex-col flex-shrink-0">
            <div className="p-5 border-b border-white/10">
              <h1 className="page-title text-lg">Messages 💬</h1>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-slate-500 text-sm">No conversations yet</p>
                  <p className="text-slate-600 text-xs mt-1">Book an appointment to message a doctor</p>
                </div>
              ) : (
                conversations.map(conv => (
                  <button key={conv.id} onClick={() => setActive(conv)}
                    className={`w-full text-left p-4 border-b border-white/5 transition-colors ${active?.id === conv.id ? "bg-blue-600/20" : "hover:bg-white/5"}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-lg flex-shrink-0">🩺</div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-medium text-slate-200 truncate">Dr. {conv.doctor?.profile?.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{conv.doctor?.specialty}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            {!active ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl mb-3">💬</div>
                  <p className="text-slate-400">Select a conversation</p>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-lg">🩺</div>
                  <div>
                    <p className="font-semibold text-slate-100">Dr. {active.doctor?.profile?.full_name}</p>
                    <p className="text-xs text-slate-500">{active.doctor?.specialty}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                  {messages.map(msg => {
                    const isMe = msg.sender_id === user.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-sm" : "bg-white/10 text-slate-200 rounded-bl-sm"}`}>
                          <p>{msg.content}</p>
                          <p className={`text-xs mt-1 ${isMe ? "text-blue-200" : "text-slate-500"}`}>
                            {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="px-6 py-4 border-t border-white/10 flex gap-3">
                  <input type="text" className="input flex-1" placeholder="Type a message..."
                    value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} />
                  <button onClick={handleSend} disabled={!input.trim() || sending} className="btn-primary px-5">
                    {sending ? "..." : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
