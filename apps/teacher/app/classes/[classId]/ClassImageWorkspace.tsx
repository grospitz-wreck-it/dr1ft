"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import ClassImageEditor from "./ClassImageEditor";

type Props = {
  classId: string;
  className: string;
  gradeLevel: number | null;
  schoolYear: string;
  heroImageUrl: string | null;
  heroPositionX: number;
  heroPositionY: number;
  heroZoom: number;
  classImagePath: string | null;
  classImageUrl: string | null;
  classImagePositionX: number;
  classImagePositionY: number;
  classImageZoom: number;
  canEditClassImage: boolean;
};

export default function ClassImageWorkspace({
  classId,
  className,
  gradeLevel,
  schoolYear,
  heroImageUrl,
  heroPositionX,
  heroPositionY,
  heroZoom,
  classImagePath,
  classImageUrl,
  classImagePositionX,
  classImagePositionY,
  classImageZoom,
  canEditClassImage,
}: Props) {
  const [imageEditorOpen, setImageEditorOpen] = useState(false);

  return (
    <>
      <section className="group relative mt-4 overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-xl">
        {heroImageUrl ? (
          <img
            src={heroImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              objectPosition: `${heroPositionX}% ${heroPositionY}%`,
              transform: `scale(${heroZoom})`,
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(99,102,241,.35),transparent_38%),radial-gradient(circle_at_15%_85%,rgba(168,85,247,.22),transparent_34%)]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/55 to-slate-950/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/20" />

        <div className="relative min-h-[300px] p-6 sm:p-8">
          <div className="flex min-h-[250px] flex-col justify-between">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
                  DR1FT Teacher
                </p>

                {classImageUrl && (
                  <p className="mt-2 text-xs text-white/55">
                    Klassenbild
                  </p>
                )}

                {!classImageUrl && heroImageUrl && (
                  <p className="mt-2 text-xs text-white/55">
                    Schulbild
                  </p>
                )}
              </div>

              {canEditClassImage && (
                <button
                  type="button"
                  aria-label={
                    classImagePath
                      ? "Klassenbild bearbeiten"
                      : "Klassenbild hinzufügen"
                  }
                  title={
                    classImagePath
                      ? "Klassenbild bearbeiten"
                      : "Klassenbild hinzufügen"
                  }
                  onClick={() => setImageEditorOpen(true)}
                  className="absolute right-6 top-6 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-black/30 text-white opacity-0 shadow-lg backdrop-blur transition-all duration-200 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/45"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>

            <div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                {className}
              </h1>

              <p className="mt-2 text-sm text-white/55">
                {gradeLevel ? `Jahrgang ${gradeLevel}` : "Jahrgang —"}{" "}
                · Schuljahr {schoolYear}
              </p>
            </div>
          </div>
        </div>
      </section>

      {imageEditorOpen && canEditClassImage && (
        <ClassImageEditor
          classId={classId}
          imagePath={classImagePath}
          imageUrl={classImageUrl}
          positionX={classImagePositionX}
          positionY={classImagePositionY}
          zoom={classImageZoom}
          onClose={() => setImageEditorOpen(false)}
        />
      )}
    </>
  );
}
