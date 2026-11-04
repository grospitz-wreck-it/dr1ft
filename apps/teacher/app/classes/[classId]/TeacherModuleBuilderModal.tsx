"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, GripVertical, ImagePlus, Link2, Plus, Save, Type, X, Wand2, RotateCcw, SlidersHorizontal, BarChart3, CircleCheck, Copy, Play, Monitor, Smartphone } from "lucide-react";
import { getTeacherModuleFreeTextResponses, getTeacherModulePollResults, saveTeacherCreatedModule, updateTeacherCreatedModule } from "./teacherModuleActions";

type DraftPost = {
  id: string;
  postType: "text" | "image" | "embed" | "mixed" | "poll" | "true_false";
  title: string;
  body: string;
  embedUrl: string;
  interactionData: { options: string[]; responseMode?: "single" | "multiple" | "free_text"; resultDisplay?: "bar" | "pie"; correctAnswer?: "true" | "false"; explanation?: string };
  imageFile: File | null;
  existingImageUrl?: string | null;
  imageSettings: { brightness: number; contrast: number; saturation: number; grayscale: number; zoom: number; x: number; y: number };
};

type EditableModule = { id: string; title: string; description: string; introTitle?: string | null; introText?: string | null; visibilityScope?: "private" | "school" | "class"; titleCardEnabled?: boolean; posts: Array<{ id: string; postType: DraftPost["postType"]; title: string; body: string; embedUrl: string; imageUrl: string | null; interactionData?: DraftPost["interactionData"] }> };

export function TeacherModuleBuilderModal({ classInstanceId, schoolId, editModule, triggerLabel = "Eigenes Modul erstellen", autoOpen = false }: { classInstanceId: string; schoolId: string; editModule?: EditableModule; triggerLabel?: string; autoOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [titleCardEnabled, setTitleCardEnabled] = useState(true);
  const [visibilityScope, setVisibilityScope] = useState<"private" | "school" | "class">("class");
  const [posts, setPosts] = useState<DraftPost[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("desktop");
  const [dragId, setDragId] = useState<string | null>(null);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [error, setError] = useState("");
  const [textResponses, setTextResponses] = useState<Array<{student:string;answer:string;submittedAt:string}>>([]);
  const [responsesOpen, setResponsesOpen] = useState(false);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [pollResults, setPollResults] = useState<{title:string;total:number;counts:Array<{label:string;count:number}>;resultDisplay:"bar"|"pie"}|null>(null);
  const [pollResultsLoading, setPollResultsLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const selected = posts.find((post) => post.id === selectedId) ?? null;
  function getEmbedPreviewUrl(raw: string) {
    try {
      const url = new URL(raw);
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      if (["youtube.com", "m.youtube.com", "youtu.be"].includes(host)) {
        const id = host === "youtu.be" ? url.pathname.split("/").filter(Boolean)[0] : url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop();
        return id && /^[a-zA-Z0-9_-]{6,20}$/.test(id) ? "https://www.youtube-nocookie.com/embed/" + id : null;
      }
      if (host === "vimeo.com" || host === "player.vimeo.com") {
        const id = url.pathname.split("/").filter(Boolean).pop();
        return id && /^\d+$/.test(id) ? "https://player.vimeo.com/video/" + id : null;
      }
    } catch {}
    return null;
  }
  function reset() {
    setModuleId(null);
    setTitle(""); setDescription(""); setTitleCardEnabled(true); setVisibilityScope("class");
    setPosts([]); setSelectedId(null); setPreviewMode(false); setPreviewDevice("desktop"); setError(""); setImageEditorOpen(false); setTextResponses([]); setResponsesOpen(false); setPollResults(null);
  }
  function openEditor() {
    setError("");
    setPreviewMode(false);
    setPreviewDevice("desktop");
    setImageEditorOpen(false);
    if (editModule) {
      setModuleId(editModule.id);
      setTitle(editModule.title);
      setDescription(editModule.description);
      setTitleCardEnabled(editModule.titleCardEnabled ?? true);
      setVisibilityScope(editModule.visibilityScope ?? "class");
      const loadedPosts: DraftPost[] = editModule.posts.map((post) => ({
        id: post.id,
        postType: post.postType,
        title: post.title ?? "",
        body: post.body ?? "",
        embedUrl: post.embedUrl ?? "",
        interactionData: post.interactionData ?? { options: ["Antwort 1", "Antwort 2"], responseMode: "single" },
        imageFile: null,
        existingImageUrl: post.imageUrl,
        imageSettings: { brightness: 100, contrast: 100, saturation: 100, grayscale: 0, zoom: 1, x: 50, y: 50 },
      }));
      setPosts(loadedPosts);
      setSelectedId(null);
    } else {
      reset();
    }
    setOpen(true);
  }
  useEffect(() => {
    if (autoOpen && editModule) openEditor();
  }, [autoOpen, editModule]);

  function addPost(type: "mixed" | "poll") {
    const post: DraftPost = { id: crypto.randomUUID(), postType: type, title: "", body: "", embedUrl: "", interactionData: { options: ["Antwort 1", "Antwort 2"], responseMode: "single", correctAnswer: "true", explanation: "" }, imageFile: null, imageSettings: { brightness: 100, contrast: 100, saturation: 100, grayscale: 0, zoom: 1, x: 50, y: 50 } };
    setPosts((items) => [...items, post]);
    setSelectedId(post.id);
  }
  async function loadTextResponses(postId: string) {
    if (!moduleId) return;
    setResponsesLoading(true);
    setError("");
    try {
      const rows = await getTeacherModuleFreeTextResponses(classInstanceId, moduleId, postId);
      setTextResponses(rows);
      setResponsesOpen(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Antworten konnten nicht geladen werden.");
    } finally {
      setResponsesLoading(false);
    }
  }
  async function loadPollResults(postId: string) {
    if (!moduleId) return;
    setPollResultsLoading(true); setError("");
    try { setPollResults(await getTeacherModulePollResults(classInstanceId,moduleId,postId)); }
    catch(cause) { setError(cause instanceof Error?cause.message:"Umfrageergebnisse konnten nicht geladen werden."); }
    finally { setPollResultsLoading(false); }
  }
  function updatePost(id: string, patch: Partial<DraftPost>) {
    setPosts((items) => items.map((post) => post.id === id ? { ...post, ...patch } : post));
  }
  function duplicatePost(post: DraftPost) {
    const copy = { ...post, id: crypto.randomUUID(), imageFile: post.imageFile, imageSettings: { ...post.imageSettings }, interactionData: { ...post.interactionData, options: [...post.interactionData.options] } };
    setPosts(items => { const index = items.findIndex(item => item.id === post.id); const next = [...items]; next.splice(index + 1, 0, copy); return next; });
    setSelectedId(copy.id);
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
  async function processEditedImage(file: File, settings: DraftPost["imageSettings"]) {
    const source = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = source;
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Bild konnte nicht geladen werden.")); });
      const maxDimension = 1920;
      const resizeFactor = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * resizeFactor));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * resizeFactor));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Bildbearbeitung wird in diesem Browser nicht unterstützt.");
      context.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) grayscale(${settings.grayscale}%)`;
      const width = canvas.width / settings.zoom, height = canvas.height / settings.zoom;
      const sx = (canvas.width - width) * settings.x / 100, sy = (canvas.height - height) * settings.y / 100;
      context.drawImage(image, sx * resizeFactor, sy * resizeFactor, width * resizeFactor, height * resizeFactor, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Bearbeitetes Bild konnte nicht exportiert werden.")), "image/webp", 0.82));
      if (blob.type !== "image/webp") throw new Error("Dieser Browser unterstützt keine WebP-Konvertierung.");
      return new File([blob], file.name.replace(/\\.[^.]+$/, "") + "-dr1ft.webp", { type: "image/webp" });
    } finally { URL.revokeObjectURL(source); }
  }

  async function publish() {
    setError("");
    if (!title.trim()) { setError("Bitte gib deinem Modul einen Titel."); return; }
    if (!posts.length) { setError("Füge mindestens einen Beitrag hinzu."); return; }
    if (posts.some((post) => !post.title.trim() && !post.body.trim() && !post.imageFile && !post.embedUrl.trim())) {
      setError("Jeder Beitrag benötigt mindestens einen Inhalt.");
      return;
    }
    let editedFiles: (readonly [string, File] | null)[];
    try { editedFiles = await Promise.all(posts.map(async post => post.imageFile ? [post.id, await processEditedImage(post.imageFile, post.imageSettings)] as const : null)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Bildbearbeitung fehlgeschlagen."); return; }
    const imageFiles = new Map(editedFiles.filter((item): item is readonly [string, File] => item !== null));
    const form = new FormData();
    form.set("classInstanceId", classInstanceId);
    form.set("schoolId", schoolId);
    form.set("title", title);
    form.set("description", description);
    form.set("titleCardEnabled", String(titleCardEnabled));
    form.set("visibilityScope", visibilityScope);
    form.set("posts", JSON.stringify(posts.map((post, index) => ({
      id: post.id, postType: post.postType, title: post.title, body: post.body,
      embedUrl: post.embedUrl, interactionData: post.interactionData, sortOrder: index, imageField: imageFiles.has(post.id) ? "image_" + post.id : undefined,
    }))));
    posts.forEach((post) => { const file = imageFiles.get(post.id); if (file) form.set("image_" + post.id, file); });
    startTransition(async () => {
      try {
        if (moduleId) form.set("moduleId", moduleId);
        if (moduleId) await updateTeacherCreatedModule(form); else await saveTeacherCreatedModule(form);
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
      <button type="button" onClick={openEditor} className={editModule ? "inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-medium text-violet-700 transition hover:bg-violet-50" : "inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50"}>
        {!editModule && <Plus className="mr-2 h-4 w-4" />} {triggerLabel}
      </button>
      {open && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="teacher-module-title">
          <div className="drift-builder-shell flex h-[calc(100dvh-44px)] w-full max-w-[1456px] flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_34px_110px_rgba(57,38,110,.30)]">
            <header className="drift-builder-header relative flex min-h-[130px] shrink-0 items-center justify-between gap-4 overflow-hidden border-b border-violet-100 px-6 py-4 sm:px-8">
              <div className="relative z-10 flex items-center gap-4">
                <div className="drift-builder-mark"><Wand2 className="h-6 w-6"/></div>
                <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.22em] text-violet-700">DR1FT · DEIN CONTENT-STUDIO</p>
                <h2 id="teacher-module-title" className="mt-1 text-[23px] font-extrabold tracking-tight text-slate-950">{moduleId ? "Modul bearbeiten" : "Modul erstellen"}</h2>
                <p className="mt-1 text-sm text-slate-500">Erstelle und strukturiere Inhalte für deine Klasse.</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Schließen" data-tooltip="Editor schließen" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </header>
            <div className="min-h-0 flex-1 overflow-hidden p-0">
              <div className="grid h-full min-h-0 gap-0 lg:grid-cols-[minmax(0,464px)_minmax(0,1fr)]">
                <section className="drift-builder-left flex min-h-0 flex-col gap-2 overflow-y-auto border-r border-violet-100 px-4 py-3 sm:px-5">
                  <div className="drift-builder-cover relative !h-[88px] !flex-none overflow-hidden rounded-[18px]">
                    {posts.find(post => post.imageFile || post.existingImageUrl) ? <img src={(() => { const p=posts.find(post => post.imageFile || post.existingImageUrl)!; return p.imageFile ? URL.createObjectURL(p.imageFile) : p.existingImageUrl!; })()} alt="" className="h-full w-full object-cover"/> : <div className="drift-builder-cover-art"><span className="drift-cover-orb drift-cover-orb-a"/><span className="drift-cover-orb drift-cover-orb-b"/><span className="drift-cover-stars">✦　✧　✦</span><span className="drift-cover-word">DR1FT</span><span className="drift-cover-caption">LEARN · CREATE · DISCOVER</span></div>}
                    <span className="absolute bottom-3 left-4 rounded-full border border-white/40 bg-slate-950/35 px-3 py-1 text-[9px] font-extrabold uppercase tracking-[.2em] text-white backdrop-blur">Dein Lernmodul</span>
                  </div>
                  <div className="drift-builder-details space-y-2 rounded-[18px] p-3">
                    <div className="flex items-center gap-2"><span className="drift-builder-step">01</span><h3 className="text-sm font-extrabold text-slate-900">Dein Modul</h3></div>
                    <label className="block text-xs font-bold text-slate-700">Modultitel
                      <input value={title} onChange={event=>setTitle(event.target.value)} maxLength={120} placeholder="z. B. Echt oder Fake?" className="drift-builder-input mt-1.5 w-full"/>
                    </label>
                    <label className="block text-xs font-bold text-slate-700">Kurzbeschreibung
                      <textarea value={description} onChange={event=>setDescription(event.target.value)} rows={2} maxLength={500} placeholder="Worum geht es in diesem Modul?" className="drift-builder-input mt-1.5 w-full resize-y"/>
                    </label>
                    <label className="block text-xs font-bold text-slate-700">Sichtbarkeit
                      <select value={visibilityScope} onChange={event=>setVisibilityScope(event.target.value as "private"|"school"|"class")} className="drift-builder-input mt-1.5 w-full">
                        <option value="private">Nur für mich</option><option value="school">Alle Lehrkräfte meiner Schule</option><option value="class">Nur diese Klasse</option>
                      </select>
                    </label>
                    <label className="drift-builder-toggle flex items-center justify-between gap-3 rounded-xl p-3">
                      <span><span className="block text-xs font-extrabold text-violet-950">Titelcard im Schüler-Feed</span><span className="mt-1 block text-[10px] text-violet-700">Titel und Beschreibung vor dem Start anzeigen</span></span>
                      <input type="checkbox" checked={titleCardEnabled} onChange={event=>setTitleCardEnabled(event.target.checked)} className="h-5 w-9 accent-violet-600"/>
                    </label>
                  </div>
                  <div className="drift-builder-add rounded-[18px] p-3">
                    <div className="mb-3 flex items-center gap-2"><span className="drift-builder-step">02</span><h3 className="text-sm font-extrabold text-slate-950">Inhalt hinzufügen</h3></div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button type="button" disabled={posts.length>=40} onClick={()=>addPost("mixed")} data-tooltip="Ein normaler Beitrag mit Text, Bildern, Videos und Links." className="drift-builder-add-tile !min-h-[58px]"><Type className="h-6 w-6"/><span>Post</span></button>
                      <button type="button" disabled={posts.length>=40} onClick={()=>addPost("poll")} data-tooltip="Eine Frage mit Auswahl, Mehrfachauswahl oder Freitext." className="drift-builder-add-tile !min-h-[58px]"><BarChart3 className="h-6 w-6"/><span>Umfrage</span></button>
                    </div>
                  </div>
                </section>
                {previewMode ? (
                  <section className="drift-builder-canvas flex min-h-0 min-w-0 flex-col overflow-y-auto px-5 py-5 sm:px-6 lg:min-h-0">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div><button type="button" onClick={()=>setPreviewMode(false)} className="text-xs font-bold text-violet-700">← Zurück zum Editor</button><h3 className="mt-2 text-xl font-extrabold text-slate-950">Schüler:innen-Vorschau</h3></div>
                      <div className="flex items-center gap-1 rounded-xl border border-violet-100 bg-white p-1">
                        <button type="button" onClick={()=>setPreviewDevice("mobile")} aria-label="Mobilansicht" className={"rounded-lg p-2 "+(previewDevice==="mobile"?"bg-violet-100 text-violet-700":"text-slate-500")}><Smartphone className="h-4 w-4"/></button>
                        <button type="button" onClick={()=>setPreviewDevice("desktop")} aria-label="Desktopansicht" className={"rounded-lg p-2 "+(previewDevice==="desktop"?"bg-violet-100 text-violet-700":"text-slate-500")}><Monitor className="h-4 w-4"/></button>
                      </div>
                    </div>
                    <div className={"mx-auto w-full space-y-4 "+(previewDevice==="mobile"?"max-w-[390px]":"max-w-[900px]")}>
                      {titleCardEnabled && <div className="drift-builder-preview rounded-[22px] p-5"><span className="drift-builder-type-badge">DEIN LERNMODUL</span><h2 className="mt-3 text-2xl font-extrabold text-slate-950">{title||"Dein Modultitel"}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{description||"Deine Modulbeschreibung erscheint hier."}</p></div>}
                      {posts.map((post,index)=><article key={post.id} className="overflow-hidden rounded-[22px] border border-violet-100 bg-white shadow-sm">
                        {(post.imageFile||post.existingImageUrl)&&<img src={post.imageFile?URL.createObjectURL(post.imageFile):post.existingImageUrl!} alt="" className="max-h-[280px] w-full object-cover"/>}
                        <div className="p-5"><span className="drift-builder-type-badge">{post.postType==="poll"?"UMFRAGE":"POST"}</span><h4 className="mt-3 text-lg font-extrabold text-slate-950">{post.title||"Dein Beitrag"}</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{post.body}</p>
                          {post.postType==="poll"&&<div className="mt-4 grid gap-2">{post.interactionData.options.map((option,i)=><div key={i} className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-800">{option||"Antwortmöglichkeit"}</div>)}</div>}
                          {post.postType==="true_false"&&<div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-sm font-bold text-emerald-800">Richtig</div><div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center text-sm font-bold text-rose-800">Falsch</div></div>}
                        </div>
                      </article>)}
                    </div>
                  </section>
                ) : (
                  <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
                                  <section className={"drift-builder-canvas flex min-h-0 min-w-0 flex-col overflow-y-auto px-5 py-5 sm:px-6 lg:min-h-0 transition-[width] duration-200 "+(selected?"w-[48%] flex-none max-[900px]:hidden":"w-full flex-1")}>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div><div className="flex items-center gap-2"><span className="drift-builder-step">03</span><h3 className="text-[21px] font-extrabold tracking-tight text-slate-950">Beiträge ({posts.length})</h3></div><p className="mt-1 text-xs text-slate-600">Ziehe die Karten per Drag & Drop in die gewünschte Reihenfolge.</p></div>
                    <div className="flex items-center gap-2"><span className="rounded-xl border border-violet-100 bg-white px-3 py-2 text-[10px] font-bold text-violet-700">{posts.length} / 40 Karten</span><button type="button" onClick={()=>setPreviewMode(true)} disabled={!posts.length} data-tooltip="So sehen Schüler:innen das Modul" className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs font-extrabold text-violet-700 disabled:opacity-40"><Play className="h-3.5 w-3.5"/> Vorschau</button></div>
                  </div>
                  <div className="space-y-3">
                    {thumbnails.map(post=><article key={post.id} draggable onDragStart={event=>{setDragId(post.id);event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",post.id);}} onDragOver={event=>{event.preventDefault();event.dataTransfer.dropEffect="move";}} onDrop={event=>{event.preventDefault();const source=event.dataTransfer.getData("text/plain")||dragId;if(source)movePost(source,post.id);setDragId(null);}} onDragEnd={()=>setDragId(null)} className="drift-builder-post-row group flex items-center gap-3 rounded-[20px] p-3">
                      <span className="grid h-10 w-6 shrink-0 place-items-center text-slate-500"><GripVertical className="h-5 w-5"/></span><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-100 bg-white text-sm font-extrabold text-slate-900">{post.index+1}</span>
                      <div className="drift-builder-post-thumb grid h-[64px] w-[108px] shrink-0 place-items-center overflow-hidden rounded-xl">{post.imageFile?<img src={URL.createObjectURL(post.imageFile)} alt="" className="h-full w-full object-cover"/>:post.existingImageUrl?<img src={post.existingImageUrl} alt="" className="h-full w-full object-cover"/>:post.postType==="poll"?<BarChart3 className="h-8 w-8 text-violet-600"/>:post.postType==="true_false"?<CircleCheck className="h-8 w-8 text-violet-600"/>:post.postType==="embed"?<Link2 className="h-8 w-8 text-violet-600"/>:<Type className="h-8 w-8 text-violet-600"/>}</div>
                      <div className="min-w-0 flex-1"><span className="drift-builder-type-badge">{post.postType==="poll"?"▥  Umfrage":"T  Post"}</span><h4 className="mt-2 truncate text-[15px] font-extrabold text-slate-950">{post.title||"Neuer Beitrag"}</h4><p className="mt-1 line-clamp-1 text-xs text-slate-600">{post.body||"Noch keine Beschreibung hinzugefügt."}</p></div>
                      <div className="flex shrink-0 items-center gap-1.5"><button type="button" onClick={()=>setSelectedId(post.id)} aria-label="Beitrag bearbeiten" data-tooltip="Beitrag bearbeiten" className="drift-builder-icon-btn !h-9 !w-9"><Wand2 className="h-4 w-4"/></button><button type="button" onClick={()=>duplicatePost(post)} aria-label="Beitrag duplizieren" data-tooltip="Beitrag duplizieren" className="drift-builder-icon-btn !h-9 !w-9"><Copy className="h-4 w-4"/></button><button type="button" onClick={()=>{setPosts(items=>items.filter(item=>item.id!==post.id));if(selectedId===post.id)setSelectedId(null);}} aria-label="Beitrag löschen" data-tooltip="Beitrag löschen" className="drift-builder-icon-btn drift-builder-delete !h-9 !w-9"><X className="h-4 w-4"/></button></div>
                    </article>)}
                    {!posts.length&&<div className="drift-builder-empty rounded-[20px] px-6 py-16 text-center"><div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-violet-100 text-violet-600"><Wand2 className="h-7 w-7"/></div><h4 className="text-sm font-extrabold text-slate-900">Dein Modul wartet auf Inhalte</h4><p className="mt-1 text-xs text-slate-500">Wähle links einen Kartentyp und leg los.</p></div>}
                  </div>
                </section>

                    {selected && (
                  <aside className="drift-builder-drawer relative z-10 flex w-[52%] max-w-[600px] min-w-0 shrink-0 flex-col overflow-y-auto border-l border-violet-200 bg-white/95 px-5 py-5 shadow-[-10px_0_28px_rgba(54,37,110,.07)] sm:px-6">
                    <div className="mb-3 flex items-center justify-between"><button type="button" onClick={()=>setSelectedId(null)} className="text-xs font-bold text-violet-700">← Übersicht</button><span className="text-[10px] font-bold uppercase tracking-widest text-violet-600">Beitrag bearbeiten</span></div>
                                      <div className="flex shrink-0 items-center justify-between gap-2"><div><p className="text-[9px] font-extrabold uppercase tracking-[.2em] text-violet-600">DEINE CONTENT-KARTE</p><h3 className="mt-1 text-sm font-extrabold text-slate-900">Beitrag gestalten</h3></div>{selected && <button type="button" onClick={() => { setPosts((items) => items.filter((item) => item.id !== selected.id)); setSelectedId(null); }} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Beitrag entfernen</button>}</div>
                  {selected ? (
                    <div className="mt-3 space-y-3">
                      <label className="block text-xs font-semibold text-slate-700">Überschrift
                        <input value={selected.title} onChange={(event) => updatePost(selected.id, { title: event.target.value })} maxLength={180} placeholder="Optionaler Titel" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      </label>
                      <label className="block text-xs font-semibold text-slate-700">Text
                        <textarea value={selected.body} onChange={(event) => updatePost(selected.id, { body: event.target.value })} rows={6} maxLength={12000} placeholder="Schreibe deinen Beitrag …" className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      </label>
                      {(selected.postType === "image" || selected.postType === "mixed" || selected.postType === "poll" || selected.postType === "true_false") && <>
                        <div className="space-y-2"><span className="block text-xs font-semibold text-slate-700">Bild oder Grafik</span><label htmlFor={"post-image-"+selected.id} className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-violet-300 bg-gradient-to-r from-violet-50/80 to-cyan-50/70 p-3 transition hover:border-violet-500 hover:from-violet-100 hover:to-cyan-100"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-violet-600 shadow-sm ring-1 ring-violet-100"><ImagePlus className="h-5 w-5"/></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800">{selected.imageFile?.name ?? (selected.existingImageUrl?"Bild ist hinterlegt":"Bild auswählen oder hier ablegen")}</span><span className="mt-0.5 block text-[10px] text-slate-500">JPG, PNG oder WebP · Bildvorschau inklusive</span></span><span className="shrink-0 rounded-lg border border-violet-200 bg-white px-3 py-2 text-[10px] font-bold text-violet-700 shadow-sm">Durchsuchen</span><input id={"post-image-"+selected.id} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { updatePost(selected.id, { imageFile: event.target.files?.[0] ?? null }); setImageEditorOpen(false); event.currentTarget.value=""; }} className="sr-only" /></label></div>
                        {(selected.imageFile || selected.existingImageUrl) && <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                          <div className="relative aspect-video overflow-hidden"><img src={selected.imageFile ? URL.createObjectURL(selected.imageFile) : selected.existingImageUrl!} alt="Bildvorschau" className="h-full w-full object-cover" style={{ objectPosition: selected.imageSettings.x + "% " + selected.imageSettings.y + "%", transform: "scale(" + selected.imageSettings.zoom + ")", filter: `brightness(${selected.imageSettings.brightness}%) contrast(${selected.imageSettings.contrast}%) saturate(${selected.imageSettings.saturation}%) grayscale(${selected.imageSettings.grayscale}%)` }} /></div>
                          <div className="flex items-center justify-between bg-slate-900 px-3 py-2"><span className="truncate text-[10px] text-white/70">{selected.imageFile?.name ?? "Vorhandenes Bild"}</span><button type="button" onClick={() => setImageEditorOpen(value => !value)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-2.5 py-1.5 text-[10px] font-bold text-white"><Wand2 className="h-3 w-3"/>Bild bearbeiten</button></div>
                          {imageEditorOpen && <div className="space-y-3 bg-white p-3">
                            <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-900"><SlidersHorizontal className="mr-1 inline h-3.5 w-3.5"/>Schnell bearbeiten</span><button type="button" onClick={() => updatePost(selected.id,{imageSettings:{brightness:100,contrast:100,saturation:100,grayscale:0,zoom:1,x:50,y:50}})} className="text-[10px] font-semibold text-slate-500"><RotateCcw className="mr-1 inline h-3 w-3"/>Zurücksetzen</button></div>
                            {([["brightness","Helligkeit",50,150],["contrast","Kontrast",50,150],["saturation","Sättigung",0,200],["grayscale","Schwarz-Weiß",0,100],["zoom","Zoom",1,2]] as const).map(([key,label,min,max])=><label key={key} className="block"><span className="mb-1 flex justify-between text-[10px] font-semibold text-slate-600"><span>{label}</span><span>{key==="zoom"?(selected.imageSettings.zoom*100).toFixed(0)+"%":selected.imageSettings[key]+"%"}</span></span><input type="range" min={min} max={max} step={key==="zoom"?0.01:1} value={selected.imageSettings[key]} onChange={event=>updatePost(selected.id,{imageSettings:{...selected.imageSettings,[key]:Number(event.target.value)}})} className="w-full accent-violet-600"/></label>)}
                            <div className="grid grid-cols-2 gap-3">{(["x","y"] as const).map(key=><label key={key} className="block text-[10px] font-semibold text-slate-600">{key==="x"?"Horizontal":"Vertikal"}<input type="range" min="0" max="100" value={selected.imageSettings[key]} onChange={event=>updatePost(selected.id,{imageSettings:{...selected.imageSettings,[key]:Number(event.target.value)}})} className="mt-1 w-full accent-violet-600"/></label>)}</div>
                            <p className="text-[10px] text-slate-500">Die Bearbeitung wird beim Veröffentlichen direkt in die Bilddatei übernommen.</p>
                          </div>}
                        </div>}
                      </>}
                      {selected.postType === "poll" && <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 space-y-3">
                        <div><p className="text-xs font-bold text-violet-900">Wie sollen Schüler antworten?</p><div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-white p-1">
                          {([{value:"single",label:"Auswahl"},{value:"multiple",label:"Mehrfach"},{value:"free_text",label:"Freitext"}] as const).map(mode=><button key={mode.value} type="button" onClick={()=>updatePost(selected.id,{interactionData:{...selected.interactionData,responseMode:mode.value}})} className={"rounded-lg px-2 py-2 text-[10px] font-bold "+((selected.interactionData.responseMode??"single")===mode.value?"bg-violet-600 text-white":"text-slate-600 hover:bg-violet-50")}>{mode.label}</button>)}
                        </div></div>
                        {(selected.interactionData.responseMode??"single")!=="free_text" ? <div className="space-y-2"><div className="flex items-center justify-between"><p className="text-xs font-bold text-violet-900">Antwortmöglichkeiten</p><button type="button" onClick={()=>updatePost(selected.id,{interactionData:{...selected.interactionData,options:[...selected.interactionData.options,""]}})} data-tooltip="Weitere Antwortmöglichkeit hinzufügen" className="grid h-8 w-8 place-items-center rounded-full border border-violet-200 bg-white text-violet-700 hover:bg-violet-100"><Plus className="h-4 w-4"/></button></div>
                          {selected.interactionData.options.map((option,index)=><div key={index} className="flex items-center gap-2"><input value={option} onChange={event=>updatePost(selected.id,{interactionData:{...selected.interactionData,options:selected.interactionData.options.map((value,i)=>i===index?event.target.value:value)}})} maxLength={100} placeholder={"Antwort "+(index+1)} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"/>{selected.interactionData.options.length>2&&<button type="button" onClick={()=>updatePost(selected.id,{interactionData:{...selected.interactionData,options:selected.interactionData.options.filter((_,i)=>i!==index)}})} aria-label="Antwort entfernen" data-tooltip="Antwort entfernen" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-rose-100 bg-white text-rose-600"><X className="h-4 w-4"/></button>}</div>)}
                        </div> : <div className="rounded-xl border border-dashed border-violet-300 bg-white p-3 text-xs leading-5 text-violet-800">Die vorgegebenen Antwortoptionen werden ausgeblendet. Schüler:innen formulieren stattdessen eine eigene Antwort.</div>}
                        {(selected.interactionData.responseMode??"single")!=="free_text" && <div className="rounded-xl border border-violet-100 bg-white p-3">
                          <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-slate-800">Ergebnisdiagramm</span><div className="flex rounded-lg bg-violet-50 p-1"><button type="button" onClick={()=>updatePost(selected.id,{interactionData:{...selected.interactionData,resultDisplay:"bar"}})} className={"rounded-md px-2.5 py-1.5 text-[10px] font-bold "+((selected.interactionData.resultDisplay??"bar")==="bar"?"bg-violet-600 text-white":"text-slate-600")}>Balken</button><button type="button" onClick={()=>updatePost(selected.id,{interactionData:{...selected.interactionData,resultDisplay:"pie"}})} className={"rounded-md px-2.5 py-1.5 text-[10px] font-bold "+(selected.interactionData.resultDisplay==="pie"?"bg-violet-600 text-white":"text-slate-600")}>Kreis</button></div></div>
                          <p className="mt-1 text-[10px] leading-4 text-slate-500">Legt fest, wie die Antworten in der Lehrkraft-Auswertung erscheinen.</p>
                          {moduleId && <button type="button" onClick={()=>loadPollResults(selected.id)} disabled={pollResultsLoading} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-bold text-violet-700 disabled:opacity-50">{pollResultsLoading?"Ergebnisse werden geladen …":"Ergebnisse ansehen"}</button>}
                          {pollResults && <div className="mt-3 border-t border-violet-100 pt-3">
                            <div className="mb-3 flex items-center justify-between"><span className="text-xs font-extrabold text-slate-900">Antworten: {pollResults.total}</span><span className="text-[10px] text-slate-500">{pollResults.resultDisplay==="pie"?"Anteil aller Nennungen":"Anteil der Teilnehmenden"}</span></div>
                            {((selected.interactionData.resultDisplay??"bar")==="bar") ? <div className="space-y-2">{pollResults.counts.map((item,index)=>{const pct=pollResults.total?Math.round(item.count/pollResults.total*100):0;return <div key={index}><div className="mb-1 flex justify-between gap-2 text-[10px]"><span className="truncate font-semibold text-slate-700">{item.label}</span><span className="shrink-0 font-bold tabular-nums text-slate-800">{item.count} · {pct}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-violet-50"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-500" style={{width:pct+"%"}}/></div></div>})}</div> : <div className="flex items-center gap-4"><div className="h-28 w-28 shrink-0 rounded-full" style={{background:(()=>{const sum=pollResults.counts.reduce((n,item)=>n+item.count,0);let cursor=0;const colors=["#7c3aed","#06b6d4","#ec4899","#f59e0b","#6366f1","#14b8a6","#f97316","#8b5cf6"];const parts=pollResults.counts.map((item,index)=>{const from=cursor;cursor+=sum?item.count/sum*100:0;return colors[index%colors.length]+" "+from+"% "+cursor+"%";});return "conic-gradient("+ (parts.length?parts.join(","):"#eee 0% 100%") +")";})()}}/><div className="min-w-0 flex-1 space-y-1.5">{pollResults.counts.map((item,index)=><div key={index} className="flex items-center gap-2 text-[10px]"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{background:["#7c3aed","#06b6d4","#ec4899","#f59e0b","#6366f1","#14b8a6","#f97316","#8b5cf6"][index%8]}}/><span className="min-w-0 flex-1 truncate text-slate-600">{item.label}</span><strong className="tabular-nums text-slate-800">{item.count}</strong></div>)}</div></div>}
                            {!pollResults.total&&<p className="text-[10px] text-slate-500">Noch keine Antworten eingegangen.</p>}
                          </div>}
                        </div>}
                        <p className="text-[10px] text-slate-500">Die Ergebnisse werden nach Antwortmodus ausgewertet. Freitextantworten bleiben für die Lehrkraft sichtbar.</p>
                        {moduleId && (selected.interactionData.responseMode??"single")==="free_text" && <div className="space-y-2"><button type="button" onClick={()=>loadTextResponses(selected.id)} disabled={responsesLoading} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50">{responsesLoading?"Antworten werden geladen …":"Schülerantworten ansehen"}</button>{responsesOpen&&<div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-violet-100 bg-white p-3"><div className="flex items-center justify-between"><p className="text-xs font-bold text-slate-900">{textResponses.length} Antworten</p><button type="button" onClick={()=>setResponsesOpen(false)} className="text-xs text-slate-500">Schließen</button></div>{textResponses.length?textResponses.map((response,index)=><article key={index} className="rounded-lg bg-violet-50/70 p-3"><p className="text-[10px] font-bold text-violet-800">{response.student}</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-700">{response.answer}</p></article>):<p className="text-xs text-slate-500">Noch keine Antworten eingegangen.</p>}</div>}</div>}
                      </div>}
                      {selected.postType === "true_false" && <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 space-y-3"><p className="text-xs font-bold text-violet-900">Richtige Antwort</p><div className="flex gap-2"><button type="button" onClick={()=>updatePost(selected.id,{interactionData:{...selected.interactionData,correctAnswer:"true"}})} className={"flex-1 rounded-lg border px-3 py-2 text-xs font-semibold "+(selected.interactionData.correctAnswer==="true"?"border-violet-500 bg-violet-100 text-violet-800":"border-slate-200 bg-white")}>Richtig</button><button type="button" onClick={()=>updatePost(selected.id,{interactionData:{...selected.interactionData,correctAnswer:"false"}})} className={"flex-1 rounded-lg border px-3 py-2 text-xs font-semibold "+(selected.interactionData.correctAnswer==="false"?"border-violet-500 bg-violet-100 text-violet-800":"border-slate-200 bg-white")}>Falsch</button></div><label className="block text-xs font-semibold text-slate-700">Erklärung nach der Antwort<textarea value={selected.interactionData.explanation??""} onChange={event=>updatePost(selected.id,{interactionData:{...selected.interactionData,explanation:event.target.value}})} rows={3} maxLength={1200} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"/></label></div>}
                      {(selected.postType === "embed" || selected.postType === "mixed") && <label className="block text-xs font-semibold text-slate-700">YouTube- oder Vimeo-URL<input value={selected.embedUrl} onChange={(event) => updatePost(selected.id, { embedUrl: event.target.value })} placeholder="https://…" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>}
                      <div className="drift-builder-preview overflow-hidden rounded-[20px] p-4"><div className="mb-3 flex items-center gap-2"><span className="drift-builder-preview-dot"/><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-violet-700">Live-Vorschau</p></div><h4 className="mt-2 text-sm font-bold text-slate-900">{selected.title || "Dein Beitrag"}</h4><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{selected.body || "Dein Text erscheint hier in der Vorschau."}</p>{selected.embedUrl && (getEmbedPreviewUrl(selected.embedUrl) ? <div className="mt-3 overflow-hidden rounded-xl bg-slate-950"><div className="aspect-video"><iframe src={getEmbedPreviewUrl(selected.embedUrl)!} title="Video-Vorschau" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div></div> : <p className="mt-2 text-xs text-amber-700">Bitte eine gültige YouTube- oder Vimeo-URL einfügen.</p>)}</div>
                    </div>
                  ) : <div className="flex min-h-64 flex-1 items-center justify-center px-6 text-center text-xs text-slate-500">Wähle ein Thumbnail aus oder erstelle einen neuen Beitrag.</div>}
          
                  </aside>

                    )}
                  </div>
                )}
              </div>
              {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>}
            </div>
            <footer className="drift-builder-footer flex min-h-[64px] shrink-0 flex-wrap items-center justify-between gap-3 border-t border-violet-100 px-5 py-3 sm:px-8">
              <p className="text-[11px] text-slate-500">Veröffentlichung nur für diese Klasseninstanz.</p>
              <div className="flex gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Abbrechen</button><button type="button" onClick={publish} disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">{pending ? "Speichert …" : <><Save className="h-4 w-4" /> {moduleId ? "Änderungen speichern" : "Veröffentlichen"}</>}</button></div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
