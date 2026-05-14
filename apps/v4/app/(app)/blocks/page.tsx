import { PdfViewerBlocks } from "@/components/pdf-viewer-blocks"

export const dynamic = "force-static"
export const revalidate = false

export default async function BlocksPage() {
  return <PdfViewerBlocks />
}
