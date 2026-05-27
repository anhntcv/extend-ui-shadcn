"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/copy-button"

const highlightedCodeCache = new Map<string, string>()

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
  const [html, setHtml] = React.useState<string | null>(null)
  const [isVisible, setIsVisible] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const visibleCode = React.useMemo(() => {
    if (!previewLines) {
      return code
    }

    return code.split("\n").slice(0, previewLines).join("\n")
  }, [code, previewLines])
  const cacheKey = React.useMemo(
    () => `${visibleCode}::${maxHeightClassName}::${showCopy}`,
    [maxHeightClassName, showCopy, visibleCode]
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

  React.useEffect(() => {
    let cancelled = false

    async function highlight() {
      if (!isVisible) return

      const cachedHtml = highlightedCodeCache.get(cacheKey)
      if (cachedHtml) {
        setHtml(cachedHtml)
        return
      }

      const { codeToHtml } = await import("shiki")
      const highlighted = await codeToHtml(visibleCode, {
        lang: "tsx",
        themes: {
          dark: "github-dark",
          light: "github-light-default",
        },
        transformers: [
          {
            pre(node) {
              node.properties["data-language"] = "tsx"
              node.properties["style"] = ""
              node.properties["class"] = cn(
                "no-scrollbar min-w-0 overflow-x-auto overflow-y-auto overscroll-x-contain overscroll-y-auto !bg-transparent px-4 py-3.5 outline-none has-[[data-line-numbers]]:px-0",
                showCopy && "pr-20",
                maxHeightClassName
              )
            },
            code(node) {
              node.properties["data-language"] = "tsx"
              node.properties["data-line-numbers"] = ""
            },
            line(node) {
              node.properties["data-line"] = ""
            },
          },
        ],
      })

      if (!cancelled) {
        highlightedCodeCache.set(cacheKey, highlighted)
        setHtml(highlighted)
      }
    }

    setHtml(null)
    void highlight()

    return () => {
      cancelled = true
    }
  }, [cacheKey, isVisible, maxHeightClassName, showCopy, visibleCode])

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
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre
          className={cn(
            "no-scrollbar min-w-0 overflow-x-auto overflow-y-auto overscroll-x-contain overscroll-y-auto px-4 py-3.5 text-[0.8rem] leading-relaxed outline-none has-[[data-line-numbers]]:px-0",
            showCopy && "pr-20",
            maxHeightClassName
          )}
        >
          <code>{visibleCode}</code>
        </pre>
      )}
    </div>
  )
}
