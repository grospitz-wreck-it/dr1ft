"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, GripVertical, ImagePlus, Link2, Plus, Save, Type, X, Wand2, RotateCcw, SlidersHorizontal, BarChart3, CircleCheck } from "lucide-react";
import { saveTeacherCreatedModule, updateTeacherCreatedModule } from "./teacherModuleActions";

type DraftPost = {
  id: string;
  postType: "text" | "image" | "embed" | "mixed" | "poll" | "true_false";
  title: string;
  body: string;
  embedUrl: string;
  interactionData: { options: [string, string]; correctAnswer?: "true" | "false"; explanation?: string };
  imageFile: File | null;
  existingImageUrl?: string | null;
  imageSettings: { brightness: number; contrast: number; saturation: number; grayscale: number; zoom: number; x: number; y: number };
};

type EditableModule = { id: string; title: string; description: string; introTitle?: string | null; introText?: string | null; visibilityScope?: "private" | "school" | "class"; titleCardEnabled?: boolean; posts: Array<{ id: string; postType: DraftPost["postType"]; title: string; body: string; embedUrl: string; imageUrl: string | null }> };

export function TeacherModuleBuilderModal({ classInstanceId, schoolId, editModule, triggerLabel = "Eigenes Modul erstellen", autoOpen = false }: { classInstanceId: string; schoolId: string; editModule?: EditableModule; triggerLabel?: string; autoOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [titleCardEnabled, setTitleCardEnabled] = useState(true);
  const [introTitle, setIntroTitle] = useState("");
  const [introText, setIntroText] = useState("");
  const [visibilityScope, setVisibilityScope] = useState<"private" | "school" | "class">("class");
  const [posts, setPosts] = useState<DraftPost[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [error, setError] = useState("");
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
    setTitle(""); setDescription(""); setTitleCardEnabled(true); setIntroTitle(""); setIntroText(""); setVisibilityScope("class");
    setPosts([]); setSelectedId(null); setError(""); setImageEditorOpen(false);
  }
  function openEditor() {
    setError("");
    setImageEditorOpen(false);
    if (editModule) {
      setModuleId(editModule.id);
      setTitle(editModule.title);
      setDescription(editModule.description);
      setTitleCardEnabled(editModule.titleCardEnabled ?? true);
      setIntroTitle(editModule.introTitle ?? "");
      setIntroText(editModule.introText ?? "");
      setVisibilityScope(editModule.visibilityScope ?? "class");
      const loadedPosts: DraftPost[] = editModule.posts.map((post) => ({
        id: post.id,
        postType: post.postType,
        title: post.title ?? "",
        body: post.body ?? "",
        embedUrl: post.embedUrl ?? "",
        interactionData: post.interactionData ?? { options: ["Echt", "Fake"] },
        imageFile: null,
        existingImageUrl: post.imageUrl,
        imageSettings: { brightness: 100, contrast: 100, saturation: 100, grayscale: 0, zoom: 1, x: 50, y: 50 },
      }));
      setPosts(loadedPosts);
      setSelectedId(loadedPosts[0]?.id ?? null);
    } else {
      reset();
    }
    setOpen(true);
  }
  useEffect(() => {
    if (autoOpen && editModule) openEditor();
  }, [autoOpen, editModule]);

  function addPost(type: DraftPost["postType"]) {
    const post: DraftPost = { id: crypto.randomUUID(), postType: type, title: "", body: "", embedUrl: "", interactionData: { options: ["Echt", "Fake"], correctAnswer: "true", explanation: "" }, imageFile: null, imageSettings: { brightness: 100, contrast: 100, saturation: 100, grayscale: 0, zoom: 1, x: 50, y: 50 } };
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
    form.set("introTitle", introTitle);
    form.set("introText", introText);
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
          <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-[0_30px_100px_rgba(37,20,70,.28)]">
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-7">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-600">DR1FT · EIGENES MODUL</p>
                <h2 id="teacher-module-title" className="mt-1 text-xl font-bold text-slate-950">{moduleId ? "Modul bearbeiten" : "Modul erstellen"}</h2>
                <p className="mt-1 text-sm text-slate-500">Nur für diese Schule und die ausgewählte Klasseninstanz.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Schließen" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[minmax(280px,.78fr)_minmax(0,1.22fr)]">
                <section className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">Modultitel
                    <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="z. B. KI im Alltag" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
                  </label>
                  <label className="block text-xs font-semibold text-slate-700">Kurzbeschreibung
                    <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={500} placeholder="Worum geht es in diesem Modul?" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
                  </label>
                  <label className="block rounded-2xl border border-slate-200 p-3 text-xs font-semibold text-slate-700">Wer darf dieses Modul im Lehrkraftbereich sehen?
                    <select value={visibilityScope} onChange={event => setVisibilityScope(event.target.value as "private" | "school" | "class")} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium">
                      <option value="private">Nur für mich</option>
                      <option value="school">Alle Lehrkräfte und Schuladmins meiner Schule</option>
                      <option value="class">Nur diese Klasse</option>
                    </select>
                    <span className="mt-1 block font-normal text-slate-500">Aktivierte Module bleiben für die Schüler:innen der jeweiligen Klasse sichtbar.</span>
                  </label>
                  <label className="flex items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50/70 p-3">
                    <span><span className="block text-xs font-bold text-violet-900">Titelcard im Schüler-Feed</span><span className="mt-1 block text-[11px] font-normal text-violet-700">Zeigt Modultitel und Beschreibung vor dem Start.</span></span>
                    <input type="checkbox" checked={titleCardEnabled} onChange={event=>setTitleCardEnabled(event.target.checked)} className="h-5 w-9 accent-violet-600"/>
                  </label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div><h3 className="text-sm font-bold text-slate-900">Beiträge</h3><p className="text-[11px] text-slate-500">Thumbnails ziehen, um die Reihenfolge zu ändern.</p></div>
                      <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold text-violet-700">{posts.length} / 40</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {thumbnails.map((post) => (
                        <div key={post.id} draggable onDragStart={(event) => { setDragId(post.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", post.id); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); const sourceId = event.dataTransfer.getData("text/plain") || dragId; if (sourceId) movePost(sourceId, post.id); setDragId(null); }} onDragEnd={() => setDragId(null)}
                          className={"group relative flex cursor-grab items-center gap-3 overflow-hidden rounded-xl border bg-white p-2 text-left transition active:cursor-grabbing " + (selectedId === post.id ? "border-violet-500 bg-violet-50/40 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-300")}>
                          <span className="grid h-9 w-7 shrink-0 place-items-center text-slate-400"><GripVertical className="h-4 w-4"/></span>
                          <button type="button" onClick={() => setSelectedId(post.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                            <div className="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-violet-100 to-cyan-100">
                              {post.imageFile ? <img src={URL.createObjectURL(post.imageFile)} alt="" className="h-full w-full object-cover" /> : post.existingImageUrl ? <img src={post.existingImageUrl} alt="" className="h-full w-full object-cover" /> : post.postType === "embed" ? <Link2 className="h-6 w-6 text-violet-500" /> : post.postType === "poll" ? <BarChart3 className="h-6 w-6 text-violet-500"/> : post.postType === "true_false" ? <CircleCheck className="h-6 w-6 text-violet-500"/> : <Type className="h-6 w-6 text-violet-500" />}
                            </div>
                            <span className="min-w-0 flex-1"><span className="block text-[9px] font-bold uppercase tracking-wider text-violet-600">{post.postType === "poll" ? "Umfrage" : post.postType === "true_false" ? "Richtig / Falsch" : post.postType === "embed" ? "Embed" : post.postType === "image" ? "Bild" : "Text / Bild"}</span><span className="mt-1 block truncate text-xs font-bold text-slate-900">{post.title || "Unbenannter Beitrag"}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">{String(post.index + 1).padStart(2,"0")} · {post.body || "Noch kein Inhalt"}</span></span>
                          </button>
                          <div className="flex shrink-0 items-center gap-1"><button type="button" aria-label="Nach oben" onClick={() => moveBy(post.index, -1)} disabled={post.index === 0} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-20"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" aria-label="Nach unten" onClick={() => moveBy(post.index, 1)} disabled={post.index === posts.length - 1} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-20"><ArrowDown className="h-3.5 w-3.5" /></button></div>
                        </div>
                      ))}
                      {posts.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-violet-200 bg-white px-3 py-8 text-center text-xs text-slate-500">Noch keine Beiträge. Füge unten deinen ersten Post hinzu.</div>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" disabled={posts.length >= 40} onClick={() => addPost("text")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-violet-300"><Type className="h-3.5 w-3.5" /> Text</button>
                      <button type="button" disabled={posts.length >= 40} onClick={() => addPost("image")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-violet-300"><ImagePlus className="h-3.5 w-3.5" /> Bild</button>
                      <button type="button" disabled={posts.length >= 40} onClick={() => addPost("embed")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-violet-300"><Link2 className="h-3.5 w-3.5" /> Embed</button><button type="button" disabled={posts.length >= 40} onClick={() => addPost("poll")} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700"><BarChart3 className="h-3.5 w-3.5"/> Umfrage</button><button type="button" disabled={posts.length >= 40} onClick={() => addPost("true_false")} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700"><CircleCheck className="h-3.5 w-3.5"/> Richtig / Falsch</button>
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
                      {(selected.postType === "image" || selected.postType === "mixed" || selected.postType === "poll" || selected.postType === "true_false") && <>
                        <label className="block text-xs font-semibold text-slate-700">Bild hochladen<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { updatePost(selected.id, { imageFile: event.target.files?.[0] ?? null }); setImageEditorOpen(false); }} className="mt-1.5 block w-full text-xs text-slate-600" /></label>
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
                      {selected.postType === "poll" && <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 space-y-3"><p className="text-xs font-bold text-violet-900">Antwortmöglichkeiten</p>{([0,1] as const).map(index=><label key={index} className="block text-xs font-semibold text-slate-700">Antwort {index+1}<input value={selected.interactionData.options[index]} onChange={event=>updatePost(selected.id,{interactionData:{...selected.interactionData,options:selected.interactionData.options.map((value,i)=>i===index?event.target.value:value) as [string,string]}})} maxLength={100} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"/></label>)}<p className="text-[10px] text-slate-500">Schüler:innen stimmen ab. Nach der Abstimmung sehen sie die aktuelle Verteilung.</p></div>}
                      {selected.postType === "true_false" && <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 space-y-3"><p className="text-xs font-bold text-violet-900">Richtige Antwort</p><div className="flex gap-2"><button type="button" onClick={()=>updatePost(selected.id,{interactionData:{...selected.interactionData,correctAnswer:"true"}})} className={"flex-1 rounded-lg border px-3 py-2 text-xs font-semibold "+(selected.interactionData.correctAnswer==="true"?"border-violet-500 bg-violet-100 text-violet-800":"border-slate-200 bg-white")}>Richtig</button><button type="button" onClick={()=>updatePost(selected.id,{interactionData:{...selected.interactionData,correctAnswer:"false"}})} className={"flex-1 rounded-lg border px-3 py-2 text-xs font-semibold "+(selected.interactionData.correctAnswer==="false"?"border-violet-500 bg-violet-100 text-violet-800":"border-slate-200 bg-white")}>Falsch</button></div><label className="block text-xs font-semibold text-slate-700">Erklärung nach der Antwort<textarea value={selected.interactionData.explanation??""} onChange={event=>updatePost(selected.id,{interactionData:{...selected.interactionData,explanation:event.target.value}})} rows={3} maxLength={1200} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"/></label></div>}
                      {(selected.postType === "embed" || selected.postType === "mixed") && <label className="block text-xs font-semibold text-slate-700">YouTube- oder Vimeo-URL<input value={selected.embedUrl} onChange={(event) => updatePost(selected.id, { embedUrl: event.target.value })} placeholder="https://…" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>}
                      <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vorschau</p><h4 className="mt-2 text-sm font-bold text-slate-900">{selected.title || "Dein Beitrag"}</h4><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{selected.body || "Dein Text erscheint hier in der Vorschau."}</p>{selected.embedUrl && (getEmbedPreviewUrl(selected.embedUrl) ? <div className="mt-3 overflow-hidden rounded-xl bg-slate-950"><div className="aspect-video"><iframe src={getEmbedPreviewUrl(selected.embedUrl)!} title="Video-Vorschau" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div></div> : <p className="mt-2 text-xs text-amber-700">Bitte eine gültige YouTube- oder Vimeo-URL einfügen.</p>)}</div>
                    </div>
                  ) : <div className="flex min-h-64 items-center justify-center text-center text-xs text-slate-500">Wähle ein Thumbnail aus oder erstelle einen neuen Beitrag.</div>}
                </section>
              </div>
              {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>}
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 sm:px-7">
              <p className="text-[11px] text-slate-500">Veröffentlichung nur für diese Klasseninstanz.</p>
              <div className="flex gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Abbrechen</button><button type="button" onClick={publish} disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">{pending ? "Speichert …" : <><Save className="h-4 w-4" /> {moduleId ? "Änderungen speichern" : "Veröffentlichen"}</>}</button></div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
