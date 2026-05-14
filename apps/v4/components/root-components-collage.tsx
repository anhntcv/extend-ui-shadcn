"use client"

import type * as React from "react"
import dynamic from "next/dynamic"

import { Citations } from "@/components/citations-docs"
import { CsvViewerPreviewClient } from "@/components/csv-viewer-docs"
import { FileThumbnail } from "@/components/file-thumbnail-docs"
import { FileUpload } from "@/components/file-upload-docs"
import { OcrBlocks } from "@/components/ocr-blocks-docs"

const PdfViewerPreviewClient = dynamic(
  () =>
    import("@/components/pdf-viewer-preview-client").then(
      (module) => module.PdfViewerPreviewClient
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[560px] place-items-center bg-background text-sm text-muted-foreground">
        Loading PDF viewer...
      </div>
    ),
  }
)

const thumbnailFiles = [
  {
    name: "attention.pdf",
    type: "application/pdf",
    url: "/samples/attention.pdf",
    size: "15 pages",
  },
  {
    name: "opengraph-image.png",
    type: "image/png",
    url: "/opengraph-image.png",
    size: "1200 x 630",
  },
]

export function MobileRootPreview() {
  return (
    <ComponentCrop className="h-[560px]">
      <PdfViewerPreviewClient />
    </ComponentCrop>
  )
}

export function RootComponentsCollage() {
  return (
    <div className="mx-auto grid gap-4 py-1 md:grid-cols-2 lg:grid-cols-3">
      <div className="flex flex-col gap-4">
        <ComponentCrop className="h-[560px]">
          <PdfViewerPreviewClient />
        </ComponentCrop>
        <ThumbnailPair />
      </div>
      <div className="flex flex-col gap-4">
        <ComponentCrop className="h-[280px]">
          <FileUpload className="p-4" />
        </ComponentCrop>
        <ComponentCrop className="h-[400px]">
          <CsvViewerPreviewClient />
        </ComponentCrop>
      </div>
      <div className="flex flex-col gap-4">
        <ComponentCrop className="h-[430px]">
          <Citations />
        </ComponentCrop>
        <ComponentCrop className="h-[430px]">
          <OcrBlocks />
        </ComponentCrop>
      </div>
    </div>
  )
}

function ComponentCrop({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={["overflow-hidden rounded-lg", className].join(" ")}>
      {children}
    </div>
  )
}

function ThumbnailPair() {
  return (
    <div className="grid gap-3 overflow-hidden rounded-lg bg-background p-3 sm:grid-cols-2">
      {thumbnailFiles.map((file, index) => (
        <FileThumbnail
          key={file.url}
          file={file}
          showMetadata={false}
          thumbnailWidth={220}
          loadingDelayMs={index === 1 ? 1600 : 0}
        />
      ))}
    </div>
  )
}
