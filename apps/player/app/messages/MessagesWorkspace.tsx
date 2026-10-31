"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Search, Users, UserRoundPlus, Send, ChevronLeft, Smile, Flag, X } from "lucide-react";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";

type Contact = { id: string; display_name: string; handle: string; isDue: boolean; lastMessage?: string | null; lastMessageAt?: string | null; lastMessageFromMe?: boolean };
type DirectMessage = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null };
type GroupChat = { id: string; title: string };
type ScenarioMessage = { id: string; senderName: string; title: string; preview: string; deliveredAt: string; isRead: boolean };
type Share = {
  id: string;
  created_at: string;
  senderName: string;
  senderSeed: string | null;
  text: string;
  mediaUrl: string | null;
  postId: string;
};

function ChatDoodle({ large = false, group = false }: { large?: boolean; group?: boolean }) { return <div aria-hidden="true" className={`chat-doodle ${large ? "h-64 w-72" : "h-20 w-24"}`}><img src="/branding/chat.webp" alt="" className="chat-doodle-main" /></div>; }

export default function MessagesWorkspace({
  contacts,
  groupChats,
  shares,
  scenarioMessages,
}: {
  contacts: Contact[];
  groupChats: GroupChat[];
  shares: Share[];
  scenarioMessages: ScenarioMessage[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [showContacts, setShowContacts] = useState(true);
  const [studentContacts, setStudentContacts] = useState<Contact[]>([]);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [contactLoadError, setContactLoadError] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiStyle, setEmojiStyle] = useState<EmojiStyle>(EmojiStyle.APPLE);
  const [reportMessage, setReportMessage] = useState<DirectMessage | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportDone, setReportDone] = useState(false);
  const draftRef = useRef<HTMLTextAreaElement | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [directMessages, messageLoading]);

  useEffect(() => {
    let active = true;
    fetch("/api/messages/direct", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Kontakte konnten nicht geladen werden.");
        if (active) setStudentContacts(payload.contacts ?? []);
      })
      .catch((error) => { if (active) setContactLoadError(error instanceof Error ? error.message : "Kontakte konnten nicht geladen werden."); });
    return () => { active = false; };
  }, []);

  // Keep the conversation list (previews and unread badges) fresh while the page is open.
  useEffect(() => {
    let active = true;
    let inFlight = false;
    const refreshContacts = async () => {
      if (inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const response = await fetch("/api/messages/direct", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Kontakte konnten nicht aktualisiert werden.");
        if (active) setStudentContacts(payload.contacts ?? []);
      } catch (error) {
        if (active) setContactLoadError(error instanceof Error ? error.message : "Kontakte konnten nicht aktualisiert werden.");
      } finally {
        inFlight = false;
      }
    };
    const interval = window.setInterval(() => void refreshContacts(), 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const selectedStudent = studentContacts.find((contact) => contact.id === selected);
  useEffect(() => {
    if (!selectedStudent) { setDirectMessages([]); setMessageError(""); return; }
    let active = true;
    setMessageLoading(true);
    setMessageError("");
    fetch("/api/messages/direct?peerId=" + encodeURIComponent(selectedStudent.id), { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unterhaltung konnte nicht geladen werden.");
        if (active) {
          setDirectMessages(payload.messages ?? []);
          setStudentContacts((current) => current.map((contact) => contact.id === selectedStudent.id ? { ...contact, isDue: false } : contact));
          window.dispatchEvent(new Event("dr1ft:messages-read"));
        }
      })
      .catch((error) => { if (active) setMessageError(error instanceof Error ? error.message : "Unterhaltung konnte nicht geladen werden."); })
      .finally(() => { if (active) setMessageLoading(false); });
    return () => { active = false; };
  }, [selectedStudent?.id]);

  // Refresh the open thread so incoming messages appear without a manual reload.
  useEffect(() => {
    if (!selectedStudent) return;
    let active = true;
    let inFlight = false;
    const refreshThread = async () => {
      if (inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const response = await fetch("/api/messages/direct?peerId=" + encodeURIComponent(selectedStudent.id), { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unterhaltung konnte nicht aktualisiert werden.");
        if (active) {
          setDirectMessages(payload.messages ?? []);
          setStudentContacts((current) => current.map((contact) => contact.id === selectedStudent.id
            ? { ...contact, isDue: false, lastMessage: payload.messages?.at(-1)?.body ?? contact.lastMessage, lastMessageAt: payload.messages?.at(-1)?.created_at ?? contact.lastMessageAt }
            : contact));
          window.dispatchEvent(new Event("dr1ft:messages-read"));
        }
      } catch (error) {
        if (active) setMessageError(error instanceof Error ? error.message : "Unterhaltung konnte nicht aktualisiert werden.");
      } finally {
        inFlight = false;
      }
    };
    const interval = window.setInterval(() => void refreshThread(), 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [selectedStudent?.id]);

  async function sendDirectMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStudent || !draft.trim() || messageLoading) return;
    setMessageLoading(true);
    setMessageError("");
    try {
      const response = await fetch("/api/messages/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: selectedStudent.id, body: draft.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Nachricht konnte nicht gesendet werden.");
      setDirectMessages((current) => [...current, payload.message]);
      setDraft("");
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : "Nachricht konnte nicht gesendet werden.");
    } finally {
      setMessageLoading(false);
    }
  }

  async function submitReport() {
    if (!reportMessage || !selectedStudent || reportLoading) return;
    setReportLoading(true);
    setReportError("");
    try {
      const response = await fetch("/api/messages/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: reportMessage.id, peerId: selectedStudent.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Die Meldung konnte nicht gespeichert werden.");
      setReportDone(true);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Die Nachricht konnte nicht gemeldet werden.");
    } finally {
      setReportLoading(false);
    }
  }

  function insertEmoji(emoji: string) {
    const input = draftRef.current;
    if (!input) { setDraft((current) => current + emoji); setEmojiOpen(false); return; }
    const start = input.selectionStart ?? draft.length;
    const end = input.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    setDraft(next);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  const allContacts = useMemo(() => [...contacts, ...studentContacts], [contacts, studentContacts]);
  const filteredContacts = useMemo(() => allContacts
    .filter((contact) => {
      const matchesQuery = (contact.display_name + " " + contact.handle).toLowerCase().includes(query.toLowerCase());
      return matchesQuery && (filter === "all" || contact.isDue);
    })
    .sort((a, b) => Number(b.isDue) - Number(a.isDue)
      || (Date.parse(b.lastMessageAt ?? "") || 0) - (Date.parse(a.lastMessageAt ?? "") || 0)),
  [allContacts, query, filter]);

  const selectedContact = contacts.find((contact) => contact.id === selected);
  const selectedGroup = groupChats.find((chat) => chat.id === selected);

  return (
    <main className="drift-messenger relative -mt-4 flex h-[calc(100dvh-6rem)] min-h-0 flex-col overflow-hidden rounded-[28px] border shadow-2xl lg:h-[calc(100dvh-4rem)] lg:min-h-0">
      <img src="/branding/bg-neon-circle.webp" alt="" aria-hidden="true" className="drift-neon-background pointer-events-none absolute bottom-0 right-0 z-0 w-[min(38vw,34rem)] max-w-none" />
      <div className="relative z-[1] grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] grid-cols-1 lg:grid-cols-[minmax(280px,32%)_minmax(0,1fr)]">
        <aside className={`drift-messenger-list border-b border-white/10 lg:border-b-0 lg:border-r ${!showContacts ? "hidden lg:block" : ""}`}>
          <div className="flex items-center justify-between gap-3 border-b border-white/[.07] px-5 py-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-cyan-200/70">Dein Space</p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">Nachrichten</h1>
            </div>
          </div>

          <div className="space-y-4 overflow-y-auto p-4 sm:p-5">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.045] px-4 py-3.5 text-white/50 transition focus-within:border-cyan-300/40 focus-within:bg-white/[.07]">
              <Search className="h-4 w-4 shrink-0" />
              <input id="contact-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Kontakte suchen" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35" />
            </label>

            <div className="grid grid-cols-2 rounded-2xl border border-white/[.06] bg-black/20 p-1">
              <button onClick={() => setFilter("all")} className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${filter === "all" ? "drift-gradient-button shadow-lg" : "text-white/50 hover:text-white"}`}>Alle</button>
              <button onClick={() => setFilter("unread")} className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${filter === "unread" ? "drift-gradient-button shadow-lg" : "text-white/50 hover:text-white"}`}>Ungelesen</button>
            </div>

            <div className="space-y-2">
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[.2em] text-white/35">Direktnachrichten</p>
              {filteredContacts.map((contact) => (
                <button key={contact.id} onClick={() => { setDirectMessages([]); setMessageError(""); setMessageLoading(true); setSelected(contact.id); setShowContacts(false); }} className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${selected === contact.id ? "border-cyan-300/25 bg-gradient-to-r from-fuchsia-500/15 via-violet-500/10 to-cyan-400/10" : "border-transparent hover:border-white/10 hover:bg-white/[.045]"}`}>
                  <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-gradient-to-br from-fuchsia-500/30 via-violet-500/25 to-cyan-400/25 text-sm font-bold ring-1 ring-white/10">{contact.display_name.slice(0, 1).toUpperCase()}{contact.isDue && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-pink-400 shadow-[0_0_10px_rgba(236,72,153,.75)]" />}</span>
                  <span className="min-w-0 flex-1"><span className="flex min-w-0 items-center justify-between gap-2"><span className="block truncate text-sm font-semibold text-white/90">{contact.display_name}</span>{contact.lastMessageAt && <time className="shrink-0 text-[10px] text-white/40">{new Date(contact.lastMessageAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</time>}</span><span className="mt-1 block truncate text-xs text-white/50">{contact.lastMessage ? (contact.lastMessageFromMe ? "Du: " : "") + contact.lastMessage : contact.handle}</span></span>
                  <MessageCircle className="h-4 w-4 shrink-0 text-white/25 group-hover:text-cyan-200" />
                </button>
              ))}
              {contactLoadError && <p className="rounded-xl border border-rose-300/20 bg-rose-300/5 p-3 text-xs text-rose-200">{contactLoadError}</p>}{filteredContacts.length === 0 && <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-4 py-5 text-center text-xs leading-5 text-white/55"><img src="/branding/smiley-chat.webp" alt="" aria-hidden="true" className="mb-3 h-20 w-24 object-contain" /><span>{filter === "unread" ? "Keine ungelesenen Nachrichten." : "Noch keine Kontakte – starte ein Gespräch."}</span></div>}
            </div>

            {groupChats.length > 0 && <div className="space-y-2 pt-2">
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[.2em] text-white/35">Gruppenchats</p>
              {groupChats.map((chat) => <button key={chat.id} onClick={() => { setDirectMessages([]); setMessageError(""); setMessageLoading(false); setSelected(chat.id); setShowContacts(false); }} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${selected === chat.id ? "border-cyan-300/25 bg-white/[.08]" : "border-transparent hover:border-white/10 hover:bg-white/[.045]"}`}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-cyan-300/10 text-cyan-200"><Users className="h-5 w-5" /></span><span className="min-w-0 flex-1 truncate text-sm font-medium">{chat.title}</span></button>)}
            </div>}

            {scenarioMessages.length > 0 && <div className="space-y-2 pt-2">
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[.2em] text-white/35">Szenario-Nachrichten</p>
              {scenarioMessages.filter((message) => filter === "all" || !message.isRead).map((message) => <a key={message.id} href={`/messages/scenario/${message.id}`} className="flex items-center gap-3 rounded-2xl border border-white/[.07] bg-white/[.025] p-3 transition hover:border-cyan-300/20 hover:bg-white/[.06]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-cyan-400/15 text-cyan-200"><MessageCircle className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate text-xs font-semibold">{message.senderName}</span>{!message.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-pink-400" />}</span><span className="mt-1 block truncate text-xs text-white/65">{message.title}</span><span className="mt-1 block truncate text-[11px] text-white/40">{message.preview}</span></span>
              </a>)}
              {filter === "unread" && scenarioMessages.every((message) => message.isRead) && <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-white/45">Keine ungelesenen Szenario-Nachrichten.</p>}
            </div>}
            {shares.length > 0 && <div className="space-y-2 pt-2">
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[.2em] text-white/35">Mit dir geteilt</p>
              {shares.slice(0, 4).map((share) => <a key={share.id} href={`/feed#post-${share.postId}`} className="flex items-center gap-3 rounded-2xl border border-white/[.06] bg-white/[.025] p-3 transition hover:bg-white/[.06]"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-violet-200"><Send className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{share.senderName}</span><span className="mt-1 block truncate text-xs text-white/40">{share.text}</span></span></a>)}
            </div>}
          </div>
        </aside>

        <section className={`drift-messenger-chat relative flex min-h-0 flex-1 flex-col overflow-hidden ${showContacts ? "hidden lg:flex" : "flex"}`}>
          <header className="flex h-[74px] shrink-0 items-center justify-between border-b border-white/[.07] px-5 sm:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => setShowContacts(true)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/60 hover:bg-white/[.07] lg:hidden" aria-label="Zur Kontaktliste"><ChevronLeft className="h-5 w-5" /></button>
              <div className="min-w-0"><p className="truncate text-base font-bold">{selectedStudent?.display_name || selectedContact?.display_name || selectedGroup?.title || "Nachrichten"}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[.17em] text-white/30">{selectedStudent || selectedContact ? "Direktnachricht" : selectedGroup ? "Klassengruppe" : "Dein DR1FT-Postfach"}</p></div>
            </div>
            <span aria-hidden="true" className="h-10 w-10" />
          </header>

          {selectedStudent ? <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="dm-message-list min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-5 sm:px-7">
              {messageLoading && directMessages.length === 0 && <p className="py-10 text-center text-sm text-white/45">Unterhaltung wird geladen …</p>}
              {!messageLoading && directMessages.length === 0 && <div className="flex h-full min-h-52 flex-col items-center justify-center text-center"><ChatDoodle /><p className="mt-2 text-lg font-semibold">Sag Hallo!</p><p className="mt-1 text-sm text-white/45">Das ist der Anfang eurer Unterhaltung.</p></div>}
              {directMessages.map((message) => (
                <div key={message.id} className={"group flex w-full min-w-0 " + (message.sender_id === selectedStudent.id ? "justify-start" : "justify-end")}>
                  <div className="relative min-w-0 max-w-[82%] sm:max-w-[64%]">
                    <div className={"dm-bubble w-full max-w-none rounded-xl px-3 py-2 " + (message.sender_id === selectedStudent.id ? "dm-bubble-in rounded-bl-sm" : "dm-bubble-out rounded-br-sm")}>
                      <p className="dm-message-body whitespace-pre-wrap break-words text-lg leading-[1.4] sm:text-xl">{message.body}</p>
                      <p className="dm-message-time mt-1 text-right text-xs sm:text-sm">{new Date(message.created_at).toLocaleString("de-DE", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <button type="button" onClick={() => { setReportMessage(message); setReportError(""); setReportDone(false); }} className="dm-report-button absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border border-violet-200 bg-white text-violet-600 opacity-0 shadow-sm transition group-hover:opacity-100 focus:opacity-100" aria-label="Nachricht melden" title="Nachricht melden"><Flag className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
              <div ref={messageEndRef} />
              {messageError && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/5 p-3 text-xs text-rose-200">{messageError}</p>}
            </div>
            <div className="dm-compose-area sticky bottom-0 z-10 flex-none border-t border-white/[.08] p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] sm:p-4">
              {emojiOpen && <div className="dm-picker mb-3 overflow-hidden rounded-2xl border p-2 sm:p-3" role="dialog" aria-label="Emoji auswählen">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
                  <span className="text-sm font-semibold">Alle Emojis</span>
                  <div className="flex flex-wrap gap-1" aria-label="Emoji-Stil auswählen">
                    {([{ value: EmojiStyle.APPLE, label: "Apple" }, { value: EmojiStyle.GOOGLE, label: "Google" }, { value: EmojiStyle.FACEBOOK, label: "Facebook" }, { value: EmojiStyle.TWITTER, label: "Twitter" }, { value: EmojiStyle.NATIVE, label: "System" }]).map((style) => <button key={style.value} type="button" onClick={() => setEmojiStyle(style.value)} className={`rounded-lg px-2 py-1 text-[11px] font-medium transition ${emojiStyle === style.value ? "bg-violet-600 text-white" : "bg-violet-500/10 hover:bg-violet-500/20"}`}>{style.label}</button>)}
                  </div>
                </div>
                <EmojiPicker onEmojiClick={(emojiData) => insertEmoji(emojiData.emoji)} emojiStyle={emojiStyle} theme={Theme.AUTO} width="100%" height={440} searchPlaceHolder="Emoji suchen …" previewConfig={{ showPreview: false }} lazyLoadEmojis />
              </div>}
              <form onSubmit={sendDirectMessage} className="flex w-full items-end gap-2">
                <button type="button" onClick={() => setEmojiOpen((open) => !open)} aria-label="Emoji auswählen" title="Emoji" className="dm-tool-button grid h-11 w-10 shrink-0 place-items-center rounded-xl"><Smile className="h-5 w-5" /></button>
                <textarea ref={draftRef} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} rows={1} placeholder="Nachricht schreiben …" className="dm-composer block max-h-36 min-h-11 min-w-0 w-full flex-1 resize-y rounded-2xl border px-4 py-3 text-sm outline-none focus:border-violet-400/60" />
                <button type="submit" disabled={!draft.trim() || messageLoading} className="drift-gradient-button inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" /><span className="hidden sm:inline">Senden</span></button>
              </form>
            </div>
          </div> : selectedContact ? <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="drift-orb drift-orb-top" /><div className="drift-orb drift-orb-bottom" />
            <ChatDoodle />
            <h2 className="relative text-2xl font-bold tracking-tight">Unterhaltung öffnen</h2>
            <p className="relative mt-3 max-w-sm text-sm leading-6 text-white/55">Öffne den bestehenden Chat mit {selectedContact.display_name}, um den bisherigen Gesprächsverlauf fortzusetzen.</p>
            <a href={`/messages/${selectedContact.id}`} className="drift-gradient-button relative mt-7 inline-flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold shadow-lg shadow-violet-950/30"><MessageCircle className="h-4 w-4" /> Chat öffnen</a>
          </div> : selectedGroup ? <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-12 text-center"><div className="drift-orb drift-orb-top" /><ChatDoodle group={true} /><h2 className="relative text-2xl font-bold">Gruppenchat öffnen</h2><p className="relative mt-3 max-w-sm text-sm leading-6 text-white/55">Setze das Gespräch mit deiner Klasse fort.</p><a href={`/group-chat/${selectedGroup.id}`} className="drift-gradient-button relative mt-7 inline-flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold"><Users className="h-4 w-4" /> Gruppenchat öffnen</a></div> : <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-14 text-center">
            <div className="drift-orb drift-orb-top" /><div className="drift-orb drift-orb-bottom" />
            <ChatDoodle large />

            <button onClick={() => { setShowContacts(true); document.getElementById("contact-search")?.focus(); }} className="relative mt-7 inline-flex items-center gap-2 rounded-2xl border px-5 py-3.5 text-sm font-semibold drift-secondary-button"><UserRoundPlus className="h-4 w-4" /> Kontakt auswählen</button>
          </div>}
          <footer className="shrink-0 border-t px-5 py-3 text-center text-[10px] drift-muted">DR1FT · Gespräche deiner Klasse</footer>
        </section>
      </div>
      {reportMessage && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#130d24]/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <div className="report-modal w-full max-w-lg overflow-hidden rounded-[28px] border shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b px-6 py-5"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-violet-500">DR1FT · Sicherer Space</p><h2 id="report-title" className="mt-1 text-xl font-bold">Nachricht melden?</h2></div><button type="button" onClick={() => setReportMessage(null)} className="grid h-9 w-9 place-items-center rounded-xl border text-slate-500 hover:bg-violet-50" aria-label="Fenster schließen"><X className="h-4 w-4" /></button></div>
          <div className="space-y-4 px-6 py-5">{reportDone ? <><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">Danke, dass du Bescheid gegeben hast. Deine Lehrkraft kann sich den gemeldeten Gesprächsabschnitt ansehen.</div><button type="button" onClick={() => setReportMessage(null)} className="drift-gradient-button rounded-2xl px-4 py-3 text-sm font-semibold">Fertig</button></> : <><p className="text-sm leading-6 text-slate-600">Möchtest du diesen Textabschnitt wirklich melden? Deine Lehrkraft wird diesen Abschnitt der Nachrichten mit deinen Nachrichten und denen deines Chatpartners erhalten.</p><div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-violet-500">Gemeldete Nachricht</p><p className="mt-2 whitespace-pre-wrap text-sm font-medium text-slate-800">{reportMessage.body}</p></div>{reportError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{reportError}</p>}<div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end"><button type="button" onClick={() => setReportMessage(null)} disabled={reportLoading} className="rounded-2xl border px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Abbrechen</button><button type="button" onClick={submitReport} disabled={reportLoading} className="drift-gradient-button inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-50"><Flag className="h-4 w-4" />{reportLoading ? "Wird gemeldet …" : "Nachricht melden"}</button></div></>}</div>
        </div>
      </div>}
      <style jsx>{`
        .report-modal { background:#fff; border-color:#e6def5; color:#27213b; }
        :global(html.dark-mode) .report-modal { background:#1b1329; border-color:#46345f; color:#f6f2ff; }
        .chat-doodle { position:relative; isolation:isolate; margin-inline:auto; }
        .chat-doodle-main { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; filter:drop-shadow(0 8px 20px rgba(128,35,255,.24)); }
        .chat-doodle-smiley { position:absolute; right:0; bottom:0; width:52%; height:66%; object-fit:contain; filter:drop-shadow(0 8px 18px rgba(0,190,255,.24)); }
        .drift-neon-background { opacity:.55; mix-blend-mode:multiply; }
        .drift-message-notch { box-shadow:-1px -1px 0 var(--drift-border); }
        .drift-message-notch:before { content:""; position:absolute; width:26px; height:26px; left:-26px; bottom:0; background:radial-gradient(circle at 0 0,transparent 26px,var(--drift-surface) 27px); }
        .drift-message-notch:after { content:""; position:absolute; width:26px; height:26px; right:0; top:-26px; background:radial-gradient(circle at 100% 0,transparent 26px,var(--drift-surface) 27px); }
        :global(html.dark-mode) .drift-neon-background { opacity:.38; mix-blend-mode:screen; }
        .drift-messenger { color:var(--drift-ink); background:var(--drift-surface); border-color:var(--drift-border); }
        :global(html:not(.dark-mode)) .drift-messenger [class*="text-white"] { color:#756d8e !important; }
        :global(html:not(.dark-mode)) .drift-messenger .drift-gradient-button, :global(html:not(.dark-mode)) .drift-messenger .drift-gradient-button [class*="text-white"] { color:#fff !important; }
        :global(html:not(.dark-mode)) .drift-messenger [class*="bg-white/"] { background-color:rgba(39,33,61,.035) !important; }
        :global(html:not(.dark-mode)) .drift-messenger [class*="border-white/"] { border-color:var(--drift-border) !important; }
        :global(html:not(.dark-mode)) .drift-messenger input::placeholder { color:var(--drift-ink-soft) !important; opacity:.75; }
        .drift-messenger-list { background:var(--drift-surface-soft); border-color:var(--drift-border); }
        .drift-messenger-chat { background:radial-gradient(ellipse at 84% 8%,rgba(99,102,241,.10),transparent 38%),radial-gradient(ellipse at 18% 100%,rgba(217,70,239,.07),transparent 34%),#f7f5fc; }
        .dm-bubble { box-shadow:0 1px 2px rgba(35,25,60,.08); overflow-wrap:anywhere; }
        .dm-bubble { box-shadow:none !important; border-radius:16px !important; background:#ffffff !important; border:1.5px solid transparent !important; }
        .dm-bubble-in { color:#29243a !important; border-color:#00bde8 !important; border-bottom-left-radius:5px !important; }
        .dm-bubble-in p { color:#29243a !important; }
        .dm-bubble-out { color:#29243a !important; border-color:#d946ef !important; border-bottom-right-radius:5px !important; }
        .dm-bubble-out p { color:#29243a !important; }
        .dm-bubble .dm-message-body { overflow-wrap:anywhere; }
        .dm-message-time { color:inherit !important; opacity:.62; font-variant-numeric:tabular-nums; }
        @media (hover:none) { .dm-report-button { opacity:1; } }
        .dm-composer { color:#29243a; background:#ffffff; border-color:#ddd6ec; }
        .dm-composer::placeholder { color:#716a82; opacity:1; }
        .dm-picker { color:#302842; background:#ffffff; border-color:#ddd6ec; box-shadow:0 12px 36px rgba(35,25,60,.12); }
        .dm-picker .EmojiPickerReact { --epr-emoji-size: 38px; --epr-emoji-gap: 0px; --epr-emoji-padding: 2px; --epr-header-padding: 4px; --epr-search-input-height: 44px; --epr-category-navigation-button-size: 32px; border:0 !important; }
        .dm-picker .EmojiPickerReact .epr-emoji { transform:scale(1.16); }\n        .dm-picker .EmojiPickerReact .epr-emoji-list { row-gap:0 !important; column-gap:0 !important; }\n        .dm-picker .EmojiPickerReact .epr-emoji-category { margin:0 !important; }\n        .dm-picker .EmojiPickerReact .epr-emoji-category-label { padding:4px 8px !important; line-height:1.2 !important; }\n        .dm-picker .EmojiPickerReact .epr-header { padding:4px !important; gap:4px !important; }
        .dm-tool-button { color:#6f4bc3; border:1px solid #ddd6ec; background:#fff; transition:background .15s ease,color .15s ease; }
        .dm-tool-button:hover { color:#4b35bd; background:#f1eaff; }
        .drift-gradient-button { color:#fff; background:linear-gradient(110deg,#c026d3,#7c3aed 52%,#2563eb); }
        .drift-secondary-button { border-color:var(--drift-border); background:var(--drift-surface-soft); color:var(--drift-ink); }
        .drift-muted { color:var(--drift-ink-soft); border-color:var(--drift-border); }
        .drift-orb { position:absolute; width:16rem; height:16rem; border-radius:9999px; pointer-events:none; filter:blur(42px); opacity:.14; } .drift-orb-top { right:-7rem; top:-7rem; background:#2563eb; } .drift-orb-bottom { left:-8rem; bottom:-8rem; background:#a21caf; }
        :global(html.dark-mode) .drift-messenger { color:#f7f4ff; background:linear-gradient(135deg,#110d20 0%,#17102c 52%,#100d20 100%); border-color:rgba(255,255,255,.10); }
        :global(html.dark-mode) .drift-messenger-list { background:linear-gradient(180deg,rgba(25,17,45,.98),rgba(16,13,31,.98)); border-color:rgba(255,255,255,.10); }
        :global(html.dark-mode) .drift-messenger-chat { background:radial-gradient(ellipse at 80% 0%,rgba(91,33,182,.17),transparent 42%),#100d20; }
        :global(html.dark-mode) .dm-bubble-in { color:#f5f1ff !important; background:#211a30 !important; border-color:#00c9f2 !important; }
        :global(html.dark-mode) .dm-bubble-in p { color:#f5f1ff !important; }
        :global(html.dark-mode) .dm-bubble-out { color:#f5f1ff !important; background:#211a30 !important; border-color:#ed62f7 !important; }
        :global(html.dark-mode) .dm-bubble-out p { color:#f5f1ff !important; }
        :global(html.dark-mode) .dm-composer { color:#f5f1ff; background:#211a30; border-color:#443754; }
        :global(html.dark-mode) .dm-composer::placeholder { color:#b8aecb; opacity:1; }
        :global(html.dark-mode) .dm-picker { color:#f5f1ff; background:#211a30; border-color:#443754; }
        :global(html.dark-mode) .dm-picker .EmojiPickerReact { --epr-bg-color:#211a30; --epr-category-label-bg-color:#211a30; --epr-text-color:#f5f1ff; --epr-search-input-bg-color:#30253f; --epr-search-input-text-color:#f5f1ff; --epr-search-input-placeholder-color:#b8aecb; --epr-hover-bg-color:#38294d; --epr-focus-bg-color:#38294d; --epr-category-icon-active-color:#d7c3ff; }
        :global(html.dark-mode) .dm-tool-button { color:#d7c3ff; border-color:#443754; background:#211a30; }
        :global(html.dark-mode) .dm-tool-button:hover { color:#fff; background:#38294d; }
        :global(html.dark-mode) .drift-secondary-button { color:#f7f4ff; border-color:rgba(255,255,255,.13); background:rgba(255,255,255,.06); }
        :global(html.dark-mode) .drift-muted { color:rgba(255,255,255,.28); border-color:rgba(255,255,255,.06); }
        @media(max-width:1023px){ .drift-messenger { width:100%; } .dm-compose-area { background:rgba(247,245,252,.98); backdrop-filter:blur(14px); } :global(html.dark-mode) .dm-compose-area { background:rgba(16,13,32,.98); } .dm-composer { font-size:16px; } }
      `}</style>
    </main>
  );
}
