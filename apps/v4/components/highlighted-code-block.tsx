"use client"

import * as React from "react"
import { File, Virtualizer } from "@pierre/diffs/react"

import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/copy-button"

const CODE_FILE_THEME = {
  "--diffs-light-bg": "var(--color-code)",
  "--diffs-dark-bg": "var(--color-code)",
  "--diffs-light": "var(--color-code-foreground)",
  "--diffs-dark": "var(--color-code-foreground)",
  "--diffs-bg-context-override": "var(--color-code)",
  "--diffs-bg-context-gutter-override": "var(--color-code)",
  "--diffs-bg-buffer-override": "var(--color-code)",
  "--diffs-fg-number-override": "var(--color-muted-foreground)",
  "--diffs-font-size": "0.8rem",
  "--diffs-line-height": "1.625",
} as React.CSSProperties

function getCodeCacheKey(code: string) {
  let hash = 0

  for (let index = 0; index < code.length; index += 1) {
    hash = (hash * 31 + code.charCodeAt(index)) | 0
  }

  return `component.tsx:${code.length}:${hash >>> 0}`
}

export function HighlightedCodeBlock({
  code,
  className,
  maxHeightClassName = "max-h-[34rem]",
  previewLines,
  showCopy = true,
}: {
  code: string
  className?: string
  maxHeightClassName?: string
  previewLines?: number
  showCopy?: boolean
}) {
  const [isVisible, setIsVisible] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const visibleCode = React.useMemo(() => {
    if (!previewLines) {
      return code
    }

    return code.split("\n").slice(0, previewLines).join("\n")
  }, [code, previewLines])
  const file = React.useMemo(
    () => ({
      name: "component.tsx",
      contents: visibleCode,
      lang: "tsx" as const,
      cacheKey: getCodeCacheKey(visibleCode),
    }),
    [visibleCode]
  )

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (!("IntersectionObserver" in window)) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "800px 0px" }
    )

    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      data-rehype-pretty-code-figure
      className={cn(
        "relative m-0! overflow-hidden rounded-lg border bg-code text-code-foreground",
        className
      )}
    >
      {showCopy && <CopyButton value={code} />}
      {isVisible ? (
        <Virtualizer
          className={cn(
            "no-scrollbar min-w-0 overflow-x-auto overflow-y-auto overscroll-x-contain overscroll-y-auto outline-none",
            maxHeightClassName
          )}
          contentClassName="min-w-full"
        >
          <File
            file={file}
            className="block min-w-full"
            style={CODE_FILE_THEME}
            options={{
              disableFileHeader: true,
              overflow: "scroll",
              theme: {
                light: "pierre-light",
                dark: "pierre-dark",
              },
              themeType: "system",
            }}
          />
        </Virtualizer>
      ) : (
        <div className={cn("min-h-72 bg-code", maxHeightClassName)} />
      )}
    </div>
  )
}
