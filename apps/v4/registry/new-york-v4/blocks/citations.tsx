"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { PDFViewer, type PDFViewerHandle } from "@/components/ui/pdf-viewer"
import { PdfBlockResizableShell } from "@/components/pdf-block-resizable-shell"
import { ScrollArea } from "@/registry/new-york-v4/ui/scroll-area"

type Point = { x: number; y: number }
type Citation = {
  id: string
  description: string
  value: string
  page: number
  polygon: Point[]
}
type HighlightArea = {
  left: number
  top: number
  width: number
  height: number
}

const ANNOTATION_PAGE_WIDTH = 792
const ANNOTATION_PAGE_HEIGHT = 612
const CITATIONS: Citation[] = [
  {
    id: "title",
    description: "Paper title extracted from the first page heading.",
    value: "Attention Is All You Need",
    page: 1,
    polygon: [
      { x: 246, y: 188 },
      { x: 566, y: 188 },
      { x: 566, y: 222 },
      { x: 246, y: 222 },
    ],
  },
  {
    id: "authors",
    description: "Authors listed beneath the paper title.",
    value: "Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser",
    page: 1,
    polygon: [
      { x: 92, y: 206 },
      { x: 698, y: 206 },
      { x: 698, y: 270 },
      { x: 92, y: 270 },
    ],
  },
  {
    id: "abstract",
    description: "Central model claim from the abstract.",
    value: "The Transformer avoids recurrence and convolutions.",
    page: 1,
    polygon: [
      { x: 108, y: 346 },
      { x: 692, y: 346 },
      { x: 692, y: 414 },
      { x: 108, y: 414 },
    ],
  },
]

function convertPolygonToHighlightArea(polygon: Point[]): HighlightArea {
  const xValues = polygon.map((point) => point.x)
  const yValues = polygon.map((point) => point.y)
  const left = Math.min(...xValues)
  const right = Math.max(...xValues)
  const top = Math.min(...yValues)
  const bottom = Math.max(...yValues)

  return {
    left: (left / ANNOTATION_PAGE_WIDTH) * 100,
    top: (top / ANNOTATION_PAGE_HEIGHT) * 100,
    width: ((right - left) / ANNOTATION_PAGE_WIDTH) * 100,
    height: ((bottom - top) / ANNOTATION_PAGE_HEIGHT) * 100,
  }
}

function CitationHighlight({ citation }: { citation: Citation }) {
  const highlight = convertPolygonToHighlightArea(citation.polygon)

  return (
    <div
      className="pointer-events-none absolute z-10 rounded-[3px] border border-blue-500/70 bg-blue-500/12 shadow-[0_4px_16px_rgb(59_130_246_/_12%)]"
      style={{
        left: `${highlight.left}%`,
        top: `${highlight.top}%`,
        width: `${highlight.width}%`,
        height: `${highlight.height}%`,
      }}
    />
  )
}

export function CitationsBlock({ file }: { file?: string }) {
  const [activeCitationId, setActiveCitationId] = React.useState(
    CITATIONS[0].id
  )
  const viewerRef = React.useRef<PDFViewerHandle>(null)
  const activeCitation =
    CITATIONS.find((citation) => citation.id === activeCitationId) ??
    CITATIONS[0]

  const focusCitation = React.useCallback((citation: Citation) => {
    setActiveCitationId(citation.id)
    viewerRef.current?.scrollToPageArea(
      citation.page,
      convertPolygonToHighlightArea(citation.polygon)
    )
  }, [])

  return (
    <PdfBlockResizableShell
      autoSaveId="pdf-block-citations"
      left={
        <PDFViewer
          ref={viewerRef}
          file={file}
          defaultZoom={0.75}
          renderPageOverlay={({ pageNumber }) =>
            activeCitation.page === pageNumber ? (
              <CitationHighlight citation={activeCitation} />
            ) : null
          }
        />
      }
      right={
        <aside className="min-h-0 bg-background">
          <ScrollArea className="h-full" scrollFade>
            <div className="space-y-2 p-3">
              {CITATIONS.map((citation) => {
                const isActive = citation.id === activeCitation.id

                return (
                  <button
                    key={citation.id}
                    type="button"
                    onClick={() => focusCitation(citation)}
                    onFocus={() => focusCitation(citation)}
                    onMouseEnter={() => focusCitation(citation)}
                    className={cn(
                      "w-full rounded-lg border bg-background p-3 text-left transition-[border-color,background-color,box-shadow] hover:border-blue-500/50 hover:bg-blue-500/5 focus-visible:border-blue-500/60 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:outline-none",
                      isActive &&
                        "border-blue-500/60 bg-blue-500/5 shadow-[0_0_0_1px_rgb(59_130_246_/_8%)]"
                    )}
                  >
                    <div className="mb-3 flex min-h-8 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {citation.id}
                        </div>
                        <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {citation.description}
                        </div>
                      </div>
                      <div className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        p. {citation.page}
                      </div>
                    </div>
                    <div className="rounded-md border bg-muted/30 p-2">
                      <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                        Actual output
                      </div>
                      <div className="min-h-7 rounded-md bg-background px-2 py-1.5 text-sm">
                        {citation.value}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </aside>
      }
    />
  )
}
