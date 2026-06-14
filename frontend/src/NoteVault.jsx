import { useState, useEffect, useCallback } from "react";

const API = "https://note-management-system-opal.vercel.app/api";

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const COLORS = [
  { id: "violet", bg: "bg-violet-500/20", border: "border-violet-500/40", dot: "bg-violet-400", glow: "shadow-violet-500/30" },
  { id: "cyan", bg: "bg-cyan-500/20", border: "border-cyan-500/40", dot: "bg-cyan-400", glow: "shadow-cyan-500/30" },
  { id: "rose", bg: "bg-rose-500/20", border: "border-rose-500/40", dot: "bg-rose-400", glow: "shadow-rose-500/30" },
  { id: "amber", bg: "bg-amber-500/20", border: "border-amber-500/40", dot: "bg-amber-400", glow: "shadow-amber-500/30" },
  { id: "emerald", bg: "bg-emerald-500/20", border: "border-emerald-500/40", dot: "bg-emerald-400", glow: "shadow-emerald-500/30" },
  { id: "fuchsia", bg: "bg-fuchsia-500/20", border: "border-fuchsia-500/40", dot: "bg-fuchsia-400", glow: "shadow-fuchsia-500/30" },
];

const apiFetch = async (path, options = {}, token = null) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

function Toast({ toasts }) {
  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id}
          className={`px-4 py-2 rounded-xl text-sm font-medium shadow-xl backdrop-blur-md border
            ${t.type === "error" ? "bg-rose-500/80 border-rose-400/40 text-white" : "bg-white/10 border-white/20 text-white"}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {COLORS.map((c) => (
        <button key={c.id} onClick={() => onChange(c.id)}
          className={`w-6 h-6 rounded-full ${c.dot} transition-all duration-200
            ${value === c.id ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-125" : "opacity-60 hover:opacity-100"}`} />
      ))}
    </div>
  );
}

function Tag({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-xs text-white/70">
      {label}
      {onRemove && <button onClick={onRemove} className="hover:text-rose-400 transition-colors">x</button>}
    </span>
  );
}

function ActionBtn({ children, onClick, danger, title }) {
  return (
    <button onClick={onClick} title={title}
      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs backdrop-blur-sm transition-all duration-150
        ${danger ? "bg-rose-500/30 hover:bg-rose-500/60 border border-rose-500/40" : "bg-white/10 hover:bg-white/20 border border-white/10"}`}>
      {children}
    </button>
  );
}

function NoteCard({ note, onEdit, onDelete, onPin, onOpen, view }) {
  const c = COLORS.find((x) => x.id === note.color) || COLORS[0];
  const [hovered, setHovered] = useState(false);

  if (view === "list") {
    return (
      <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onClick={() => onOpen(note)}
        className={`relative flex items-center gap-4 p-4 rounded-2xl border ${c.bg} ${c.border} backdrop-blur-sm cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.01]`}>
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${c.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{note.title}</p>
          <p className="text-sm text-white/50 truncate">{note.body}</p>
        </div>
        <div className="flex gap-1 items-center">
          {note.pinned && <span className="text-amber-400 text-xs">pin</span>}
          <span className="text-xs text-white/30">{fmtDate(note.updatedAt)}</span>
        </div>
        {hovered && (
          <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
            <ActionBtn onClick={() => onPin(note)} title={note.pinned ? "Unpin" : "Pin"}>pin</ActionBtn>
            <ActionBtn onClick={() => onEdit(note)}>edit</ActionBtn>
            <ActionBtn onClick={() => onDelete(note._id)} danger>del</ActionBtn>
          </div>
        )}
      </div>
    );
  }

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(note)}
      className={`relative p-5 rounded-2xl border ${c.bg} ${c.border} backdrop-blur-sm cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1`}>
      {note.pinned && <span className="absolute top-3 right-3 text-amber-400 text-xs">pinned</span>}
      <h3 className="font-bold text-white text-lg mb-2 pr-6 leading-tight line-clamp-1">{note.title}</h3>
      <p className="text-sm text-white/60 line-clamp-3 mb-4 leading-relaxed">{note.body}</p>
      <div className="flex flex-wrap gap-1 mb-3">
        {note.tags?.map((t) => <Tag key={t} label={t} />)}
      </div>
      <p className="text-xs text-white/30">{fmtDate(note.updatedAt)}</p>
      {hovered && (
        <div className="absolute bottom-3 right-3 flex gap-1" onClick={(e) => e.stopPropagation()}>
          <ActionBtn onClick={() => onPin(note)}>pin</ActionBtn>
          <ActionBtn onClick={() => onEdit(note)}>edit</ActionBtn>
          <ActionBtn onClick={() => onDelete(note._id)} danger>del</ActionBtn>
        </div>
      )}
    </div>
  );
}

function NoteModal({ note, onClose, onSave, loading }) {
  const isView = !!note?._id && !note?._editing;
  const [viewOnly, setViewOnly] = useState(isView);
  const [title, setTitle] = useState(note?.title || "");
  const [body, setBody] = useState(note?.body || "");
  const [color, setColor] = useState(note?.color || "violet");
  const [pinned, setPinned] = useState(note?.pinned || false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState(note?.tags || []);

  const addTag = (e) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().replace(",", "");
      if (!tags.includes(t)) setTags([...tags, t]);
      setTagInput("");
    }
  };

  const c = COLORS.find((x) => x.id === color) || COLORS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className={`relative w-full max-w-lg rounded-3xl border ${c.border} ${c.bg} backdrop-blur-xl shadow-2xl p-6 z-10`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">
            {viewOnly ? "Note" : note?._id ? "Edit Note" : "New Note"}
          </h2>
          <div className="flex gap-2">
            {viewOnly && (
              <button onClick={() => setViewOnly(false)}
                className="px-3 py-1 rounded-lg bg-white/10 text-white/70 text-sm hover:bg-white/20 transition-colors">
                Edit
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 text-white/60 hover:bg-white/20 transition-colors flex items-center justify-center">X</button>
          </div>
        </div>

        {viewOnly ? (
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-white">{note.title}</h3>
            <p className="text-white/70 whitespace-pre-wrap leading-relaxed">{note.body}</p>
            <div className="flex flex-wrap gap-1">{note.tags?.map((t) => <Tag key={t} label={t} />)}</div>
            <p className="text-xs text-white/30">Updated {fmtDate(note.updatedAt)}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-lg font-semibold focus:outline-none focus:border-white/30 transition-colors" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your note..." rows={6}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/80 placeholder-white/30 text-sm resize-none focus:outline-none focus:border-white/30 transition-colors leading-relaxed" />
            <div className="flex flex-wrap gap-1 min-h-7">
              {tags.map((t) => <Tag key={t} label={t} onRemove={() => setTags(tags.filter((x) => x !== t))} />)}
            </div>
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={addTag}
              placeholder="Add tag + Enter"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors" />
            <div className="flex items-center justify-between">
              <ColorPicker value={color} onChange={setColor} />
              <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer select-none">
                <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="accent-amber-400" />
                Pin note
              </label>
            </div>
            <button onClick={() => onSave({ title, body, color, pinned, tags })} disabled={!title.trim() || loading}
              className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-200
                ${title.trim() && !loading ? "bg-violet-500 hover:bg-violet-400 hover:scale-[1.02]" : "bg-white/10 opacity-40 cursor-not-allowed"}`}>
              {loading ? "Saving..." : note?._id ? "Save Changes" : "Create Note"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AuthScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState("login");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/signup";
      const body = mode === "login" ? { email, password } : { name, email, password };
      const data = await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
      onLogin(data.user, data.token);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#070711] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-cyan-500/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/20 border border-violet-500/30 mb-4 text-3xl">N</div>
          <h1 className="text-4xl font-black text-white tracking-tight">NoteVault</h1>
          <p className="text-white/40 mt-1 text-sm">Your thoughts, organized.</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6">
            {["login", "signup"].map((m) => (
              <button key={m} onClick={() => { setMode(m); setErr(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize
                  ${mode === m ? "bg-violet-500/50 text-white shadow" : "text-white/40 hover:text-white/70"}`}>
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {mode === "signup" && (
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-400/50 transition-colors" />
            )}
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-400/50 transition-colors" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password"
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-400/50 transition-colors" />
          </div>
          {err && <p className="mt-3 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{err}</p>}
          <button onClick={submit} disabled={loading}
            className="mt-5 w-full py-3 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-bold text-sm transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NoteVault() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("nv_user") || "null"));
  const [token, setToken] = useState(() => localStorage.getItem("nv_token") || null);
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({ type: "all" });
  const [view, setView] = useState("grid");
  const [modal, setModal] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const uid = () => Math.random().toString(36).slice(2, 9);

  const toast = (msg, type = "info") => {
    const id = uid();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  };

  const login = (u, t) => {
    setUser(u); setToken(t);
    localStorage.setItem("nv_user", JSON.stringify(u));
    localStorage.setItem("nv_token", t);
    toast(`Welcome, ${u.name}!`);
  };

  const logout = () => {
    setUser(null); setToken(null); setNotes([]);
    localStorage.removeItem("nv_user");
    localStorage.removeItem("nv_token");
  };

  const fetchNotes = useCallback(async () => {
    if (!token) return;
    setLoadingNotes(true);
    try {
      const data = await apiFetch("/notes", {}, token);
      setNotes(data);
    } catch (e) { toast(e.message, "error"); }
    setLoadingNotes(false);
  }, [token]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const saveNote = async (fields) => {
    setSavingNote(true);
    try {
      if (modal?._id) {
        const updated = await apiFetch(`/notes/${modal._id}`, { method: "PUT", body: JSON.stringify(fields) }, token);
        setNotes((prev) => prev.map((n) => n._id === updated._id ? updated : n));
        toast("Note updated");
      } else {
        const created = await apiFetch("/notes", { method: "POST", body: JSON.stringify(fields) }, token);
        setNotes((prev) => [created, ...prev]);
        toast("Note created");
      }
      setModal(null);
    } catch (e) { toast(e.message, "error"); }
    setSavingNote(false);
  };

  const deleteNote = async (id) => {
    try {
      await apiFetch(`/notes/${id}`, { method: "DELETE" }, token);
      setNotes((prev) => prev.filter((n) => n._id !== id));
      toast("Note deleted");
    } catch (e) { toast(e.message, "error"); }
  };

  const pinNote = async (note) => {
    try {
      const updated = await apiFetch(`/notes/${note._id}`, { method: "PUT", body: JSON.stringify({ pinned: !note.pinned }) }, token);
      setNotes((prev) => prev.map((n) => n._id === updated._id ? updated : n));
    } catch (e) { toast(e.message, "error"); }
  };

  const getAISummary = async () => {
    if (!notes.length) return;
    setAiLoading(true); setAiSummary("");
    try {
      const data = await apiFetch("/ai/summary", {
        method: "POST",
        body: JSON.stringify({ notes })
      }, token);
      setAiSummary(data.summary);
    } catch {
      setAiSummary("AI summary unavailable.");
    }
    setAiLoading(false);
  };
  const allTags = [...new Set(notes.flatMap((n) => n.tags || []))];
  const allColors = [...new Set(notes.map((n) => n.color))];

  const filtered = notes.filter((n) => {
    const q = search.toLowerCase();
    const matchSearch = !q || n.title?.toLowerCase().includes(q) || n.body?.toLowerCase().includes(q) || n.tags?.some((t) => t.includes(q));
    let matchFilter = true;
    if (filter.type === "pinned") matchFilter = n.pinned;
    else if (filter.type === "color") matchFilter = n.color === filter.value;
    else if (filter.type === "tag") matchFilter = n.tags?.includes(filter.value);
    return matchSearch && matchFilter;
  });

  const pinned = filtered.filter((n) => n.pinned);
  const unpinned = filtered.filter((n) => !n.pinned);
  const thisWeek = notes.filter((n) => Date.now() - new Date(n.createdAt) < 7 * 86400000).length;

  if (!user) return <AuthScreen onLogin={login} />;

  return (
    <div className="min-h-screen bg-[#070711] text-white flex overflow-hidden relative">
      <div className="fixed top-0 left-0 w-[800px] h-[800px] bg-violet-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-cyan-500/8 rounded-full blur-[130px] pointer-events-none" />

      <aside className={`relative z-20 flex-shrink-0 transition-all duration-300 ${sidebarOpen ? "w-60" : "w-0 overflow-hidden"}`}>
        <div className="h-full w-60 bg-white/[0.03] border-r border-white/5 flex flex-col py-6 px-4">
          <div className="flex items-center gap-2 px-2 mb-8">
            <span className="text-lg font-black tracking-tight">NoteVault</span>
          </div>
          <button onClick={() => setModal({})}
            className="flex items-center gap-2 w-full px-4 py-2.5 mb-6 rounded-xl bg-violet-500/30 border border-violet-500/40 hover:bg-violet-500/50 text-white font-semibold text-sm transition-all duration-200 hover:scale-[1.02]">
            + New Note
          </button>
          <div className="space-y-1 mb-6">
            {[
              { label: "All Notes", f: { type: "all" } },
              { label: "Pinned", f: { type: "pinned" } },
            ].map((item) => (
              <button key={item.label} onClick={() => setFilter(item.f)}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm transition-all duration-150
                  ${filter.type === item.f.type && !filter.value ? "bg-white/10 text-white font-medium" : "text-white/50 hover:bg-white/5 hover:text-white/80"}`}>
                {item.label}
              </button>
            ))}
          </div>
          {allColors.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-white/30 uppercase tracking-widest px-3 mb-2">Colors</p>
              {allColors.map((cid) => {
                const c = COLORS.find((x) => x.id === cid);
                return (
                  <button key={cid} onClick={() => setFilter({ type: "color", value: cid })}
                    className={`flex items-center gap-3 w-full px-3 py-1.5 rounded-xl text-sm capitalize transition-all duration-150
                      ${filter.type === "color" && filter.value === cid ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/80"}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${c?.dot}`} />{cid}
                  </button>
                );
              })}
            </div>
          )}
          {allTags.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-white/30 uppercase tracking-widest px-3 mb-2">Tags</p>
              {allTags.map((t) => (
                <button key={t} onClick={() => setFilter({ type: "tag", value: t })}
                  className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-xl text-sm transition-all duration-150
                    ${filter.type === "tag" && filter.value === t ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/80"}`}>
                  #{t}
                </button>
              ))}
            </div>
          )}
          <div className="mt-auto">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
              <div className="w-8 h-8 rounded-full bg-violet-500/40 flex items-center justify-center text-sm font-bold">
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-white/30 truncate">{user.email}</p>
              </div>
              <button onClick={logout} title="Sign out" className="text-white/30 hover:text-rose-400 text-sm transition-colors">out</button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex-shrink-0 flex items-center gap-4 px-6 py-4 border-b border-white/5 backdrop-blur-sm bg-white/[0.02]">
          <button onClick={() => setSidebarOpen((v) => !v)}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all">
            =
          </button>
          <div className="flex-1 relative">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..."
              className="w-full max-w-md bg-white/5 border border-white/10 rounded-xl pl-4 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors" />
          </div>
          <div className="flex items-center gap-2">
            {["grid", "list"].map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all duration-150
                  ${view === v ? "bg-white/15 text-white" : "text-white/30 hover:bg-white/5 hover:text-white/60"}`}>
                {v}
              </button>
            ))}
            <button onClick={() => setModal({})}
              className="ml-2 px-4 py-2 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-semibold transition-all duration-200 hover:scale-[1.02]">
              + New
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Notes", value: notes.length, color: "bg-violet-500/20 border-violet-500/30" },
              { label: "Pinned", value: notes.filter((n) => n.pinned).length, color: "bg-amber-500/20 border-amber-500/30" },
              { label: "This Week", value: thisWeek, color: "bg-cyan-500/20 border-cyan-500/30" },
              { label: "Tags", value: allTags.length, color: "bg-emerald-500/20 border-emerald-500/30" },
            ].map((s) => (
              <div key={s.label} className={`p-4 rounded-2xl border ${s.color} backdrop-blur-sm`}>
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-violet-300 uppercase tracking-widest">AI Focus Summary</p>
              <button onClick={getAISummary} disabled={aiLoading}
                className="text-xs text-violet-400 hover:text-violet-200 transition-colors disabled:opacity-40">
                {aiLoading ? "..." : "Refresh"}
              </button>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              {aiLoading ? "Thinking..." : aiSummary || "Click refresh to generate an AI summary of your notes."}
            </p>
          </div>

          {filter.type !== "all" && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-white/40">Filtering by:</span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-xs text-violet-300 font-medium">
                {filter.type}: {filter.value || filter.type}
                <button onClick={() => setFilter({ type: "all" })} className="ml-1 hover:text-rose-400 transition-colors">x</button>
              </span>
            </div>
          )}

          {loadingNotes ? (
            <div className="flex items-center justify-center py-24 text-white/30 text-sm">Loading notes...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-white/40 text-lg font-medium">No notes found</p>
              <p className="text-white/25 text-sm mt-1">Try a different search or create a new note</p>
            </div>
          ) : (
            <div className="space-y-6">
              {pinned.length > 0 && (
                <section>
                  <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Pinned</p>
                  <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" : "space-y-2"}>
                    {pinned.map((n) => (
                      <NoteCard key={n._id} note={n} view={view}
                        onEdit={(note) => setModal({ ...note, _editing: true })}
                        onDelete={deleteNote} onPin={pinNote}
                        onOpen={(note) => setModal(note)} />
                    ))}
                  </div>
                </section>
              )}
              {unpinned.length > 0 && (
                <section>
                  {pinned.length > 0 && <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Notes</p>}
                  <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" : "space-y-2"}>
                    {unpinned.map((n) => (
                      <NoteCard key={n._id} note={n} view={view}
                        onEdit={(note) => setModal({ ...note, _editing: true })}
                        onDelete={deleteNote} onPin={pinNote}
                        onOpen={(note) => setModal(note)} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>

      {modal !== null && (
        <NoteModal
          note={modal?._id ? modal : null}
          onClose={() => setModal(null)}
          onSave={saveNote}
          loading={savingNote} />
      )}

      <Toast toasts={toasts} />
    </div>
  );
}
