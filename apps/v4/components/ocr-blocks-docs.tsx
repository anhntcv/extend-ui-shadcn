"use client"

import * as React from "react"
import {
  Heading01Icon,
  Image01Icon,
  LeftToRightListBulletIcon,
  ParagraphIcon,
  Table01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PDFViewer, type PDFViewerHandle } from "@/components/ui/pdf-viewer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HighlightedCodeBlock } from "@/components/highlighted-code-block"
import { PdfBlockResizableShell } from "@/components/pdf-block-resizable-shell"

type Point = {
  x: number
  y: number
}

type OcrBlockType = "heading" | "paragraph" | "list" | "table" | "image"

type OcrBlock = {
  id: string
  type: OcrBlockType
  label: string
  text: string
  page: number
  confidence: number
  polygon: Point[]
}

type HighlightArea = {
  left: number
  top: number
  width: number
  height: number
}

const PDF_URL = "/samples/attention.pdf"
const ANNOTATION_PAGE_WIDTH = 792
const ANNOTATION_PAGE_HEIGHT = 612
const DEFAULT_ZOOM = 0.75
const BLOCK_STYLES: Record<
  OcrBlockType,
  {
    label: string
    icon: typeof Heading01Icon
    overlay: string
    mutedOverlay: string
    ring: string
    soft: string
    text: string
  }
> = {
  heading: {
    label: "Heading",
    icon: Heading01Icon,
    overlay:
      "border-violet-500/70 bg-violet-500/10 shadow-[0_4px_16px_rgb(139_92_246_/_12%)]",
    mutedOverlay: "border-violet-500/35 bg-violet-500/5",
    ring: "border-violet-500/60 bg-violet-500/5",
    soft: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
    text: "text-violet-600 dark:text-violet-300",
  },
  paragraph: {
    label: "Paragraph",
    icon: ParagraphIcon,
    overlay:
      "border-blue-500/70 bg-blue-500/10 shadow-[0_4px_16px_rgb(59_130_246_/_12%)]",
    mutedOverlay: "border-blue-500/35 bg-blue-500/5",
    ring: "border-blue-500/60 bg-blue-500/5",
    soft: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    text: "text-blue-600 dark:text-blue-300",
  },
  list: {
    label: "List",
    icon: LeftToRightListBulletIcon,
    overlay:
      "border-emerald-500/70 bg-emerald-500/10 shadow-[0_4px_16px_rgb(16_185_129_/_12%)]",
    mutedOverlay: "border-emerald-500/35 bg-emerald-500/5",
    ring: "border-emerald-500/60 bg-emerald-500/5",
    soft: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    text: "text-emerald-600 dark:text-emerald-300",
  },
  table: {
    label: "Table",
    icon: Table01Icon,
    overlay:
      "border-amber-500/70 bg-amber-500/10 shadow-[0_4px_16px_rgb(245_158_11_/_12%)]",
    mutedOverlay: "border-amber-500/35 bg-amber-500/5",
    ring: "border-amber-500/60 bg-amber-500/5",
    soft: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    text: "text-amber-700 dark:text-amber-300",
  },
  image: {
    label: "Image",
    icon: Image01Icon,
    overlay:
      "border-rose-500/70 bg-rose-500/10 shadow-[0_4px_16px_rgb(244_63_94_/_12%)]",
    mutedOverlay: "border-rose-500/35 bg-rose-500/5",
    ring: "border-rose-500/60 bg-rose-500/5",
    soft: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
    text: "text-rose-600 dark:text-rose-300",
  },
}

const OCR_BLOCKS: OcrBlock[] = [
  {
    id: "title",
    type: "heading",
    label: "Paper title",
    text: "Attention Is All You Need",
    page: 1,
    confidence: 0.99,
    polygon: [
      { x: 246, y: 188 },
      { x: 566, y: 188 },
      { x: 566, y: 222 },
      { x: 246, y: 222 },
    ],
  },
  {
    id: "author-grid",
    type: "paragraph",
    label: "Authors",
    text: "Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit...",
    page: 1,
    confidence: 0.96,
    polygon: [
      { x: 92, y: 206 },
      { x: 698, y: 206 },
      { x: 698, y: 270 },
      { x: 92, y: 270 },
    ],
  },
  {
    id: "abstract-heading",
    type: "heading",
    label: "Section heading",
    text: "Abstract",
    page: 1,
    confidence: 0.98,
    polygon: [
      { x: 360, y: 330 },
      { x: 434, y: 330 },
      { x: 434, y: 350 },
      { x: 360, y: 350 },
    ],
  },
  {
    id: "abstract-body",
    type: "paragraph",
    label: "Abstract body",
    text: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...",
    page: 1,
    confidence: 0.94,
    polygon: [
      { x: 108, y: 346 },
      { x: 692, y: 346 },
      { x: 692, y: 458 },
      { x: 108, y: 458 },
    ],
  },
  {
    id: "background-body",
    type: "paragraph",
    label: "Background text",
    text: "Recurrent neural networks, long short-term memory and gated recurrent neural networks...",
    page: 2,
    confidence: 0.92,
    polygon: [
      { x: 76, y: 74 },
      { x: 718, y: 74 },
      { x: 718, y: 184 },
      { x: 76, y: 184 },
    ],
  },
  {
    id: "attention-diagram",
    type: "image",
    label: "Architecture figure",
    text: "Transformer architecture diagram",
    page: 2,
    confidence: 0.89,
    polygon: [
      { x: 462, y: 250 },
      { x: 720, y: 250 },
      { x: 720, y: 602 },
      { x: 462, y: 602 },
    ],
  },
  {
    id: "comparison-table",
    type: "table",
    label: "Complexity table",
    text: "Layer type, complexity per layer, sequential operations, maximum path length",
    page: 6,
    confidence: 0.91,
    polygon: [
      { x: 52, y: 58 },
      { x: 740, y: 58 },
      { x: 740, y: 190 },
      { x: 52, y: 190 },
    ],
  },
  {
    id: "layer-list",
    type: "list",
    label: "Comparison criteria",
    text: "Total computational complexity, parallelizable computation, and maximum path length",
    page: 6,
    confidence: 0.88,
    polygon: [
      { x: 56, y: 440 },
      { x: 735, y: 440 },
      { x: 735, y: 548 },
      { x: 56, y: 548 },
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

function BlockOverlay({
  block,
  isActive,
}: {
  block: OcrBlock
  isActive: boolean
}) {
  const highlight = convertPolygonToHighlightArea(block.polygon)
  const style = BLOCK_STYLES[block.type]

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-10 rounded-[3px] border transition-[opacity,box-shadow]",
        isActive
          ? cn("opacity-100", style.overlay)
          : cn("opacity-55", style.mutedOverlay)
      )}
      style={{
        left: `${highlight.left}%`,
        top: `${highlight.top}%`,
        width: `${highlight.width}%`,
        height: `${highlight.height}%`,
      }}
    />
  )
}

function OcrBlocksPanel({
  activeBlockId,
  className,
  onBlockFocus,
}: {
  activeBlockId?: string
  className?: string
  onBlockFocus?: (block: OcrBlock) => void
}) {
  const [localActiveBlockId, setLocalActiveBlockId] = React.useState(
    activeBlockId ?? OCR_BLOCKS[0].id
  )
  const activeBlock =
    OCR_BLOCKS.find(
      (block) => block.id === (activeBlockId ?? localActiveBlockId)
    ) ?? OCR_BLOCKS[0]

  const focusBlock = React.useCallback(
    (block: OcrBlock) => {
      setLocalActiveBlockId(block.id)
      onBlockFocus?.(block)
    },
    [onBlockFocus]
  )

  return (
    <aside
      className={cn("flex h-[420px] min-h-0 flex-col bg-background", className)}
    >
      <ScrollArea className="min-h-0 flex-1" scrollFade>
        <div className="p-3">
          <div className="space-y-2">
            {OCR_BLOCKS.map((block) => {
              const isActive = block.id === activeBlock.id
              const style = BLOCK_STYLES[block.type]

              return (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => focusBlock(block)}
                  onFocus={() => focusBlock(block)}
                  onMouseEnter={() => focusBlock(block)}
                  className={cn(
                    "w-full rounded-lg border bg-background p-3 text-left transition-[border-color,background-color,box-shadow] hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    isActive &&
                      cn("shadow-[0_0_0_1px_rgb(0_0_0_/_4%)]", style.ring)
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                        style.soft
                      )}
                    >
                      <HugeiconsIcon icon={style.icon} className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-medium">
                          {block.label}
                        </div>
                        <div className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          p. {block.page}
                        </div>
                      </div>
                      <div
                        className={cn("mt-0.5 text-xs font-medium", style.text)}
                      >
                        {style.label} · {Math.round(block.confidence * 100)}%
                      </div>
                      <div className="mt-2 line-clamp-3 text-sm text-foreground/90">
                        {block.text}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </ScrollArea>
    </aside>
  )
}

export function OcrBlocks() {
  return <OcrBlocksPanel />
}

export function OcrBlocksBlock() {
  const [activeBlockId, setActiveBlockId] = React.useState(OCR_BLOCKS[0].id)
  const viewerRef = React.useRef<PDFViewerHandle>(null)
  const activeBlock =
    OCR_BLOCKS.find((block) => block.id === activeBlockId) ?? OCR_BLOCKS[0]

  const focusBlock = React.useCallback((block: OcrBlock) => {
    setActiveBlockId(block.id)
    viewerRef.current?.scrollToPageArea(
      block.page,
      convertPolygonToHighlightArea(block.polygon)
    )
  }, [])

  return (
    <PdfBlockResizableShell
      autoSaveId="pdf-block-ocr-blocks"
      left={
        <PDFViewer
          ref={viewerRef}
          file={PDF_URL}
          defaultZoom={DEFAULT_ZOOM}
          renderPageOverlay={({ pageNumber }) =>
            OCR_BLOCKS.filter((block) => block.page === pageNumber).map(
              (block) => (
                <BlockOverlay
                  key={block.id}
                  block={block}
                  isActive={activeBlock.id === block.id}
                />
              )
            )
          }
        />
      }
      right={
        <OcrBlocksPanel
          activeBlockId={activeBlock.id}
          className="h-full"
          onBlockFocus={focusBlock}
        />
      }
    />
  )
}

function OcrExampleCard({
  active,
  activeClassName,
  confidence,
  icon,
  iconClassName,
  kind,
  label,
  pageLabel,
  text,
}: {
  active?: boolean
  activeClassName?: string
  confidence: number
  icon: typeof Heading01Icon
  iconClassName: string
  kind: string
  label: string
  pageLabel: string
  text: string
}) {
  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-lg border bg-background p-3 text-left transition-[border-color,background-color,box-shadow] hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active &&
          (activeClassName ??
            "border-blue-500/60 bg-blue-500/5 shadow-[0_0_0_1px_rgb(0_0_0_/_4%)]")
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
            iconClassName
          )}
        >
          <HugeiconsIcon icon={icon} className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-medium">{label}</div>
            <div className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {pageLabel}
            </div>
          </div>
          <div className="mt-0.5 text-xs font-medium text-muted-foreground">
            {kind} · {Math.round(confidence * 100)}%
          </div>
          <div className="mt-2 line-clamp-3 text-sm text-foreground/90">
            {text}
          </div>
        </div>
      </div>
    </button>
  )
}

function OcrBlocksExample() {
  return (
    <div className="flex h-[420px] flex-col gap-2 bg-background p-3">
      <OcrExampleCard
        active
        icon={Heading01Icon}
        label="Paper title"
        kind="Heading"
        pageLabel="p. 1"
        confidence={0.99}
        text="Attention Is All You Need"
        iconClassName="bg-violet-500/10 text-violet-600 dark:text-violet-300"
        activeClassName="border-violet-500/60 bg-violet-500/5"
      />
      <OcrExampleCard
        icon={ParagraphIcon}
        label="Abstract body"
        kind="Paragraph"
        pageLabel="p. 1"
        confidence={0.94}
        text="The dominant sequence transduction models are based on complex recurrent or convolutional neural networks."
        iconClassName="bg-blue-500/10 text-blue-600 dark:text-blue-300"
      />
      <OcrExampleCard
        icon={Table01Icon}
        label="Complexity table"
        kind="Table"
        pageLabel="p. 6"
        confidence={0.91}
        text="Layer type, complexity per layer, sequential operations, maximum path length."
        iconClassName="bg-amber-500/10 text-amber-700 dark:text-amber-300"
      />
    </div>
  )
}

export function OcrBlocksDemo() {
  const [isCodeVisible, setIsCodeVisible] = React.useState(false)

  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <OcrBlocksExample />
      <div
        data-slot="code"
        data-mobile-code-visible={isCodeVisible}
        className="relative overflow-hidden **:data-[slot=copy-button]:right-4 **:data-[slot=copy-button]:hidden data-[mobile-code-visible=true]:**:data-[slot=copy-button]:flex [&_[data-rehype-pretty-code-figure]]:m-0! [&_[data-rehype-pretty-code-figure]]:rounded-t-none [&_[data-rehype-pretty-code-figure]]:border-t [&_pre]:max-h-72"
      >
        {isCodeVisible ? (
          <HighlightedCodeBlock
            code={ocrBlocksUsageCode}
            className="rounded-none border-x-0 border-b-0"
          />
        ) : (
          <div className="relative">
            <HighlightedCodeBlock
              code={ocrBlocksUsageCode}
              className="rounded-none border-x-0 border-b-0"
              maxHeightClassName="max-h-56"
              previewLines={10}
              showCopy={false}
            />
            <div className="absolute inset-0 flex items-center justify-center pb-4">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, var(--color-code), color-mix(in oklab, var(--color-code) 60%, transparent), transparent)",
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="relative z-10 rounded-lg bg-background text-foreground shadow-none hover:bg-muted dark:bg-background dark:text-foreground dark:hover:bg-muted"
                onClick={() => setIsCodeVisible(true)}
              >
                View Code
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const ocrBlocksUsageCode = `"use client";

import { Heading01Icon, ParagraphIcon, Table01Icon } from "@hugeicons/core-free-icons";

import { OcrBlockCard } from "@/components/ui/ocr-block-card";

export function OcrBlocksExample() {
  return (
    <div className="flex h-[420px] flex-col gap-2 bg-background p-3">
      <OcrBlockCard
        active
        icon={Heading01Icon}
        label="Paper title"
        kind="Heading"
        pageLabel="p. 1"
        confidence={0.99}
        text="Attention Is All You Need"
        iconClassName="bg-violet-500/10 text-violet-600 dark:text-violet-300"
        activeClassName="border-violet-500/60 bg-violet-500/5"
      />
      <OcrBlockCard
        icon={ParagraphIcon}
        label="Abstract body"
        kind="Paragraph"
        pageLabel="p. 1"
        confidence={0.94}
        text="The dominant sequence transduction models are based on complex recurrent or convolutional neural networks."
      />
      <OcrBlockCard
        icon={Table01Icon}
        label="Complexity table"
        kind="Table"
        pageLabel="p. 6"
        confidence={0.91}
        text="Layer type, complexity per layer, sequential operations, maximum path length."
        iconClassName="bg-amber-500/10 text-amber-700 dark:text-amber-300"
      />
    </div>
  );
}`

const ocrBlocksSourceCode = `"use client";

import * as React from "react";
import { ParagraphIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";

type OcrBlockCardProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  kind: string;
  text: string;
  confidence?: number;
  pageLabel?: string;
  icon?: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  active?: boolean;
  iconClassName?: string;
  activeClassName?: string;
};

export function OcrBlockCard({
  label,
  kind,
  text,
  confidence,
  pageLabel,
  icon = ParagraphIcon,
  active = false,
  iconClassName = "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  activeClassName = "border-blue-500/60 bg-blue-500/5",
  className,
  ...props
}: OcrBlockCardProps) {
  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-lg border bg-background p-3 text-left transition-[border-color,background-color,box-shadow] hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active && activeClassName,
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
            iconClassName,
          )}
        >
          <HugeiconsIcon icon={icon} className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-medium">{label}</div>
            {pageLabel ? (
              <div className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {pageLabel}
              </div>
            ) : null}
          </div>
          <div className="mt-0.5 text-xs font-medium text-muted-foreground">
            {kind}
            {typeof confidence === "number" ? \` · \${Math.round(confidence * 100)}%\` : null}
          </div>
          <div className="mt-2 line-clamp-3 text-sm text-foreground/90">
            {text}
          </div>
        </div>
      </div>
    </button>
  );
}`

export function OcrBlocksSource() {
  return <HighlightedCodeBlock code={ocrBlocksSourceCode} />
}
