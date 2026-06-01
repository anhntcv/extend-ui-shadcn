"use client"

import { PDFViewer } from "@/components/ui/pdf-viewer"

const SAMPLE_PDF_URL = "/samples/attention.pdf"

export function PdfViewerPreviewClient({
  showRotateControls = true,
}: {
  showRotateControls?: boolean
}) {
  return (
    <PDFViewer
      file={SAMPLE_PDF_URL}
      className="h-[560px]"
      defaultThumbnailSidebarOpen={false}
      showRotateControls={showRotateControls}
    />
  )
}
