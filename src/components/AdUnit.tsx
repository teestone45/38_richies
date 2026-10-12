"use client";

import { useEffect, useRef } from "react";

type AdUnitProps = {
  /** AdSense ad slot ID. Defaults to the "38 RICHIES" responsive display unit. */
  slot?: string;
  format?: string;
  fullWidthResponsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Renders a Google AdSense ad unit. The adsbygoogle loader script itself is
 * loaded once globally in the root layout (see components/AdSense.tsx); this
 * component only needs to render the <ins> tag and push it for display.
 */
export default function AdUnit({
  slot = "2849159575",
  format = "auto",
  fullWidthResponsive = true,
  className,
  style = { display: "block" },
}: AdUnitProps) {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense script may not be ready yet (e.g. blocked by an ad blocker); ignore.
    }
  }, []);

  return (
    <ins
      ref={insRef}
      className={`adsbygoogle${className ? ` ${className}` : ""}`}
      style={style}
      data-ad-client="ca-pub-3212823299590438"
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
    />
  );
}
