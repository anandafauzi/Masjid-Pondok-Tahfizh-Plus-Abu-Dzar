"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";

/**
 * Kanvas desain layar TV. Semua slide, overlay, dan running text dirender di
 * dalam ukuran tetap ini lalu diskalakan proporsional ke jendela browser.
 * Dengan begitu konten tidak pernah melebihi layar dan tidak ada bilah scroll.
 */
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

// Hindari peringatan useLayoutEffect saat dirender di server.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function TvViewport({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);

  useIsomorphicLayoutEffect(() => {
    const updateScale = () => {
      const scaleX = window.innerWidth / DESIGN_WIDTH;
      const scaleY = window.innerHeight / DESIGN_HEIGHT;
      setScale(Math.min(scaleX, scaleY));
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    window.addEventListener("orientationchange", updateScale);
    document.documentElement.classList.add("tv-viewport-active");

    return () => {
      window.removeEventListener("resize", updateScale);
      window.removeEventListener("orientationchange", updateScale);
      document.documentElement.classList.remove("tv-viewport-active");
    };
  }, []);

  return (
    <div className="tv-viewport-root">
      <div
        className="tv-viewport-stage"
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
