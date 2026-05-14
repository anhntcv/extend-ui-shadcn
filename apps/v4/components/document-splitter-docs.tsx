"use client"

import * as React from "react"
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Add01Icon,
  Delete02Icon,
  DragDropVerticalIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type * as ReactPdf from "react-pdf"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PDFViewer, type PDFViewerHandle } from "@/components/ui/pdf-viewer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileThumbnailLoadingOverlay } from "@/components/file-thumbnail-docs"
import { HighlightedCodeBlock } from "@/components/highlighted-code-block"
import { PdfBlockResizableShell } from "@/components/pdf-block-resizable-shell"
import { Badge } from "@/registry/new-york-v4/ui/badge"
import { Card } from "@/registry/new-york-v4/ui/card"

type ReactPdfModule = typeof ReactPdf
type PageId = `page-${number}`

type SplitGroup = {
  id: string
  title: string
  pages: PageId[]
}

const PDF_URL = "/samples/attention.pdf"
const PDF_WORKER_URL = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url
).toString()
const THUMBNAIL_WIDTH = 72
const THUMBNAIL_HEIGHT = 92
const THUMBNAIL_ROOT_MARGIN = "360px"
const DEFAULT_ZOOM = 0.75
const DEFAULT_PREVIEW_PAGE_COUNT = 15
const DRAG_OVERLAY_DROP_ANIMATION = null

const splitterCollisionDetection: CollisionDetection = (args) => {
  const dragType = args.active.data.current?.type

  if (dragType === "page") {
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (container) =>
          container.data.current?.type === "page" ||
          (container.data.current?.type === "page-dropzone" &&
            container.data.current?.isEmpty)
      ),
    })
  }

  return closestCenter(args)
}

function toPageId(pageNumber: number): PageId {
  return `page-${pageNumber}`
}

function getPageNumber(pageId: PageId): number {
  return Number(pageId.replace("page-", ""))
}

function createInitialGroups(pageCount: number): SplitGroup[] {
  const pages = Array.from({ length: pageCount }, (_, index) =>
    toPageId(index + 1)
  )

  return [
    {
      id: "split-1",
      title: "Abstract and intro",
      pages: pages.slice(0, Math.min(3, pageCount)),
    },
    {
      id: "split-2",
      title: "Model architecture",
      pages: pages.slice(3, Math.min(8, pageCount)),
    },
    {
      id: "split-3",
      title: "Training and results",
      pages: pages.slice(8),
    },
  ].filter((group) => group.pages.length > 0)
}

function formatPageRanges(pageIds: PageId[]) {
  if (pageIds.length === 0) return "No pages"

  const pages = pageIds.map(getPageNumber)
  const ranges: string[] = []
  let rangeStart = pages[0]
  let previous = pages[0]

  for (let index = 1; index <= pages.length; index += 1) {
    const current = pages[index]

    if (current !== previous + 1) {
      ranges.push(
        rangeStart === previous ? `${rangeStart}` : `${rangeStart}-${previous}`
      )
      rangeStart = current
    }

    previous = current
  }

  return `Pages ${ranges.join(", ")}`
}

function createPageRangeLabels(groups: SplitGroup[]) {
  return Object.fromEntries(
    groups.map((group) => [group.id, formatPageRanges(group.pages)])
  )
}

function useLazyThumbnail() {
  const [node, setNode] = React.useState<HTMLDivElement | null>(null)
  const [shouldRender, setShouldRender] = React.useState(false)

  React.useEffect(() => {
    if (!node || shouldRender) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldRender(true)
          observer.disconnect()
        }
      },
      { rootMargin: THUMBNAIL_ROOT_MARGIN }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [node, shouldRender])

  return { setNode, shouldRender }
}

function PageThumbnailLoading() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-muted">
      <FileThumbnailLoadingOverlay />
    </div>
  )
}

function SplitGroupDropzone({
  id,
  isEmpty,
  children,
}: {
  id: string
  isEmpty: boolean
  children: React.ReactNode
}) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      groupId: id,
      isEmpty,
      type: "page-dropzone",
    },
  })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[116px] rounded-lg p-2 transition-[background-color,box-shadow]",
        isOver && "bg-accent/30 shadow-[inset_0_0_0_1px_var(--border)]"
      )}
    >
      {children}
    </div>
  )
}

const PageThumbnailPreview = React.memo(function PageThumbnailPreview({
  pageId,
  pageNumber,
  reactPdf,
  isActive,
  imageUrl,
  onSelect,
  onThumbnailReady,
}: {
  pageId: PageId
  pageNumber: number
  reactPdf: ReactPdfModule | null
  isActive: boolean
  imageUrl?: string
  onSelect: (pageNumber: number) => void
  onThumbnailReady?: (pageId: PageId, imageUrl: string) => void
}) {
  const [isThumbnailLoading, setIsThumbnailLoading] = React.useState(true)
  const { setNode, shouldRender } = useLazyThumbnail()
  const rootRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (reactPdf && shouldRender) {
      setIsThumbnailLoading(true)
    }
  }, [pageNumber, reactPdf, shouldRender])

  return (
    <div
      ref={setNode}
      className="relative"
      style={{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }}
    >
      <button
        ref={rootRef}
        type="button"
        className={cn(
          "relative cursor-grab overflow-hidden rounded-md border bg-muted text-left shadow-xs transition-[border-color,box-shadow,opacity] active:cursor-grabbing",
          isActive
            ? "border-blue-500 shadow-[0_0_0_2px_rgb(59_130_246_/_14%)]"
            : "border-border hover:border-foreground/30"
        )}
        style={{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }}
        onClick={() => onSelect(pageNumber)}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
            draggable={false}
          />
        ) : reactPdf && shouldRender ? (
          <>
            <reactPdf.Thumbnail
              pageNumber={pageNumber}
              width={THUMBNAIL_WIDTH}
              className={cn(
                "absolute inset-0 block size-full [&_.react-pdf__Thumbnail__page]:!m-0 [&_.react-pdf__Thumbnail__page]:!size-full [&_.react-pdf__Thumbnail__page]:overflow-hidden [&_canvas]:!size-full [&_canvas]:object-cover [&_canvas]:align-top [&_canvas]:transition-[opacity,filter,transform] [&_canvas]:duration-[160ms] [&_canvas]:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:[&_canvas]:transition-none",
                isThumbnailLoading
                  ? "[&_canvas]:scale-[1.01] [&_canvas]:opacity-0 [&_canvas]:blur-sm"
                  : "[&_canvas]:blur-0 [&_canvas]:scale-100 [&_canvas]:opacity-100"
              )}
              onItemClick={({ pageNumber: clickedPageNumber }) => {
                onSelect(clickedPageNumber)
              }}
              onRenderSuccess={() => {
                setIsThumbnailLoading(false)

                if (!onThumbnailReady) return

                window.requestAnimationFrame(() => {
                  const canvas = rootRef.current?.querySelector("canvas")

                  if (!canvas) return

                  try {
                    canvas.toBlob((blob) => {
                      if (!blob) return

                      onThumbnailReady(pageId, URL.createObjectURL(blob))
                    }, "image/png")
                  } catch {
                    // Canvas export can fail if the browser marks it tainted.
                  }
                })
              }}
              onRenderError={() => setIsThumbnailLoading(false)}
              loading={null}
            />
            {isThumbnailLoading ? <PageThumbnailLoading /> : null}
          </>
        ) : (
          <PageThumbnailLoading />
        )}
        <span className="absolute right-1 bottom-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium shadow-xs">
          {pageNumber}
        </span>
      </button>
    </div>
  )
})

function SortablePageThumbnail({
  groupId,
  pageId,
  pageNumber,
  reactPdf,
  isActive,
  imageUrl,
  onSelect,
  onThumbnailReady,
}: {
  groupId: string
  pageId: PageId
  pageNumber: number
  reactPdf: ReactPdfModule | null
  isActive: boolean
  imageUrl?: string
  onSelect: (pageNumber: number) => void
  onThumbnailReady?: (pageId: PageId, imageUrl: string) => void
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: pageId,
    data: {
      groupId,
      pageId,
      type: "page",
    },
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn("group relative shrink-0", isDragging && "z-20 opacity-0")}
      {...attributes}
      {...listeners}
    >
      <PageThumbnailPreview
        pageId={pageId}
        pageNumber={pageNumber}
        reactPdf={reactPdf}
        isActive={isActive}
        imageUrl={imageUrl}
        onSelect={onSelect}
        onThumbnailReady={onThumbnailReady}
      />
    </div>
  )
}

function SplitGroupCard({
  group,
  pageRangeLabel,
  reactPdf,
  activePage,
  isPageDragging = false,
  thumbnailImages,
  canRemove,
  onRemove,
  onSelectPage,
  onThumbnailReady,
}: {
  group: SplitGroup
  pageRangeLabel: string
  reactPdf: ReactPdfModule | null
  activePage: number
  isPageDragging?: boolean
  thumbnailImages?: Record<PageId, string>
  canRemove: boolean
  onRemove: () => void
  onSelectPage: (pageNumber: number) => void
  onThumbnailReady?: (pageId: PageId, imageUrl: string) => void
}) {
  if (!reactPdf) {
    return (
      <Card className="rounded-xl">
        <div className="flex items-start justify-between gap-3 border-b p-3">
          <div className="flex min-w-0 items-start gap-2">
            <button
              type="button"
              aria-label={`Reorder ${group.title}`}
              className="mt-0.5 inline-flex size-7 shrink-0 cursor-default items-center justify-center rounded-md text-muted-foreground"
              disabled
            >
              <HugeiconsIcon icon={DragDropVerticalIcon} className="size-4" />
            </button>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{group.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {pageRangeLabel}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="secondary" className="rounded-full">
              {group.pages.length}
            </Badge>
            {canRemove ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${group.title}`}
                onClick={onRemove}
              >
                <HugeiconsIcon icon={Delete02Icon} className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>
        <div className="min-h-[116px] rounded-lg p-2">
          <ScrollArea
            className="h-[110px] w-full overflow-hidden"
            orientation="horizontal"
            scrollbarGutter
            scrollbarOverflowOnly
            viewportClassName="overflow-y-hidden"
          >
            <div className="flex w-max gap-2 overflow-y-hidden py-1 pr-6">
              {group.pages.map((pageId) => {
                const pageNumber = getPageNumber(pageId)

                return (
                  <div
                    key={pageId}
                    className={cn(
                      "relative shrink-0 overflow-hidden rounded-md border bg-muted shadow-xs",
                      activePage === pageNumber
                        ? "border-blue-500 shadow-[0_0_0_2px_rgb(59_130_246_/_14%)]"
                        : "border-border"
                    )}
                    style={{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }}
                  >
                    <PageThumbnailLoading />
                    <span className="absolute right-1 bottom-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium shadow-xs">
                      {pageNumber}
                    </span>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl">
      <div className="flex items-start justify-between gap-3 border-b p-3">
        <div className="flex min-w-0 items-start gap-2">
          <button
            type="button"
            aria-label={`Reorder ${group.title}`}
            className="mt-0.5 inline-flex size-7 shrink-0 cursor-default items-center justify-center rounded-md text-muted-foreground"
            disabled
          >
            <HugeiconsIcon icon={DragDropVerticalIcon} className="size-4" />
          </button>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{group.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {pageRangeLabel}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="secondary" className="rounded-full">
            {group.pages.length}
          </Badge>
          {canRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${group.title}`}
              onClick={onRemove}
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
      <SplitGroupDropzone id={group.id} isEmpty={group.pages.length === 0}>
        {group.pages.length > 0 ? (
          <SortableContext
            items={group.pages}
            strategy={horizontalListSortingStrategy}
          >
            <ScrollArea
              className={cn(
                "h-[110px] w-full overflow-hidden",
                isPageDragging &&
                  "[&_[data-orientation=horizontal][data-slot=scroll-area-scrollbar]]:hidden"
              )}
              orientation="horizontal"
              scrollbarGutter
              scrollbarOverflowOnly
              viewportClassName="overflow-y-hidden"
            >
              <div className="flex w-max gap-2 overflow-y-hidden py-1 pr-6">
                {group.pages.map((pageId) => {
                  const pageNumber = getPageNumber(pageId)

                  return (
                    <SortablePageThumbnail
                      key={pageId}
                      groupId={group.id}
                      pageId={pageId}
                      pageNumber={pageNumber}
                      reactPdf={reactPdf}
                      isActive={activePage === pageNumber}
                      imageUrl={thumbnailImages?.[pageId]}
                      onSelect={onSelectPage}
                      onThumbnailReady={onThumbnailReady}
                    />
                  )
                })}
              </div>
            </ScrollArea>
          </SortableContext>
        ) : (
          <div className="grid h-[104px] place-items-center rounded-lg bg-muted/35 text-xs text-muted-foreground">
            Drop pages here
          </div>
        )}
      </SplitGroupDropzone>
    </Card>
  )
}

function PageDragOverlay({
  pageId,
  imageUrl,
}: {
  pageId: PageId
  imageUrl?: string
}) {
  const pageNumber = getPageNumber(pageId)

  return (
    <div
      className="relative overflow-hidden rounded-md border border-blue-500 bg-background shadow-lg shadow-black/10"
      style={{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="size-full object-cover"
          draggable={false}
        />
      ) : (
        <PageThumbnailLoading />
      )}
      <span className="absolute right-1 bottom-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium shadow-xs">
        {pageNumber}
      </span>
    </div>
  )
}

function findGroupId(groups: SplitGroup[], id: string) {
  if (groups.some((group) => group.id === id)) return id

  return groups.find((group) => group.pages.includes(id as PageId))?.id ?? null
}

function getGroupPages(groups: SplitGroup[], groupId: string | null) {
  return groups.find((group) => group.id === groupId)?.pages ?? []
}

function movePageToGroup({
  activePageId,
  groups,
  insertIndex,
  targetGroupId,
}: {
  activePageId: PageId
  groups: SplitGroup[]
  insertIndex: number
  targetGroupId: string
}) {
  return groups.map((group) => {
    const pagesWithoutActive = group.pages.filter(
      (pageId) => pageId !== activePageId
    )

    if (group.id !== targetGroupId) {
      return { ...group, pages: pagesWithoutActive }
    }

    const nextPages = [...pagesWithoutActive]
    nextPages.splice(insertIndex, 0, activePageId)
    return { ...group, pages: nextPages }
  })
}

function reorderPageInGroup({
  activePageId,
  groups,
  overPageId,
}: {
  activePageId: PageId
  groups: SplitGroup[]
  overPageId: PageId
}) {
  const groupId = findGroupId(groups, activePageId)
  const pages = getGroupPages(groups, groupId)
  const activeIndex = pages.indexOf(activePageId)
  const overIndex = pages.indexOf(overPageId)

  if (!groupId || activeIndex === -1 || overIndex === -1) return groups

  return groups.map((group) =>
    group.id === groupId
      ? { ...group, pages: arrayMove(group.pages, activeIndex, overIndex) }
      : group
  )
}

function SplitterGroupsPane({
  activePage,
  className,
  documentKey,
  pageCount,
  reactPdf,
  withFrameDivider = true,
  onSelectPage,
}: {
  activePage: number
  className?: string
  documentKey: string
  pageCount: number
  reactPdf: ReactPdfModule | null
  withFrameDivider?: boolean
  onSelectPage: (pageNumber: number) => void
}) {
  const [groups, setGroups] = React.useState<SplitGroup[]>(() =>
    createInitialGroups(DEFAULT_PREVIEW_PAGE_COUNT)
  )
  const [activePageId, setActivePageId] = React.useState<PageId | null>(null)
  const [thumbnailImages, setThumbnailImages] = React.useState<
    Record<PageId, string>
  >({})
  const thumbnailObjectUrlsRef = React.useRef(new Set<string>())
  const dragStartGroupIdRef = React.useRef<string | null>(null)
  const dragStartGroupsRef = React.useRef<SplitGroup[] | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  const clearCachedThumbnails = React.useCallback(() => {
    thumbnailObjectUrlsRef.current.forEach((imageUrl) => {
      URL.revokeObjectURL(imageUrl)
    })
    thumbnailObjectUrlsRef.current.clear()
    setThumbnailImages({})
  }, [])

  React.useEffect(() => {
    const nextGroups = createInitialGroups(
      pageCount || DEFAULT_PREVIEW_PAGE_COUNT
    )

    setGroups(nextGroups)
    clearCachedThumbnails()
    setActivePageId(null)
  }, [clearCachedThumbnails, documentKey, pageCount])

  React.useEffect(() => {
    const objectUrls = thumbnailObjectUrlsRef.current

    return () => {
      objectUrls.forEach((imageUrl) => {
        URL.revokeObjectURL(imageUrl)
      })
      objectUrls.clear()
    }
  }, [])

  const pageRangeLabels = React.useMemo(
    () => createPageRangeLabels(groups),
    [groups]
  )

  const addSplit = React.useCallback(() => {
    setGroups((previousGroups) => [
      ...previousGroups,
      {
        id: `split-${Date.now()}-${previousGroups.length}`,
        title: `Split ${previousGroups.length + 1}`,
        pages: [],
      },
    ])
  }, [])

  const removeSplit = React.useCallback((groupId: string) => {
    setGroups((previousGroups) => {
      const groupToRemove = previousGroups.find((group) => group.id === groupId)
      const remainingGroups = previousGroups.filter(
        (group) => group.id !== groupId
      )

      if (!groupToRemove || remainingGroups.length === 0) return previousGroups

      return remainingGroups.map((group, index) =>
        index === 0
          ? { ...group, pages: [...group.pages, ...groupToRemove.pages] }
          : group
      )
    })
  }, [])

  const handleThumbnailReady = React.useCallback(
    (pageId: PageId, imageUrl: string) => {
      setThumbnailImages((currentImages) => {
        if (currentImages[pageId]) {
          URL.revokeObjectURL(imageUrl)
          return currentImages
        }

        thumbnailObjectUrlsRef.current.add(imageUrl)
        return { ...currentImages, [pageId]: imageUrl }
      })
    },
    []
  )

  const handleDragStart = React.useCallback(
    (event: DragStartEvent) => {
      const dragType = event.active.data.current?.type

      if (dragType === "page") {
        const pageId = String(event.active.id) as PageId
        dragStartGroupIdRef.current = findGroupId(groups, pageId)
        dragStartGroupsRef.current = groups
        setActivePageId(pageId)
        return
      }

      dragStartGroupIdRef.current = null
      dragStartGroupsRef.current = null
      setActivePageId(null)
    },
    [groups]
  )

  const handleDragOver = React.useCallback((event: DragOverEvent) => {
    const dragType = event.active.data.current?.type
    const overId = event.over?.id

    if (dragType !== "page" || !overId) return

    const pageId = String(event.active.id) as PageId

    setGroups((previousGroups) => {
      const sourceGroupId = findGroupId(previousGroups, pageId)
      const targetGroupId = findGroupId(previousGroups, String(overId))

      if (!sourceGroupId || !targetGroupId || sourceGroupId === targetGroupId) {
        return previousGroups
      }

      const targetPages = getGroupPages(previousGroups, targetGroupId)
      const overPageIndex = targetPages.indexOf(String(overId) as PageId)
      const overRect = event.over?.rect
      const activeRect = event.active.rect.current.translated
      const isAfterOverPage =
        overPageIndex !== -1 &&
        activeRect &&
        overRect &&
        activeRect.left > overRect.left + overRect.width / 2
      const insertIndex =
        overPageIndex === -1
          ? targetPages.length
          : overPageIndex + (isAfterOverPage ? 1 : 0)

      return movePageToGroup({
        groups: previousGroups,
        activePageId: pageId,
        targetGroupId,
        insertIndex,
      })
    })
  }, [])

  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    const dragType = event.active.data.current?.type
    const overId = event.over?.id

    if (dragType === "page" && overId) {
      const activePageId = String(event.active.id) as PageId
      const overPageId = String(overId) as PageId

      setGroups((previousGroups) => {
        const overGroupId = findGroupId(previousGroups, String(overId))

        if (dragStartGroupIdRef.current !== overGroupId) {
          return previousGroups
        }

        return reorderPageInGroup({
          groups: previousGroups,
          activePageId,
          overPageId,
        })
      })
    }

    dragStartGroupIdRef.current = null
    dragStartGroupsRef.current = null
    setActivePageId(null)
  }, [])

  const handleDragCancel = React.useCallback(() => {
    if (dragStartGroupsRef.current) {
      setGroups(dragStartGroupsRef.current)
    }

    dragStartGroupIdRef.current = null
    dragStartGroupsRef.current = null
    setActivePageId(null)
  }, [])

  const visibleActivePage = activePageId
    ? getPageNumber(activePageId)
    : activePage
  const isPageDragging = activePageId !== null

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col bg-muted/20",
        withFrameDivider && "border-t md:border-t-0 md:border-l",
        className
      )}
    >
      <div className="flex min-h-12 items-center justify-end gap-3 border-b bg-background px-3">
        <Button type="button" variant="outline" size="sm" onClick={addSplit}>
          <HugeiconsIcon icon={Add01Icon} className="size-4" />
          Add split
        </Button>
      </div>
      {reactPdf ? (
        <DndContext
          sensors={sensors}
          collisionDetection={splitterCollisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <ScrollArea className="min-h-0 flex-1" scrollFade>
            <div className="space-y-3 p-3">
              {groups.map((group) => (
                <SplitGroupCard
                  key={group.id}
                  group={group}
                  pageRangeLabel={pageRangeLabels[group.id] ?? "No pages"}
                  reactPdf={reactPdf}
                  activePage={visibleActivePage}
                  isPageDragging={isPageDragging}
                  thumbnailImages={thumbnailImages}
                  canRemove={groups.length > 1}
                  onRemove={() => removeSplit(group.id)}
                  onSelectPage={onSelectPage}
                  onThumbnailReady={handleThumbnailReady}
                />
              ))}
            </div>
          </ScrollArea>
          <DragOverlay dropAnimation={DRAG_OVERLAY_DROP_ANIMATION}>
            {activePageId ? (
              <PageDragOverlay
                pageId={activePageId}
                imageUrl={thumbnailImages[activePageId]}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <ScrollArea className="min-h-0 flex-1" scrollFade>
          <div className="space-y-3 p-3">
            {groups.map((group) => (
              <SplitGroupCard
                key={group.id}
                group={group}
                pageRangeLabel={pageRangeLabels[group.id] ?? "No pages"}
                reactPdf={null}
                activePage={visibleActivePage}
                canRemove={groups.length > 1}
                onRemove={() => removeSplit(group.id)}
                onSelectPage={onSelectPage}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </aside>
  )
}

export function DocumentSplits({
  file = PDF_URL,
  className,
}: {
  file?: string
  className?: string
} = {}) {
  const [reactPdf, setReactPdf] = React.useState<ReactPdfModule | null>(null)
  const [numPages, setNumPages] = React.useState(0)

  React.useEffect(() => {
    let isMounted = true

    import("react-pdf").then((module) => {
      module.pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL

      if (isMounted) {
        setReactPdf(module)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  const renderPanel = (pdfModule: ReactPdfModule | null) => (
    <div className={cn("h-[620px] overflow-hidden bg-background", className)}>
      <SplitterGroupsPane
        activePage={1}
        documentKey={file}
        pageCount={numPages}
        reactPdf={pdfModule}
        onSelectPage={() => {}}
      />
    </div>
  )

  if (!reactPdf) {
    return renderPanel(null)
  }

  return (
    <reactPdf.Document
      file={file}
      onLoadSuccess={({ numPages: pageCount }) => {
        setNumPages(pageCount)
      }}
      loading={renderPanel(null)}
      error={
        <div className="grid h-[620px] place-items-center bg-background text-sm text-muted-foreground">
          Unable to load PDF.
        </div>
      }
    >
      {renderPanel(reactPdf)}
    </reactPdf.Document>
  )
}

export function DocumentSplitsBlock() {
  const [reactPdf, setReactPdf] = React.useState<ReactPdfModule | null>(null)
  const [pdfUrl, setPdfUrl] = React.useState(PDF_URL)
  const [numPages, setNumPages] = React.useState(0)
  const [activePage, setActivePage] = React.useState(1)
  const viewerRef = React.useRef<PDFViewerHandle>(null)
  const uploadedPdfUrlRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    let isMounted = true

    import("react-pdf").then((module) => {
      module.pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL

      if (isMounted) {
        setReactPdf(module)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  React.useEffect(() => {
    return () => {
      if (uploadedPdfUrlRef.current) {
        URL.revokeObjectURL(uploadedPdfUrlRef.current)
      }
    }
  }, [])

  const handleLoadSuccess = React.useCallback(
    ({ numPages: pageCount }: { numPages: number }) => {
      setNumPages(pageCount)
    },
    []
  )

  const handleActivePageChange = React.useCallback((pageNumber: number) => {
    window.queueMicrotask(() => {
      setActivePage((currentPage) =>
        currentPage === pageNumber ? currentPage : pageNumber
      )
    })
  }, [])

  const handlePdfUpload = React.useCallback((file: File) => {
    const nextUrl = URL.createObjectURL(file)

    if (uploadedPdfUrlRef.current) {
      URL.revokeObjectURL(uploadedPdfUrlRef.current)
    }

    uploadedPdfUrlRef.current = nextUrl
    setPdfUrl(nextUrl)
    setNumPages(0)
    setActivePage(1)
  }, [])

  const scrollToPage = React.useCallback((pageNumber: number) => {
    setActivePage(pageNumber)

    viewerRef.current?.scrollToPage(pageNumber, {
      block: "start",
      behavior: "auto",
    })
  }, [])

  const updatePageCountFromViewer = React.useCallback((pageCount: number) => {
    window.queueMicrotask(() => {
      setNumPages(pageCount)
    })
  }, [])

  const renderShell = (pdfModule: ReactPdfModule | null) => (
    <PdfBlockResizableShell
      autoSaveId="pdf-block-document-splits"
      heightClassName="h-[720px]"
      rightDefaultSize={50}
      rightMaxSize={66}
      rightMinSize={30}
      left={
        <PDFViewer
          ref={viewerRef}
          file={pdfUrl}
          defaultZoom={DEFAULT_ZOOM}
          onActivePageChange={handleActivePageChange}
          onPdfUpload={handlePdfUpload}
          onDocumentLoadSuccess={updatePageCountFromViewer}
        />
      }
      right={
        <SplitterGroupsPane
          activePage={activePage}
          documentKey={pdfUrl}
          pageCount={numPages}
          reactPdf={pdfModule}
          withFrameDivider={false}
          onSelectPage={scrollToPage}
        />
      }
    />
  )

  if (!reactPdf) {
    return renderShell(null)
  }

  return (
    <reactPdf.Document
      file={pdfUrl}
      onLoadSuccess={handleLoadSuccess}
      loading={renderShell(null)}
      error={
        <div className="grid h-[720px] place-items-center bg-background text-sm text-muted-foreground">
          Unable to load PDF.
        </div>
      }
    >
      {renderShell(reactPdf)}
    </reactPdf.Document>
  )
}

function DocumentSplitExampleCard({
  title,
  pages,
  activePage,
  className,
}: {
  title: string
  pages: number[]
  activePage?: number
  className?: string
}) {
  return (
    <section className={cn("rounded-lg border bg-background p-3", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 cursor-grab text-muted-foreground"
            aria-label={`Reorder ${title}`}
          >
            <HugeiconsIcon icon={DragDropVerticalIcon} className="size-4" />
          </Button>
          <div className="truncate text-sm font-medium">{title}</div>
        </div>
        <Badge variant="secondary" className="rounded-full">
          {pages.length} pages
        </Badge>
      </div>
      <ScrollArea
        className="h-[108px] w-full overflow-hidden"
        orientation="horizontal"
        scrollbarGutter
        scrollbarOverflowOnly
        viewportClassName="overflow-y-hidden"
      >
        <div className="flex w-max gap-2 overflow-y-hidden py-1 pr-4">
          {pages.map((page) => (
            <button
              key={page}
              type="button"
              className={cn(
                "relative h-[92px] w-[72px] shrink-0 overflow-hidden rounded-md border bg-muted text-xs text-muted-foreground transition-colors hover:border-primary/50",
                activePage === page &&
                  "border-primary bg-primary/5 text-primary"
              )}
            >
              <div className="absolute inset-2 rounded-sm bg-background/70 shadow-sm" />
              <span className="absolute right-1.5 bottom-1.5 rounded bg-background/90 px-1 text-[10px]">
                {page}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </section>
  )
}

function DocumentSplitsExample() {
  return (
    <div className="flex h-[520px] flex-col gap-3 bg-background p-3">
      <DocumentSplitExampleCard
        title="Abstract and intro"
        pages={[1, 2, 3]}
        activePage={2}
      />
      <DocumentSplitExampleCard
        title="Model architecture"
        pages={[4, 5, 6, 7, 8]}
        className="border-blue-500/50 bg-blue-500/5"
      />
      <DocumentSplitExampleCard
        title="Training and results"
        pages={[9, 10, 11, 12, 13, 14, 15]}
      />
    </div>
  )
}

export function DocumentSplitsDemo() {
  const [isCodeVisible, setIsCodeVisible] = React.useState(false)

  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <DocumentSplits file="/samples/attention.pdf" />
      <div
        data-slot="code"
        data-mobile-code-visible={isCodeVisible}
        className="relative overflow-hidden **:data-[slot=copy-button]:right-4 **:data-[slot=copy-button]:hidden data-[mobile-code-visible=true]:**:data-[slot=copy-button]:flex [&_[data-rehype-pretty-code-figure]]:m-0! [&_[data-rehype-pretty-code-figure]]:rounded-t-none [&_[data-rehype-pretty-code-figure]]:border-t [&_pre]:max-h-72"
      >
        {isCodeVisible ? (
          <HighlightedCodeBlock
            code={documentSplitterUsageCode}
            className="rounded-none border-x-0 border-b-0"
          />
        ) : (
          <div className="relative">
            <HighlightedCodeBlock
              code={documentSplitterUsageCode}
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

const documentSplitterUsageCode = `"use client";

import { DocumentSplits } from "@/components/ui/document-splits";

export function DocumentSplitsExample() {
  return <DocumentSplits file="/samples/attention.pdf" className="h-[620px]" />;
}`

const documentSplitterSourceCode = `"use client";

import * as React from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type * as ReactPdf from "react-pdf";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type ReactPdfModule = typeof ReactPdf;
type PageId = string;
type SplitGroup = {
  id: string;
  title: string;
  pages: PageId[];
};

const DEFAULT_PAGE_COUNT = 15;
const THUMBNAIL_WIDTH = 72;
const THUMBNAIL_HEIGHT = 92;

function toPageId(pageNumber: number) {
  return "page-" + pageNumber;
}

function getPageNumber(pageId: PageId) {
  return Number(pageId.replace("page-", ""));
}

function createInitialGroups(pageCount: number): SplitGroup[] {
  const pages = Array.from({ length: pageCount }, (_, index) => toPageId(index + 1));

  return [
    { id: "split-1", title: "Abstract and intro", pages: pages.slice(0, Math.min(3, pageCount)) },
    { id: "split-2", title: "Model architecture", pages: pages.slice(3, Math.min(8, pageCount)) },
    { id: "split-3", title: "Training and results", pages: pages.slice(8) },
  ].filter((group) => group.pages.length > 0);
}

function findGroupId(groups: SplitGroup[], id: string) {
  if (groups.some((group) => group.id === id)) return id;
  return groups.find((group) => group.pages.includes(id))?.id ?? null;
}

function getGroupPages(groups: SplitGroup[], groupId: string | null) {
  return groups.find((group) => group.id === groupId)?.pages ?? [];
}

function movePageToGroup({
  activePageId,
  groups,
  insertIndex,
  targetGroupId,
}: {
  activePageId: PageId;
  groups: SplitGroup[];
  insertIndex: number;
  targetGroupId: string;
}) {
  return groups.map((group) => {
    const pagesWithoutActive = group.pages.filter((pageId) => pageId !== activePageId);

    if (group.id !== targetGroupId) {
      return { ...group, pages: pagesWithoutActive };
    }

    const nextPages = [...pagesWithoutActive];
    nextPages.splice(insertIndex, 0, activePageId);
    return { ...group, pages: nextPages };
  });
}

function reorderPageInGroup({
  activePageId,
  groups,
  overPageId,
}: {
  activePageId: PageId;
  groups: SplitGroup[];
  overPageId: PageId;
}) {
  const groupId = findGroupId(groups, activePageId);
  const pages = getGroupPages(groups, groupId);
  const activeIndex = pages.indexOf(activePageId);
  const overIndex = pages.indexOf(overPageId);

  if (!groupId || activeIndex === -1 || overIndex === -1) return groups;

  return groups.map((group) =>
    group.id === groupId ? { ...group, pages: arrayMove(group.pages, activeIndex, overIndex) } : group,
  );
}

function SplitDropzone({
  children,
  group,
}: {
  children: React.ReactNode;
  group: SplitGroup;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: group.id,
    data: { type: "page-dropzone", isEmpty: group.pages.length === 0 },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn("min-h-[116px] rounded-lg p-2", isOver && "bg-accent/30 ring-1 ring-border")}
    >
      {children}
    </div>
  );
}

function PageThumbnail({
  pageId,
  reactPdf,
}: {
  pageId: PageId;
  reactPdf: ReactPdfModule;
}) {
  const pageNumber = getPageNumber(pageId);
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: pageId,
    data: { type: "page" },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={cn(
        "relative shrink-0 cursor-grab overflow-hidden rounded-md border bg-muted shadow-xs active:cursor-grabbing",
        isDragging && "opacity-0",
      )}
      style={{
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_HEIGHT,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
    >
      <reactPdf.Thumbnail
        pageNumber={pageNumber}
        width={THUMBNAIL_WIDTH}
        renderTextLayer={false}
        className="absolute inset-0 block size-full [&_.react-pdf__Thumbnail__page]:!m-0 [&_.react-pdf__Thumbnail__page]:!size-full [&_.react-pdf__Thumbnail__page]:overflow-hidden [&_canvas]:!size-full [&_canvas]:object-cover"
        loading={<div className="absolute inset-0 animate-pulse bg-muted" />}
      />
      <span className="absolute right-1 bottom-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium shadow-xs">
        {pageNumber}
      </span>
    </button>
  );
}

function SplitGroupCard({
  group,
  reactPdf,
}: {
  group: SplitGroup;
  reactPdf: ReactPdfModule;
}) {
  return (
    <section className="rounded-lg border bg-background">
      <div className="flex items-center justify-between gap-3 border-b p-3">
        <div className="truncate text-sm font-medium">{group.title}</div>
        <div className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {group.pages.length} pages
        </div>
      </div>
      <SplitDropzone group={group}>
        <SortableContext items={group.pages} strategy={horizontalListSortingStrategy}>
          <ScrollArea
            className="h-[110px] w-full overflow-hidden"
            orientation="horizontal"
            scrollbarGutter
            scrollbarOverflowOnly
            viewportClassName="overflow-y-hidden"
          >
            <div className="flex w-max gap-2 overflow-y-hidden py-1 pr-6">
              {group.pages.map((pageId) => (
                <PageThumbnail key={pageId} pageId={pageId} reactPdf={reactPdf} />
              ))}
            </div>
          </ScrollArea>
        </SortableContext>
      </SplitDropzone>
    </section>
  );
}

export function DocumentSplits({
  file,
  workerUrl = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString(),
  className,
}: {
  file: string | File;
  workerUrl?: string;
  className?: string;
}) {
  const [reactPdf, setReactPdf] = React.useState<ReactPdfModule | null>(null);
  const [pageCount, setPageCount] = React.useState(0);
  const [groups, setGroups] = React.useState(() => createInitialGroups(DEFAULT_PAGE_COUNT));
  const [activePageId, setActivePageId] = React.useState<PageId | null>(null);
  const dragStartGroupIdRef = React.useRef<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  React.useEffect(() => {
    let mounted = true;

    void import("react-pdf").then((module) => {
      module.pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      if (mounted) setReactPdf(module);
    });

    return () => {
      mounted = false;
    };
  }, [workerUrl]);

  React.useEffect(() => {
    setGroups(createInitialGroups(pageCount || DEFAULT_PAGE_COUNT));
  }, [pageCount, file]);

  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    if (event.active.data.current?.type === "page") {
      const pageId = String(event.active.id);
      dragStartGroupIdRef.current = findGroupId(groups, pageId);
      setActivePageId(pageId);
    }
  }, [groups]);

  const handleDragOver = React.useCallback((event: DragOverEvent) => {
    if (event.active.data.current?.type !== "page" || !event.over) return;

    const pageId = String(event.active.id);
    const overId = String(event.over.id);

    setGroups((current) => {
      const sourceGroupId = findGroupId(current, pageId);
      const targetGroupId = findGroupId(current, overId);

      if (!sourceGroupId || !targetGroupId || sourceGroupId === targetGroupId) {
        return current;
      }

      const targetPages = getGroupPages(current, targetGroupId);
      const overIndex = targetPages.indexOf(overId);
      const insertIndex = overIndex === -1 ? targetPages.length : overIndex;

      return movePageToGroup({
        activePageId: pageId,
        groups: current,
        insertIndex,
        targetGroupId,
      });
    });
  }, []);

  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    if (event.active.data.current?.type !== "page" || !event.over) {
      dragStartGroupIdRef.current = null;
      setActivePageId(null);
      return;
    }

    const pageId = String(event.active.id);
    const overId = String(event.over.id);

    setGroups((current) => {
      const overGroupId = findGroupId(current, overId);
      if (dragStartGroupIdRef.current !== overGroupId) return current;

      return reorderPageInGroup({
        activePageId: pageId,
        groups: current,
        overPageId: overId,
      });
    });

    dragStartGroupIdRef.current = null;
    setActivePageId(null);
  }, []);

  const shell = (pdfModule: ReactPdfModule | null) => (
    <div className={cn("h-[620px] overflow-hidden bg-background", className)}>
      {pdfModule ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            dragStartGroupIdRef.current = null;
            setActivePageId(null);
          }}
        >
          <ScrollArea className="h-full" scrollFade>
            <div className="space-y-3 p-3">
              {groups.map((group) => (
                <SplitGroupCard key={group.id} group={group} reactPdf={pdfModule} />
              ))}
            </div>
          </ScrollArea>
          <DragOverlay>
            {activePageId ? (
              <div
                className="relative overflow-hidden rounded-md border bg-background shadow-lg"
                style={{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }}
              >
                <pdfModule.Thumbnail pageNumber={getPageNumber(activePageId)} width={THUMBNAIL_WIDTH} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="grid h-full place-items-center text-sm text-muted-foreground">Loading pages...</div>
      )}
    </div>
  );

  if (!reactPdf) {
    return shell(null);
  }

  return (
    <reactPdf.Document
      file={file}
      onLoadSuccess={({ numPages }) => setPageCount(numPages)}
      loading={shell(null)}
    >
      {shell(reactPdf)}
    </reactPdf.Document>
  );
}`

export function DocumentSplitsSource() {
  return <HighlightedCodeBlock code={documentSplitterSourceCode} />
}
