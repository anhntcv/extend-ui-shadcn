"use client"

import * as React from "react"
import { File01Icon, FileImageIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"

export type ThumbnailFile = {
  name: string
  type: string
  size?: string
}

export type FileThumbnailProps = {
  file: ThumbnailFile
  className?: string
  previewClassName?: string
  previewContent?: React.ReactNode
  previewImageUrl?: string | null
  isLoading?: boolean
  hasError?: boolean
  showMetadata?: boolean
}

function isImageFile(file: ThumbnailFile) {
  return file.type.startsWith("image/")
}

function FileKindIcon({ file }: { file: ThumbnailFile }) {
  const icon = isImageFile(file) ? FileImageIcon : File01Icon

  return <HugeiconsIcon icon={icon} className="size-4" />
}

export function FileThumbnailLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-10 overflow-hidden bg-muted">
      <style>{`
        @keyframes file-thumbnail-preview-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .file-thumbnail-preview-shimmer {
            animation: none !important;
            transform: translateX(0);
            opacity: 0.55;
          }
        }
      `}</style>
      <div className="absolute inset-0 bg-muted" />
      <div
        className="file-thumbnail-preview-shimmer absolute inset-0 bg-linear-to-r from-transparent via-background/65 to-transparent"
        style={{
          animation:
            "file-thumbnail-preview-shimmer 1.25s ease-in-out infinite",
        }}
      />
    </div>
  )
}

export function FileThumbnail({
  file,
  className,
  previewClassName,
  previewContent,
  previewImageUrl,
  isLoading = false,
  hasError = false,
  showMetadata = true,
}: FileThumbnailProps) {
  const imageRef = React.useRef<HTMLImageElement | null>(null)
  const [isImageLoading, setIsImageLoading] = React.useState(
    Boolean(previewImageUrl)
  )
  const [imageFailed, setImageFailed] = React.useState(false)
  const showLoading = isLoading || isImageLoading
  const hasPreviewContent = Boolean(previewContent)
  const showFallback =
    hasError || imageFailed || (!previewImageUrl && !hasPreviewContent)
  const markImageLoaded = React.useCallback((image: HTMLImageElement) => {
    const didLoad = image.naturalWidth > 0 && image.naturalHeight > 0

    setImageFailed(!didLoad)
    setIsImageLoading(false)
  }, [])

  React.useEffect(() => {
    setIsImageLoading(Boolean(previewImageUrl))
    setImageFailed(false)
  }, [previewImageUrl])

  React.useEffect(() => {
    const image = imageRef.current

    if (!image || !previewImageUrl) return

    if (image.complete) {
      markImageLoaded(image)
    }
  }, [markImageLoaded, previewImageUrl])

  return (
    <div
      className={cn(
        "group overflow-hidden rounded-lg border bg-background text-foreground",
        className
      )}
    >
      <div
        className={cn(
          "relative aspect-square overflow-hidden bg-muted",
          previewClassName
        )}
      >
        {previewImageUrl ? (
          <img
            ref={imageRef}
            src={previewImageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className={cn(
              "size-full object-cover transition-[opacity,filter,transform] duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              showLoading
                ? "scale-[1.01] opacity-0 blur-sm"
                : "blur-0 scale-100 opacity-100"
            )}
            onLoad={(event) => {
              markImageLoaded(event.currentTarget)
            }}
            onError={() => {
              setImageFailed(true)
              setIsImageLoading(false)
            }}
          />
        ) : null}
        {previewContent ? (
          <div
            className={cn(
              "size-full transition-[opacity,filter,transform] duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              showLoading
                ? "scale-[1.01] opacity-0 blur-sm"
                : "blur-0 scale-100 opacity-100"
            )}
          >
            {previewContent}
          </div>
        ) : null}
        {showLoading ? <FileThumbnailLoadingOverlay /> : null}
        {showFallback ? (
          <div className="absolute inset-0 grid place-items-center bg-muted text-muted-foreground">
            <FileKindIcon file={file} />
          </div>
        ) : null}
      </div>
      {showMetadata ? (
        <div className="flex items-center gap-2 border-t px-3 py-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
            <FileKindIcon file={file} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{file.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {file.size ?? file.type}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
