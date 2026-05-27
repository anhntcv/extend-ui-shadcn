"use client"

import { LiquidMetal } from "@paper-design/shaders-react"
import { useTheme } from "next-themes"

export function RootLiquidLogo() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== "light"

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative -mb-12 h-44 w-full overflow-hidden sm:-mb-14 sm:h-52 md:-mb-16 md:h-60"
    >
      <LiquidMetal
        width="100%"
        height="100%"
        image="/extend-logo.svg"
        colorBack="#00000000"
        colorTint="#ffffff"
        shape="none"
        repetition={2.8}
        softness={0.16}
        shiftRed={0.26}
        shiftBlue={0.32}
        distortion={0.08}
        contour={0.48}
        angle={68}
        speed={0.72}
        scale={0.72}
        fit="contain"
        maxPixelCount={900000}
        className="mx-auto h-full w-full max-w-[560px] [mask-image:linear-gradient(to_bottom,transparent_0%,black_14%,black_50%,rgba(0,0,0,0.52)_66%,rgba(0,0,0,0.12)_80%,transparent_92%)] opacity-95 [filter:contrast(1.18)_brightness(0.9)]"
      />
    </div>
  )
}
