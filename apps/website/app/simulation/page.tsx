"use client";
// apps/website/app/simulation/page.tsx
//
// Bewusst FESTE Demo-Daten, keine Live-Abfrage der Produktions-DB —
// eine öffentliche Marketing-Seite sollte keine echten Schul-/Klassen-
// Inhalte zeigen, auch wenn die Inhalte selbst harmlos wären.

import { useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { SiteNav, SiteFooter } from "../../components/SiteNav";

const DEMO_POSTS = [
  {
    id: "demo-1",
    author: "Lena kocht",
    handle: "@lena_kocht",
    body: "Heute gab's bei mir Pasta mit selbstgemachter Tomatensauce 🍝",
    likes: 63,
    signal: false,
  },
  {
    id: "demo-2",
    author: "NewsBlitz24",
    handle: "@newsblitz24",
    body: "🚨 SCHOCK: Wissenschaftler bestätigen geheime Funktion in jedem neuen Smartphone! Über 10.000 Likes in einer Stunde — die Wahrheit, die DIR verschwiegen wird!",
    likes: 847,
    signal: true,
    techniques: ["Künstliche Dringlichkeit", "Berufung auf unbenannte Autorität"],
  },
];

export default function SimulationPage() {
  const [revealed, setRevealed] = useState<string | null>(null);

  return (
    <>
      <SiteNav />
      <section className="max-w-md mx-auto px-6 py-16">
        <h1 className="font-display text-2xl font-bold mb-2 text-center">Simulation</h1>
        <p className="text-ash text-sm text-center mb-8">
          So sieht ein Ausschnitt aus dem Feed aus. Tippe auf den zweiten Post,
          um die Analyse-Ansicht zu sehen, die Schüler:innen nach einer
          abgeschlossenen Mission bekommen.
        </p>

        <div className="space-y-4">
          {DEMO_POSTS.map((post) => (
            <button
              key={post.id}
              onClick={() => post.signal && setRevealed(post.id)}
              className="block w-full text-left bg-subtle border border-border rounded-xl p-4"
            >
              <p className="text-sm font-medium">{post.author} <span className="text-ash font-normal">{post.handle}</span></p>
              <p className="text-sm mt-2 leading-relaxed">{post.body}</p>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-ash text-sm">
                <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {post.likes}</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> 12</span>
              </div>
              {post.signal && (
                <p className="text-xs text-ink/50 mt-2">Zum Analysieren antippen →</p>
              )}
            </button>
          ))}
        </div>

        {revealed && (
          <div className="fixed inset-0 bg-ink/90 flex items-center justify-center p-6 z-20">
            <div className="bg-ink border border-white/10 rounded-xl p-6 max-w-sm w-full">
              <p className="text-marker text-xs font-mono uppercase tracking-widest mb-2">Analyse</p>
              <h2 className="font-display text-white text-lg mb-3">Was hier gerade passiert ist</h2>
              <p className="text-white/80 text-sm leading-relaxed mb-4">
                Dieser Post nutzt künstliche Dringlichkeit und beruft sich auf eine
                nicht genannte Autorität ("Wissenschaftler") — beides typische
                Manipulationsmuster.
              </p>
              <div className="flex flex-wrap gap-2 mb-5">
                {DEMO_POSTS[1].techniques!.map((t) => (
                  <span key={t} className="bg-marker text-ink text-xs font-mono px-2 py-1 rounded">{t}</span>
                ))}
              </div>
              <button
                onClick={() => setRevealed(null)}
                className="w-full bg-marker text-ink font-medium py-2.5 rounded-lg text-sm"
              >
                Schließen
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-ash text-sm mt-10">
          Das ist nur ein Ausschnitt.{" "}
          <Link href="/preise" className="text-ink underline">
            Für die volle Erfahrung eine Schullizenz anfragen.
          </Link>
        </p>
      </section>
      <SiteFooter />
    </>
  );
}
