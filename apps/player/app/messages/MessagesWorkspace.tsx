"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Search, SquarePen, Users, UserRoundPlus, Send, ChevronLeft } from "lucide-react";

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

function ChatDoodle({ large = false }: { large?: boolean }) { return <div aria-hidden="true" className={`chat-doodle ${large ? "h-64 w-72" : "h-20 w-24"}`}><img src="/branding/chat.webp" alt="" className="chat-doodle-main" /></div>; }

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
    <main className="drift-messenger relative -mt-4 flex h-[calc(100dvh-2rem)] min-h-[620px] flex-col overflow-hidden rounded-[28px] border shadow-2xl">
      <img src="/branding/bg-neon-circle.webp" alt="" aria-hidden="true" className="drift-neon-background pointer-events-none absolute bottom-0 right-0 z-0 w-[min(38vw,34rem)] max-w-none" />
      <div className="relative z-[1] grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(280px,32%)_minmax(0,1fr)]">
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
            <span aria-hidden="true" className="h-10 w-10" />
          </header>

          {selectedContact ? <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="drift-orb drift-orb-top" /><div className="drift-orb drift-orb-bottom" />
            <ChatDoodle />
            <h2 className="relative text-2xl font-bold tracking-tight">Unterhaltung öffnen</h2>
            <p className="relative mt-3 max-w-sm text-sm leading-6 text-white/55">Öffne den bestehenden Chat mit {selectedContact.display_name}, um den bisherigen Gesprächsverlauf fortzusetzen.</p>
            <a href={`/messages/${selectedContact.id}`} className="drift-gradient-button relative mt-7 inline-flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold shadow-lg shadow-violet-950/30"><MessageCircle className="h-4 w-4" /> Chat öffnen</a>
          </div> : selectedGroup ? <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-12 text-center"><div className="drift-orb drift-orb-top" /><ChatDoodle group /><h2 className="relative text-2xl font-bold">Gruppenchat öffnen</h2><p className="relative mt-3 max-w-sm text-sm leading-6 text-white/55">Setze das Gespräch mit deiner Klasse fort.</p><a href={`/group-chat/${selectedGroup.id}`} className="drift-gradient-button relative mt-7 inline-flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold"><Users className="h-4 w-4" /> Gruppenchat öffnen</a></div> : <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-14 text-center">
            <div className="drift-orb drift-orb-top" /><div className="drift-orb drift-orb-bottom" />
            <ChatDoodle large />
            
            <button onClick={() => { setShowContacts(true); document.getElementById("contact-search")?.focus(); }} className="relative mt-7 inline-flex items-center gap-2 rounded-2xl border px-5 py-3.5 text-sm font-semibold drift-secondary-button"><UserRoundPlus className="h-4 w-4" /> Kontakt auswählen</button>
          </div>}
          <footer className="border-t px-5 py-3 text-center text-[10px] drift-muted">DR1FT · Gespräche deiner Klasse</footer>
        </section>
      </div>
      <button onClick={() => { setSelected(null); setShowContacts(true); document.getElementById("contact-search")?.focus(); }} className="drift-gradient-button drift-message-notch absolute bottom-0 right-0 z-20 inline-flex items-center gap-2 rounded-tl-2xl rounded-br-[26px] px-7 py-5 text-sm font-semibold" aria-label="Neue Nachricht schreiben"><SquarePen className="h-4 w-4" /><span>Neue Nachricht</span></button>
      <style jsx>{`
        .chat-doodle { position:relative; isolation:isolate; margin-inline:auto; }
        .chat-doodle-main { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; filter:drop-shadow(0 8px 20px rgba(128,35,255,.24)); }
        .chat-doodle-smiley { position:absolute; right:0; bottom:0; width:52%; height:66%; object-fit:contain; filter:drop-shadow(0 8px 18px rgba(0,190,255,.24)); }
        .drift-neon-background { opacity:.55; mix-blend-mode:multiply; }\n        .drift-message-notch { box-shadow:-1px -1px 0 var(--drift-border); }\n        .drift-message-notch:before { content:""; position:absolute; width:26px; height:26px; left:-26px; bottom:0; background:radial-gradient(circle at 0 0,transparent 26px,var(--drift-surface) 27px); }\n        .drift-message-notch:after { content:""; position:absolute; width:26px; height:26px; right:0; top:-26px; background:radial-gradient(circle at 100% 0,transparent 26px,var(--drift-surface) 27px); }
        :global(html.dark-mode) .drift-neon-background { opacity:.38; mix-blend-mode:screen; }
        .drift-messenger { color:var(--drift-ink); background:var(--drift-surface); border-color:var(--drift-border); }
        :global(html:not(.dark-mode)) .drift-messenger [class*="text-white"] { color:#756d8e !important; }
        :global(html:not(.dark-mode)) .drift-messenger .drift-gradient-button, :global(html:not(.dark-mode)) .drift-messenger .drift-gradient-button [class*="text-white"] { color:#fff !important; }
        :global(html:not(.dark-mode)) .drift-messenger [class*="bg-white/"] { background-color:rgba(39,33,61,.035) !important; }
        :global(html:not(.dark-mode)) .drift-messenger [class*="border-white/"] { border-color:var(--drift-border) !important; }
        :global(html:not(.dark-mode)) .drift-messenger input::placeholder { color:var(--drift-ink-soft) !important; opacity:.75; }
        .drift-messenger-list { background:var(--drift-surface-soft); border-color:var(--drift-border); }
        .drift-messenger-chat { background:radial-gradient(ellipse at 84% 8%,rgba(99,102,241,.16),transparent 38%),radial-gradient(ellipse at 18% 100%,rgba(217,70,239,.10),transparent 34%),#fbf9ff; }
        .drift-gradient-button { color:#fff; background:linear-gradient(110deg,#c026d3,#7c3aed 52%,#2563eb); }
        .drift-secondary-button { border-color:var(--drift-border); background:var(--drift-surface-soft); color:var(--drift-ink); }
        .drift-muted { color:var(--drift-ink-soft); border-color:var(--drift-border); }
        .drift-orb { position:absolute; width:16rem; height:16rem; border-radius:9999px; pointer-events:none; filter:blur(42px); opacity:.14; } .drift-orb-top { right:-7rem; top:-7rem; background:#2563eb; } .drift-orb-bottom { left:-8rem; bottom:-8rem; background:#a21caf; }
        :global(html.dark-mode) .drift-messenger { color:#f7f4ff; background:linear-gradient(135deg,#110d20 0%,#17102c 52%,#100d20 100%); border-color:rgba(255,255,255,.10); }
        :global(html.dark-mode) .drift-messenger-list { background:linear-gradient(180deg,rgba(25,17,45,.98),rgba(16,13,31,.98)); border-color:rgba(255,255,255,.10); }
        :global(html.dark-mode) .drift-messenger-chat { background:radial-gradient(ellipse at 80% 0%,rgba(91,33,182,.17),transparent 42%),#100d20; }
        :global(html.dark-mode) .drift-secondary-button { color:#f7f4ff; border-color:rgba(255,255,255,.13); background:rgba(255,255,255,.06); }
        :global(html.dark-mode) .drift-muted { color:rgba(255,255,255,.28); border-color:rgba(255,255,255,.06); }
        @media(max-width:1023px){ .drift-messenger { height:calc(100dvh - 9rem); min-height:560px; } }
      `}</style>
    </main>
  );
}
