import Link from "next/link"

import { getPagesFromFolder, type PageTreeFolder } from "@/lib/page-tree"
import { cn } from "@/lib/utils"

const PDF_VIEWER_SUBPAGE_LINKS = [
  {
    $id: "pdf-viewer/citations",
    name: "Citations",
    url: "/docs/components/pdf-viewer/citations",
  },
  {
    $id: "pdf-viewer/ocr-blocks",
    name: "OCR Blocks",
    url: "/docs/components/pdf-viewer/ocr-blocks",
  },
  {
    $id: "pdf-viewer/e-signature",
    name: "E-Signature",
    url: "/docs/components/pdf-viewer/e-signature",
  },
  {
    $id: "pdf-viewer/human-review",
    name: "Human Review",
    url: "/docs/components/pdf-viewer/human-review",
  },
  {
    $id: "pdf-viewer/document-splits",
    name: "Document Splits",
    url: "/docs/components/pdf-viewer/document-splits",
  },
]

export function ComponentsList({
  componentsFolder,
  currentBase,
}: {
  componentsFolder: PageTreeFolder
  currentBase: string
}) {
  const pages = getPagesFromFolder(componentsFolder, currentBase)
  const pageUrls = new Set(pages.map((page) => page.url))
  const list = pages.flatMap((page) => {
    if (page.url !== "/docs/components/pdf-viewer") {
      return [page]
    }

    return [
      page,
      ...PDF_VIEWER_SUBPAGE_LINKS.filter((link) => !pageUrls.has(link.url)),
    ]
  })

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-x-8 lg:gap-x-16 lg:gap-y-6 xl:gap-x-20">
      {list.map((component) => (
        <Link
          key={component.$id}
          href={component.url}
          className={cn(
            "inline-flex items-center gap-2 text-lg font-medium underline-offset-4 hover:underline md:text-base",
            component.url.includes("/pdf-viewer/") &&
              "pl-4 text-muted-foreground"
          )}
        >
          {component.name}
        </Link>
      ))}
    </div>
  )
}
