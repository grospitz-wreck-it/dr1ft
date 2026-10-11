// apps/player/app/feed/loading.tsx
// Branded loading state shown automatically while the feed server component loads.

export default function FeedLoading() {
  return (
    <main
      className="dr1ft-feed-loading flex min-h-[70vh] items-center justify-center overflow-hidden"
      role="status"
      aria-label="DR1FT wird geladen"
    >
      <div className="dr1ft-loader relative grid place-items-center">
        <div className="dr1ft-loader-track" aria-hidden="true" />
        <div className="dr1ft-loader-ring" aria-hidden="true" />
        <img
          src="/branding/drift-logo-transparent.png"
          alt="DR1FT"
          className="dr1ft-loader-logo"
          fetchPriority="high"
        />
      </div>
      <span className="sr-only">DR1FT wird geladen …</span>
      <style jsx>{`
        .dr1ft-feed-loading {
          min-height: max(70vh, 32rem);
          background:
            radial-gradient(ellipse at center, rgba(95, 39, 160, .12) 0%, rgba(20, 12, 42, .04) 42%, transparent 72%);
        }
        .dr1ft-loader {
          width: 10.5rem;
          height: 10.5rem;
          isolation: isolate;
        }
        .dr1ft-loader-track,
        .dr1ft-loader-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
        }
        .dr1ft-loader-track {
          border: 2px solid rgba(124, 58, 237, .17);
          box-shadow: 0 0 28px rgba(124, 58, 237, .08), inset 0 0 20px rgba(124, 58, 237, .04);
        }
        .dr1ft-loader-ring {
          background: conic-gradient(
            from 0deg,
            transparent 0deg 42deg,
            #812dff 62deg,
            #24d8ff 116deg,
            #5c7cff 150deg,
            transparent 174deg 222deg,
            #f044d8 246deg,
            #ff8bdc 290deg,
            transparent 318deg 360deg
          );
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px));
          mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px));
          filter: drop-shadow(0 0 5px rgba(85, 109, 255, .7)) drop-shadow(0 0 12px rgba(226, 63, 225, .3));
          animation: dr1ft-ring-spin 2.8s linear infinite;
        }
        .dr1ft-loader-logo {
          position: relative;
          z-index: 1;
          display: block;
          width: 4.5rem;
          height: 4.5rem;
          object-fit: contain;
          filter: drop-shadow(0 0 18px rgba(128, 70, 255, .24));
          animation: dr1ft-logo-breathe 2.2s ease-in-out infinite;
        }
        @keyframes dr1ft-ring-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes dr1ft-logo-breathe {
          0%, 100% { transform: scale(.96); opacity: .92; }
          50% { transform: scale(1.04); opacity: 1; }
        }
        @media (max-width: 640px) {
          .dr1ft-loader { width: 9rem; height: 9rem; }
          .dr1ft-loader-logo { width: 3.9rem; height: 3.9rem; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dr1ft-loader-ring,
          .dr1ft-loader-logo { animation: none; }
        }
      `}</style>
    </main>
  );
}
