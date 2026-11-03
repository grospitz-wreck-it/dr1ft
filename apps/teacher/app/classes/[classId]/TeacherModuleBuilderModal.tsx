"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, GripVertical, ImagePlus, Link2, Plus, Save, Type, X } from "lucide-react";
import { saveTeacherCreatedModule } from "./teacherModuleActions";

type DraftPost = {
  id: string;
  postType: "text" | "image" | "embed" | "mixed";
  title: string;
  body: string;
  embedUrl: string;
  imageFile: File | null;
};

export function TeacherModuleBuilderModal({ classInstanceId, schoolId }: { classInstanceId: string; schoolId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [posts, setPosts] = useState<DraftPost[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const selected = posts.find((post) => post.id === selectedId) ?? null;

  function reset() {
    setTitle(""); setDescription(""); setPosts([]); setSelectedId(null); setError("");
  }
  function addPost(type: DraftPost["postType"]) {
    const post: DraftPost = { id: crypto.randomUUID(), postType: type, title: "", body: "", embedUrl: "", imageFile: null };
    setPosts((items) => [...items, post]);
    setSelectedId(post.id);
  }
  function updatePost(id: string, patch: Partial<DraftPost>) {
    setPosts((items) => items.map((post) => post.id === id ? { ...post, ...patch } : post));
  }
  function movePost(id: string, targetId: string) {
    if (id === targetId) return;
    setPosts((items) => {
      const from = items.findIndex((post) => post.id === id);
      const to = items.findIndex((post) => post.id === targetId);
      if (from < 0 || to < 0) return items;
      const next = [...items];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }
  function moveBy(index: number, delta: number) {
    setPosts((items) => {
      const target = index + delta;
      if (target < 0 || target >= items.length) return items;
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function publish() {
    setError("");
    if (!title.trim()) { setError("Bitte gib deinem Modul einen Titel."); return; }
    if (!posts.length) { setError("Füge mindestens einen Beitrag hinzu."); return; }
    if (posts.some((post) => !post.title.trim() && !post.body.trim() && !post.imageFile && !post.embedUrl.trim())) {
      setError("Jeder Beitrag benötigt mindestens einen Inhalt.");
      return;
    }
    const form = new FormData();
    form.set("classInstanceId", classInstanceId);
    form.set("schoolId", schoolId);
    form.set("title", title);
    form.set("description", description);
    form.set("posts", JSON.stringify(posts.map((post, index) => ({
      id: post.id, postType: post.postType, title: post.title, body: post.body,
      embedUrl: post.embedUrl, sortOrder: index, imageField: post.imageFile ? "image_" + post.id : undefined,
    }))));
    posts.forEach((post) => { if (post.imageFile) form.set("image_" + post.id, post.imageFile); });
    startTransition(async () => {
      try {
        await saveTeacherCreatedModule(form);
        setOpen(false);
        reset();
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Das Modul konnte nicht veröffentlicht werden.");
      }
    });
  }

  const thumbnails = useMemo(() => posts.map((post, index) => ({ ...post, index })), [posts]);

  return (
    <>
      <button type="button" onClick={() => { reset(); setOpen(true); }} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50">
        <Plus className="h-4 w-4" /> Eigenes Modul erstellen
      </button>
      {open && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="teacher-module-title">
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-7">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-600">DR1FT · EIGENES MODUL</p>
                <h2 id="teacher-module-title" className="mt-1 text-xl font-bold text-slate-950">Modul erstellen</h2>
                <p className="mt-1 text-sm text-slate-500">Nur für diese Schule und die ausgewählte Klasseninstanz.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Schließen" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,1.05fr)]">
                <section className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">Modultitel
                    <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="z. B. KI im Alltag" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
                  </label>
                  <label className="block text-xs font-semibold text-slate-700">Kurzbeschreibung
                    <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={500} placeholder="Worum geht es in diesem Modul?" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
                  </label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div><h3 className="text-sm font-bold text-slate-900">Beiträge</h3><p className="text-[11px] text-slate-500">Thumbnails ziehen, um die Reihenfolge zu ändern.</p></div>
                      <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold text-violet-700">{posts.length} / 40</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {thumbnails.map((post) => (
                        <div key={post.id} draggable onDragStart={() => setDragId(post.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragId) movePost(dragId, post.id); setDragId(null); }} onDragEnd={() => setDragId(null)}
                          className={"group relative cursor-grab overflow-hidden rounded-xl border bg-white text-left transition active:cursor-grabbing " + (selectedId === post.id ? "border-violet-500 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-300")}>
                          <button type="button" onClick={() => setSelectedId(post.id)} className="block w-full text-left">
                            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-violet-100 to-cyan-100">
                              {post.imageFile ? <img src={URL.createObjectURL(post.imageFile)} alt="" className="h-full w-full object-cover" /> : post.postType === "embed" ? <Link2 className="h-7 w-7 text-violet-500" /> : post.postType === "text" ? <Type className="h-7 w-7 text-violet-500" /> : <ImagePlus className="h-7 w-7 text-violet-500" />}
                            </div>
                            <div className="truncate px-2 py-1.5 text-[10px] font-semibold text-slate-700">{String(post.index + 1).padStart(2,"0")} · {post.title || (post.postType === "embed" ? "Embed" : post.postType === "image" ? "Bild" : "Text")}</div>
                          </button>
                          <span className="absolute right-1 top-1 rounded-md bg-white/90 p-1 text-slate-500 shadow-sm"><GripVertical className="h-3 w-3" /></span>
                          <div className="flex justify-between border-t border-slate-100 px-1">
                            <button type="button" aria-label="Nach oben" onClick={() => moveBy(post.index, -1)} disabled={post.index === 0} className="p-1 text-slate-500 disabled:opacity-20"><ArrowUp className="h-3 w-3" /></button>
                            <button type="button" aria-label="Nach unten" onClick={() => moveBy(post.index, 1)} disabled={post.index === posts.length - 1} className="p-1 text-slate-500 disabled:opacity-20"><ArrowDown className="h-3 w-3" /></button>
                          </div>
                        </div>
                      ))}
                      {posts.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-violet-200 bg-white px-3 py-8 text-center text-xs text-slate-500">Noch keine Beiträge. Füge unten deinen ersten Post hinzu.</div>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" disabled={posts.length >= 40} onClick={() => addPost("text")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-violet-300"><Type className="h-3.5 w-3.5" /> Text</button>
                      <button type="button" disabled={posts.length >= 40} onClick={() => addPost("image")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-violet-300"><ImagePlus className="h-3.5 w-3.5" /> Bild</button>
                      <button type="button" disabled={posts.length >= 40} onClick={() => addPost("embed")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-violet-300"><Link2 className="h-3.5 w-3.5" /> Embed</button>
                    </div>
                  </div>
                </section>
                <section className="min-w-0 rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900">Beitrag bearbeiten</h3>{selected && <button type="button" onClick={() => { setPosts((items) => items.filter((item) => item.id !== selected.id)); setSelectedId(null); }} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Beitrag entfernen</button>}</div>
                  {selected ? (
                    <div className="mt-3 space-y-3">
                      <label className="block text-xs font-semibold text-slate-700">Überschrift
                        <input value={selected.title} onChange={(event) => updatePost(selected.id, { title: event.target.value })} maxLength={180} placeholder="Optionaler Titel" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      </label>
                      <label className="block text-xs font-semibold text-slate-700">Text
                        <textarea value={selected.body} onChange={(event) => updatePost(selected.id, { body: event.target.value })} rows={6} maxLength={12000} placeholder="Schreibe deinen Beitrag …" className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      </label>
                      {(selected.postType === "image" || selected.postType === "mixed") && <label className="block text-xs font-semibold text-slate-700">Bild hochladen<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => updatePost(selected.id, { imageFile: event.target.files?.[0] ?? null })} className="mt-1.5 block w-full text-xs text-slate-600" /></label>}
                      {(selected.postType === "embed" || selected.postType === "mixed") && <label className="block text-xs font-semibold text-slate-700">YouTube- oder Vimeo-URL<input value={selected.embedUrl} onChange={(event) => updatePost(selected.id, { embedUrl: event.target.value })} placeholder="https://…" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>}
                      <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vorschau</p><h4 className="mt-2 text-sm font-bold text-slate-900">{selected.title || "Dein Beitrag"}</h4><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{selected.body || "Dein Text erscheint hier in der Vorschau."}</p>{selected.embedUrl && <p className="mt-2 truncate text-xs text-violet-600">{selected.embedUrl}</p>}{selected.imageFile && <p className="mt-2 text-xs text-slate-500">Bild: {selected.imageFile.name}</p>}</div>
                    </div>
                  ) : <div className="flex min-h-64 items-center justify-center text-center text-xs text-slate-500">Wähle ein Thumbnail aus oder erstelle einen neuen Beitrag.</div>}
                </section>
              </div>
              {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>}
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 sm:px-7">
              <p className="text-[11px] text-slate-500">Veröffentlichung nur für diese Klasseninstanz.</p>
              <div className="flex gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Abbrechen</button><button type="button" onClick={publish} disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">{pending ? "Veröffentlicht …" : <><Save className="h-4 w-4" /> Veröffentlichen</>}</button></div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
