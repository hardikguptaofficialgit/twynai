"use client";
import dynamic from "next/dynamic";

const GradientASCII = dynamic(() => import("./GradientASCII"), { ssr: false });

// Flat pastel tones only, no gradient overlay, no glow. Subtle so hero text stays readable.
export default function HeroAscii() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[0.6] [mask-image:linear-gradient(to_bottom,black_60%,transparent)]">
      <GradientASCII
        colors={["#a99fe0", "#a99fe0", "#9cc6e4"]}
        shape="horizon"
        lightMode
        glow={0}
        gradientOpacity={0}
        grain={0}
        glyphOpacity={0.8}
        cellSize={12}
        speed={0.5}
        flicker={0.3}
        mouseInteraction={false}
        clickEffect="none"
        dpr={1}
      />
    </div>
  );
}
