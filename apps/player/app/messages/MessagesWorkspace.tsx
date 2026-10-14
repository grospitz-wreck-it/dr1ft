"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Search, SquarePen, Users, UserRoundPlus, Send, Sparkles, ChevronLeft } from "lucide-react";

type Contact = { id: string; display_name: string; handle: string; isDue: boolean };
type GroupChat = { id: string; title: string };
type Share = {
  id: string;
  created_at: string;
  senderName: string;
  senderSeed: string | null;
  text: string;
  mediaUrl: string | null;
  postId: string;
};

export default function MessagesWorkspace({
  contacts,
  groupChats,
  shares,
}: {
  contacts: Contact[];
  groupChats: GroupChat[];
  shares: Share[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [showContacts, setShowContacts] = useState(true);

  const filteredContacts = useMemo(() => contacts.filter((contact) => {
    const matchesQuery = `${contact.display_name} ${contact.handle}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (filter === "all" || contact.isDue);
  }), [contacts, query, filter]);

  const selectedContact = contacts.find((contact) => contact.id === selected);
  const selectedGroup = groupChats.find((chat) => chat.id === selected);

  return (
    <main className="drift-messenger min-h-[calc(100dvh-4rem)] overflow-hidden rounded-[28px] border border-white/10 text-white shadow-2xl shadow-violet-950/20">
      <div className="grid min-h-[min(820px,calc(100dvh-5rem))] grid-cols-1 lg:grid-cols-[minmax(280px,32%)_minmax(0,1fr)]">
        <aside className={`drift-messenger-list border-b border-white/10 lg:border-b-0 lg:border-r ${!showContacts ? "hidden lg:block" : ""}`}>
          <div className="flex items-center justify-between gap-3 border-b border-white/[.07] px-5 py-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-cyan-200/70">Dein Space</p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">Nachrichten</h1>
            </div>
            <button onClick={() => { setSelected(null); setShowContacts(true); }} className="drift-gradient-button inline-flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-3 text-xs font-semibold shadow-lg shadow-violet-900/30">
              <SquarePen className="h-4 w-4" /><span className="hidden sm:inline">Neue Nachricht</span><span className="sm:hidden">Neu</span>
            </button>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
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
                <button key={contact.id} onClick={() => { setSelected(contact.id); setShowContacts(false); }} className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${selected === contact.id ? "border-cyan-300/25 bg-gradient-to-r from-fuchsia-500/15 via-violet-500/10 to-cyan-400/10" : "border-transparent hover:border-white/10 hover:bg-white/[.045]"}`}>
                  <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-gradient-to-br from-fuchsia-500/30 via-violet-500/25 to-cyan-400/25 text-sm font-bold ring-1 ring-white/10">{contact.display_name.slice(0, 1).toUpperCase()}{contact.isDue && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#151026] bg-pink-400 shadow-[0_0_12px_rgba(236,72,153,.8)]" />}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white/90">{contact.display_name}</span><span className="mt-1 block truncate text-xs text-white/40">{contact.handle}</span></span>
                  <MessageCircle className="h-4 w-4 shrink-0 text-white/25 group-hover:text-cyan-200" />
                </button>
              ))}
              {filteredContacts.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-center text-xs leading-5 text-white/40">{filter === "unread" ? "Keine ungelesenen Nachrichten." : "Keine passenden Kontakte gefunden."}</div>}
            </div>

            {groupChats.length > 0 && <div className="space-y-2 pt-2">
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[.2em] text-white/35">Gruppenchats</p>
              {groupChats.map((chat) => <button key={chat.id} onClick={() => { setSelected(chat.id); setShowContacts(false); }} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${selected === chat.id ? "border-cyan-300/25 bg-white/[.08]" : "border-transparent hover:border-white/10 hover:bg-white/[.045]"}`}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-cyan-300/10 text-cyan-200"><Users className="h-5 w-5" /></span><span className="min-w-0 flex-1 truncate text-sm font-medium">{chat.title}</span></button>)}
            </div>}

            {shares.length > 0 && <div className="space-y-2 pt-2">
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[.2em] text-white/35">Mit dir geteilt</p>
              {shares.slice(0, 4).map((share) => <a key={share.id} href={`/feed#post-${share.postId}`} className="flex items-center gap-3 rounded-2xl border border-white/[.06] bg-white/[.025] p-3 transition hover:bg-white/[.06]"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-violet-200"><Send className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{share.senderName}</span><span className="mt-1 block truncate text-xs text-white/40">{share.text}</span></span></a>)}
            </div>}
          </div>
        </aside>

        <section className={`drift-messenger-chat relative flex min-h-[68vh] flex-col ${showContacts ? "hidden lg:flex" : "flex"}`}>
          <header className="flex h-[74px] shrink-0 items-center justify-between border-b border-white/[.07] px-5 sm:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => setShowContacts(true)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/60 hover:bg-white/[.07] lg:hidden" aria-label="Zur Kontaktliste"><ChevronLeft className="h-5 w-5" /></button>
              <div className="min-w-0"><p className="truncate text-base font-bold">{selectedContact?.display_name || selectedGroup?.title || "Nachrichten"}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[.17em] text-white/30">{selectedContact ? "Direktnachricht" : selectedGroup ? "Klassengruppe" : "Dein DR1FT-Postfach"}</p></div>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/20 to-cyan-400/10 text-cyan-100"><Sparkles className="h-4 w-4" /></span>
          </header>

          {selectedContact ? <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="drift-orb drift-orb-top" /><div className="drift-orb drift-orb-bottom" />
            <div className="relative mb-7 grid h-28 w-28 place-items-center rounded-[34px] border border-white/15 bg-gradient-to-br from-fuchsia-500/20 via-violet-500/15 to-cyan-400/20 shadow-[0_0_60px_rgba(139,92,246,.17)]"><MessageCircle className="h-12 w-12 text-cyan-100" /><span className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-pink-400 shadow-[0_0_20px_rgba(236,72,153,.9)]" /></div>
            <h2 className="relative text-2xl font-bold tracking-tight">Unterhaltung öffnen</h2>
            <p className="relative mt-3 max-w-sm text-sm leading-6 text-white/55">Öffne den bestehenden Chat mit {selectedContact.display_name}, um den bisherigen Gesprächsverlauf fortzusetzen.</p>
            <a href={`/messages/${selectedContact.id}`} className="drift-gradient-button relative mt-7 inline-flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold shadow-lg shadow-violet-950/30"><MessageCircle className="h-4 w-4" /> Chat öffnen</a>
          </div> : selectedGroup ? <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-12 text-center"><div className="drift-orb drift-orb-top" /><div className="relative mb-6 grid h-24 w-24 place-items-center rounded-[30px] border border-white/15 bg-cyan-300/10 text-cyan-100"><Users className="h-10 w-10" /></div><h2 className="relative text-2xl font-bold">Gruppenchat öffnen</h2><p className="relative mt-3 max-w-sm text-sm leading-6 text-white/55">Setze das Gespräch mit deiner Klasse fort.</p><a href={`/group-chat/${selectedGroup.id}`} className="drift-gradient-button relative mt-7 inline-flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold"><Users className="h-4 w-4" /> Gruppenchat öffnen</a></div> : <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-14 text-center">
            <div className="drift-orb drift-orb-top" /><div className="drift-orb drift-orb-bottom" />
            <div className="relative mb-7 grid h-36 w-36 place-items-center rounded-[42px] border border-white/15 bg-gradient-to-br from-fuchsia-500/15 via-violet-500/15 to-cyan-400/15 shadow-[0_0_90px_rgba(124,58,237,.15)]"><MessageCircle className="h-16 w-16 text-violet-200" /><span className="absolute right-5 top-5 h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,.9)]" /><span className="absolute bottom-5 left-5 h-2.5 w-2.5 rounded-full bg-pink-400 shadow-[0_0_18px_rgba(236,72,153,.9)]" /></div>
            <p className="relative text-[10px] font-bold uppercase tracking-[.25em] text-cyan-200/70">Dein Chat-Space</p><h2 className="relative mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Noch niemand hier?</h2><p className="relative mt-3 max-w-sm text-sm leading-6 text-white/55 sm:text-base">Wähle einen Kontakt aus oder starte eine neue Unterhaltung.</p>
            <button onClick={() => { setShowContacts(true); document.getElementById("contact-search")?.focus(); }} className="drift-gradient-button relative mt-7 inline-flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold shadow-lg shadow-violet-950/30"><UserRoundPlus className="h-4 w-4" /> Kontakt auswählen</button>
          </div>}
          <footer className="border-t border-white/[.06] px-5 py-3 text-center text-[10px] text-white/25">DR1FT · Gespräche deiner Klasse</footer>
        </section>
      </div>
      <style jsx>{`
        .drift-messenger { background: linear-gradient(135deg, #110d20 0%, #17102c 52%, #100d20 100%); }
        .drift-messenger-list { background: linear-gradient(180deg, rgba(25,17,45,.98), rgba(16,13,31,.98)); }
        .drift-messenger-chat { background: radial-gradient(ellipse at 80% 0%, rgba(91,33,182,.17), transparent 42%), #100d20; }
        .drift-gradient-button { color: white; background: linear-gradient(110deg, #a21caf, #6d28d9 52%, #2563eb); }
        .drift-orb { position:absolute; width:16rem; height:16rem; border-radius:9999px; pointer-events:none; filter:blur(42px); opacity:.14; }
        .drift-orb-top { right:-7rem; top:-7rem; background:#2563eb; }
        .drift-orb-bottom { left:-8rem; bottom:-8rem; background:#a21caf; }
        @media(min-width:1024px){ .drift-messenger { min-height:calc(100dvh - 4rem); } }
      `}</style>
    </main>
  );
}
