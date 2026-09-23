"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const slides = [
  {
    src: "/hero/dr1ft-feed.svg",
    alt: "DR1FT simuliert einen Social-Media-Feed",
    label: "Feed erleben",
  },
  {
    src: "/hero/dr1ft-school.svg",
    alt: "DR1FT für Unterricht und Schulen",
    label: "Im Unterricht einsetzen",
  },
  {
    src: "/hero/dr1ft-reflection.svg",
    alt: "DR1FT verbindet Feed-Erlebnis und Reflexion",
    label: "Reflektieren lernen",
  },
];

export function HeroCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-3xl border border-border bg-subtle shadow-[0_24px_70px_rgba(20,24,43,0.12)]">
        <div className="relative aspect-[16/10]">
          {slides.map((slide, index) => (
            <Image
              key={slide.src}
              src={slide.src}
              alt={slide.alt}
              fill
              priority={index === 0}
              className={`object-cover transition-opacity duration-700 ${index === active ? "opacity-100" : "opacity-0"}`}
              sizes="(max-width: 1024px) 100vw, 48vw"
            />
          ))}
          <div className="absolute left-5 bottom-5 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-xs font-semibold text-ink">
            {slides[active].label}
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-1.5 mt-4" aria-label="Hero-Bilder">
        {slides.map((slide, index) => (
          <button
            key={slide.src}
            type="button"
            aria-label={`Hero-Bild ${index + 1}`}
            aria-current={index === active}
            onClick={() => setActive(index)}
            className={`h-1.5 rounded-full transition-all ${index === active ? "w-8 bg-ink" : "w-1.5 bg-border"}`}
          />
        ))}
      </div>
    </div>
  );
}
