"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowUpRight01Icon,
  ArrowRight01Icon,
  CodeIcon,
  File01Icon,
  Folder01Icon,
  LaptopIcon,
  Refresh01Icon,
  SmartPhone01Icon,
  Tablet01Icon,
  TerminalIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { ImperativePanelHandle } from "react-resizable-panels"

import { siteConfig } from "@/lib/config"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useMounted } from "@/hooks/use-mounted"
import { Button } from "@/components/ui/button"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { CopyButton, copyToClipboardWithMeta } from "@/components/copy-button"
import {
  DocumentSplitsBlock,
  XlsxDocumentSplitsBlock,
} from "@/components/document-splitter-docs"
import { DocxEditorBlock } from "@/components/docx-editor-docs"
import { ESignatureBlock } from "@/components/e-signature-docs"
import { HumanReviewBlock } from "@/components/human-review-docs"
import { OcrBlocksBlock } from "@/components/ocr-blocks-docs"
import { PdfDropzoneBlock } from "@/components/pdf-dropzone-block"

type BlockCodeSample = {
  sourcePath: string
  targetPath: string
  content: string
  highlightedContent: string
}

type BlockViewportSize = "desktop" | "tablet" | "mobile"
type BlockView = "preview" | "code"
type BlockFileTreeNode = {
  children?: BlockFileTreeNode[]
  name: string
  path?: string
}

function getRegistryAddCommand(name: string) {
  return `npx shadcn@latest add ${siteConfig.url}/r/${name}.json`
}

const blockViewportSizes: Array<{
  id: BlockViewportSize
  label: string
  panelSize: number
  icon: typeof LaptopIcon
}> = [
  { id: "desktop", label: "Desktop", panelSize: 100, icon: LaptopIcon },
  { id: "tablet", label: "Tablet", panelSize: 62, icon: Tablet01Icon },
  { id: "mobile", label: "Mobile", panelSize: 34, icon: SmartPhone01Icon },
]

const BLOCK_VIEWPORT_HEIGHT_CLASS = "h-[680px]"

const pdfViewerBlocks = [
  {
    id: "human-review",
    title: "Human Review",
    description:
      "Extraction review cards connected to source evidence in the PDF viewer.",
    command: getRegistryAddCommand("human-review"),
    docsHref: "/docs/components/human-review",
    component: HumanReviewBlock,
  },
  {
    id: "pdf-dropzone",
    title: "PDF Dropzone",
    description:
      "A PDF-only upload dropzone that opens the dropped file in the shared viewer.",
    command: getRegistryAddCommand("pdf-dropzone"),
    docsHref: "/docs/components/file-upload",
    component: PdfDropzoneBlock,
  },
  {
    id: "ocr-blocks",
    title: "OCR Blocks",
    description:
      "Structured OCR review with typed blocks, confidence, and page overlays.",
    hideHeader: true,
    command: getRegistryAddCommand("ocr-blocks"),
    docsHref: "/docs/components/ocr-blocks",
    component: OcrBlocksBlock,
  },
  {
    id: "e-signature",
    title: "E-Signature",
    description:
      "Signature fields connected to the PDF canvas and signed PDF export.",
    hideHeader: true,
    command: getRegistryAddCommand("e-signature"),
    docsHref: "/docs/components/e-signature",
    component: ESignatureBlock,
  },
  {
    id: "document-splits",
    title: "Document Splits",
    description:
      "Lazy page thumbnails, draggable split groups, and PDF navigation.",
    command: getRegistryAddCommand("document-splits"),
    docsHref: "/docs/components/document-splits",
    component: DocumentSplitsBlock,
  },
  {
    id: "excel-document-splits",
    title: "Excel Document Splits",
    description:
      "Workbook sheets split into draggable groups with thumbnails from the XLSX viewer.",
    command: getRegistryAddCommand("excel-document-splits"),
    docsHref: "/docs/components/xlsx-viewer",
    component: XlsxDocumentSplitsBlock,
  },
  {
    id: "docx-editor-block",
    title: "DOCX Editor",
    description:
      "A Word-style document editor with formatting controls, page thumbnails, and DOCX export.",
    command: getRegistryAddCommand("docx-editor-block"),
    docsHref: "/docs/components/docx-editor",
    component: DocxEditorBlock,
  },
]

export function PdfViewerBlocks({
  codeSamples,
}: {
  codeSamples: Record<string, BlockCodeSample[]>
}) {
  return (
    <section className="space-y-12">
      {pdfViewerBlocks.map((block) => (
        <PdfViewerBlockPreview
          key={block.id}
          block={block}
          codeSamples={codeSamples[block.id] ?? []}
        />
      ))}
    </section>
  )
}

function PdfViewerBlockPreview({
  block,
  codeSamples,
}: {
  block: (typeof pdfViewerBlocks)[number]
  codeSamples: BlockCodeSample[]
}) {
  const [previewKey, setPreviewKey] = React.useState(0)
  const [view, setView] = React.useState<BlockView>("preview")
  const [hasOpenedCode, setHasOpenedCode] = React.useState(false)
  const [activeViewport, setActiveViewport] =
    React.useState<BlockViewportSize>("desktop")
  const [isCommandCopied, setIsCommandCopied] = React.useState(false)
  const [activeFile, setActiveFile] = React.useState<string | null>(
    codeSamples[0]?.targetPath ?? null
  )
  const isMounted = useMounted()
  const previewPanelRef = React.useRef<ImperativePanelHandle>(null)
  const codePanelMountFrameRef = React.useRef<number | null>(null)
  const Preview = block.component
  const activeCodeSample =
    codeSamples.find((sample) => sample.targetPath === activeFile) ??
    codeSamples[0]
  const isDesktopViewport = useMediaQuery("(min-width: 768px)")

  const scheduleCodePanelMount = React.useCallback(() => {
    if (hasOpenedCode || codePanelMountFrameRef.current !== null) return

    codePanelMountFrameRef.current = window.requestAnimationFrame(() => {
      codePanelMountFrameRef.current = window.requestAnimationFrame(() => {
        codePanelMountFrameRef.current = null
        setHasOpenedCode(true)
      })
    })
  }, [hasOpenedCode])

  function setBlockView(nextView: BlockView) {
    if (nextView === "code" && !hasOpenedCode) {
      setView(nextView)
      scheduleCodePanelMount()
      return
    }

    setView(nextView)
  }

  function resizeViewport(viewport: (typeof blockViewportSizes)[number]) {
    setView("preview")
    setActiveViewport(viewport.id)
    previewPanelRef.current?.resize(viewport.panelSize)
  }

  React.useEffect(() => {
    return () => {
      if (codePanelMountFrameRef.current !== null) {
        window.cancelAnimationFrame(codePanelMountFrameRef.current)
      }
    }
  }, [])

  React.useEffect(() => {
    if (!isCommandCopied) return

    const timer = window.setTimeout(() => setIsCommandCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [isCommandCopied])

  async function copyInstallCommand() {
    const copied = await copyToClipboardWithMeta(block.command, {
      name: "copy_registry_add_command",
      properties: {
        block: block.id,
        command: block.command,
      },
    })

    if (copied) {
      setIsCommandCopied(true)
    }
  }

  return (
    <article id={block.id} className="scroll-mt-24 space-y-2">
      <div
        data-view={view}
        className="group/block-preview overflow-hidden rounded-xl"
      >
        <div className="flex min-h-11 flex-wrap items-center gap-2 px-2 pb-2">
          <BlockViewToggle view={view} onViewChange={setBlockView} />
          <a
            href={`#${block.id}`}
            className="min-w-0 flex-1 truncate text-sm font-medium underline-offset-2 hover:underline"
          >
            {block.title}
          </a>
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <div className="hidden items-center gap-1 rounded-md border bg-background p-0.5 sm:flex">
              {blockViewportSizes.map((viewport) => (
                <Button
                  key={viewport.id}
                  type="button"
                  variant={
                    activeViewport === viewport.id ? "secondary" : "ghost"
                  }
                  size="icon-sm"
                  className="size-7"
                  title={viewport.label}
                  aria-label={`${viewport.label} viewport`}
                  onClick={() => resizeViewport(viewport)}
                >
                  <HugeiconsIcon icon={viewport.icon} className="size-4" />
                </Button>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7"
                title="Open in New Tab"
                aria-label={`Open ${block.title} in new tab`}
                render={<Link href={block.docsHref} target="_blank" />}
              >
                <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7"
                title="Refresh Preview"
                aria-label={`Refresh ${block.title} preview`}
                onClick={() => setPreviewKey((value) => value + 1)}
              >
                <HugeiconsIcon icon={Refresh01Icon} className="size-4" />
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden max-w-[24rem] min-w-0 gap-1 px-2 shadow-none lg:flex"
              aria-label={
                isCommandCopied
                  ? "Copied install command"
                  : "Copy install command"
              }
              onClick={copyInstallCommand}
            >
              <HugeiconsIcon
                icon={isCommandCopied ? Tick02Icon : TerminalIcon}
                className="size-4 shrink-0"
              />
              <span className="truncate font-mono text-xs">
                {block.command}
              </span>
            </Button>
          </div>
        </div>
        <div className={view === "preview" ? "block" : "hidden"}>
          <div
            className={`relative hidden ${BLOCK_VIEWPORT_HEIGHT_CLASS} overflow-hidden rounded-xl border bg-muted/30 md:block`}
          >
            <div className="absolute inset-0 right-4 bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-[size:20px_20px]" />
            <ResizablePanelGroup
              direction="horizontal"
              className="relative z-10 h-full"
            >
              <ResizablePanel
                ref={previewPanelRef}
                defaultSize={100}
                minSize={30}
                className="min-w-0 overflow-hidden rounded-xl bg-background"
              >
                <BlockPreviewSurface
                  Preview={Preview}
                  isMounted={isMounted}
                  previewKey={previewKey}
                  shouldRenderPreview={isDesktopViewport}
                />
              </ResizablePanel>
              <ResizableHandle className="relative w-3 bg-transparent p-0 after:absolute after:top-1/2 after:right-0 after:h-8 after:w-1.5 after:-translate-y-1/2 after:rounded-full after:bg-border after:transition-all after:hover:h-10" />
              <ResizablePanel defaultSize={0} minSize={0} />
            </ResizablePanelGroup>
          </div>
          <div className="overflow-hidden rounded-xl border bg-background md:hidden">
            <BlockPreviewSurface
              Preview={Preview}
              isMounted={isMounted}
              previewKey={previewKey}
              shouldRenderPreview={!isDesktopViewport}
            />
          </div>
        </div>
        {view === "code" && !hasOpenedCode ? <BlockCodePanelShell /> : null}
        {hasOpenedCode ? (
          <div className={view === "code" ? "block" : "hidden"}>
            <BlockCodePanel
              codeSamples={codeSamples}
              activeFile={activeFile}
              onActiveFileChange={setActiveFile}
            />
          </div>
        ) : null}
      </div>
    </article>
  )
}

function BlockPreviewPlaceholder() {
  return <div className="h-full min-h-[560px] bg-muted/20" />
}

function BlockViewToggle({
  view,
  onViewChange,
}: {
  view: BlockView
  onViewChange: (view: BlockView) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Block view"
      className="flex w-fit items-center gap-0.5 rounded-lg bg-muted p-0.5 text-muted-foreground/72"
    >
      {(["preview", "code"] as const).map((item) => {
        const isActive = view === item

        return (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={cn(
              "flex h-8 items-center justify-center rounded-md px-2.5 text-sm font-medium whitespace-nowrap outline-none transition-colors hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
              isActive &&
                "bg-background text-foreground shadow-sm/5 dark:bg-input"
            )}
            onClick={() => onViewChange(item)}
          >
            {item === "preview" ? "Preview" : "Code"}
          </button>
        )
      })}
    </div>
  )
}

const BlockPreviewSurface = React.memo(function BlockPreviewSurface({
  Preview,
  isMounted,
  previewKey,
  shouldRenderPreview,
}: {
  Preview: React.ComponentType
  isMounted: boolean
  previewKey: number
  shouldRenderPreview: boolean
}) {
  if (!isMounted || !shouldRenderPreview) {
    return <BlockPreviewPlaceholder />
  }

  return <Preview key={previewKey} />
})

function BlockCodePanelShell() {
  return (
    <div
      className={`flex ${BLOCK_VIEWPORT_HEIGHT_CLASS} overflow-hidden rounded-xl border bg-code text-code-foreground`}
    >
      <div className="hidden w-72 shrink-0 border-r bg-code md:block">
        <div className="flex h-12 items-center border-b px-4 text-sm font-medium">
          Files
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-12 border-b" />
      </div>
    </div>
  )
}

function BlockCodePanel({
  codeSamples,
  activeFile,
  onActiveFileChange,
}: {
  codeSamples: BlockCodeSample[]
  activeFile: string | null
  onActiveFileChange: (file: string) => void
}) {
  const activeCodeSample =
    codeSamples.find((sample) => sample.targetPath === activeFile) ??
    codeSamples[0]

  if (!activeCodeSample) {
    return (
      <div
        className={`grid ${BLOCK_VIEWPORT_HEIGHT_CLASS} place-items-center rounded-xl border bg-code text-sm text-code-foreground`}
      >
        No source sample available.
      </div>
    )
  }

  return (
    <div
      className={`flex ${BLOCK_VIEWPORT_HEIGHT_CLASS} overflow-hidden rounded-xl border bg-code text-code-foreground`}
    >
      <div className="hidden w-72 shrink-0 border-r bg-code md:block">
        <div className="flex h-12 items-center border-b px-4 text-sm font-medium">
          Files
        </div>
        <BlockFileTree
          codeSamples={codeSamples}
          activeFile={activeCodeSample.targetPath}
          onActiveFileChange={onActiveFileChange}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center gap-2 border-b px-4 text-sm">
          <HugeiconsIcon icon={CodeIcon} className="size-4 opacity-70" />
          <span className="truncate">{activeCodeSample.targetPath}</span>
          <CopyButton
            value={activeCodeSample.content}
            className="static ml-auto size-7 bg-transparent"
            event="copy_block_code"
          />
        </div>
        <figure
          data-rehype-pretty-code-figure
          className="m-0! min-h-0 flex-1 overflow-hidden"
        >
          <div
            key={activeCodeSample.targetPath}
            className="h-full [&_pre]:h-full [&_pre]:max-h-none"
            dangerouslySetInnerHTML={{
              __html: activeCodeSample.highlightedContent,
            }}
          />
        </figure>
      </div>
    </div>
  )
}

function BlockFileTree({
  codeSamples,
  activeFile,
  onActiveFileChange,
}: {
  codeSamples: BlockCodeSample[]
  activeFile: string
  onActiveFileChange: (file: string) => void
}) {
  const fileTree = React.useMemo(
    () => createBlockFileTree(codeSamples.map((sample) => sample.targetPath)),
    [codeSamples]
  )

  return (
    <div className="h-[calc(34rem-3rem)] overflow-auto p-2">
      <div className="space-y-1">
        {fileTree.map((item) => (
          <BlockFileTreeItem
            key={item.path ?? item.name}
            activeFile={activeFile}
            item={item}
            level={0}
            onActiveFileChange={onActiveFileChange}
          />
        ))}
      </div>
    </div>
  )
}

function BlockFileTreeItem({
  activeFile,
  item,
  level,
  onActiveFileChange,
}: {
  activeFile: string
  item: BlockFileTreeNode
  level: number
  onActiveFileChange: (file: string) => void
}) {
  if (item.children?.length) {
    return (
      <div>
        <div
          className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-code-foreground/80"
          style={{ paddingLeft: `${level * 0.75 + 0.5}rem` }}
        >
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="size-3 rotate-90 opacity-60"
          />
          <HugeiconsIcon icon={Folder01Icon} className="size-3.5 opacity-70" />
          <span className="truncate">{item.name}</span>
        </div>
        <div>
          {item.children.map((child) => (
            <BlockFileTreeItem
              key={child.path ?? `${item.name}/${child.name}`}
              activeFile={activeFile}
              item={child}
              level={level + 1}
              onActiveFileChange={onActiveFileChange}
            />
          ))}
        </div>
      </div>
    )
  }

  if (!item.path) return null

  return (
    <button
      type="button"
      className={cn(
        "flex h-7 w-full items-center gap-1.5 rounded-md px-2 text-left text-xs text-code-foreground/80 outline-none hover:bg-muted-foreground/15 hover:text-code-foreground focus-visible:ring-2 focus-visible:ring-ring/45",
        activeFile === item.path && "bg-muted-foreground/15 text-code-foreground"
      )}
      style={{ paddingLeft: `${level * 0.75 + 0.5}rem` }}
      onClick={() => onActiveFileChange(item.path!)}
    >
      <HugeiconsIcon icon={File01Icon} className="size-3.5 shrink-0 opacity-70" />
      <span className="truncate">{item.name}</span>
    </button>
  )
}

function createBlockFileTree(paths: string[]) {
  const root: BlockFileTreeNode[] = []

  for (const filePath of paths) {
    const parts = filePath.split("/")
    let currentLevel = root

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1
      const existingNode = currentLevel.find((node) => node.name === part)

      if (existingNode) {
        if (isFile) {
          existingNode.path = filePath
        } else {
          currentLevel = existingNode.children ?? []
        }
        return
      }

      const nextNode: BlockFileTreeNode = isFile
        ? { name: part, path: filePath }
        : { children: [], name: part }

      currentLevel.push(nextNode)

      if (!isFile) {
        currentLevel = nextNode.children!
      }
    })
  }

  return root
}
