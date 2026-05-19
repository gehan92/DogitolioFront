'use client'
import { useState, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ExternalLink, FileText } from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'

// Set worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

export default function MenuViewer({ pdfUrl, restaurantName }) {
  const [numPages, setNumPages]   = useState(null)
  const [pageNum,  setPageNum]    = useState(1)
  const [scale,    setScale]      = useState(1.0)
  const [loading,  setLoading]    = useState(true)
  const [error,    setError]      = useState(null)

  const onLoad = useCallback(({ numPages }) => {
    setNumPages(numPages)
    setLoading(false)
  }, [])

  if (!pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-surface-secondary flex items-center justify-center mb-4">
          <FileText size={24} className="text-[var(--c-dim)]" />
        </div>
        <p className="font-semibold text-[var(--c-text)] mb-1">Menu not available yet</p>
        <p className="text-sm text-[var(--c-muted)]">The menu PDF hasn't been uploaded yet. Check back soon.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Controls */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 p-3 bg-surface-secondary rounded-2xl">
        <div className="flex items-center gap-2">
          <button onClick={() => setPageNum(p => Math.max(1, p-1))} disabled={pageNum <= 1}
            className="p-2 rounded-xl hover:bg-white disabled:opacity-40 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-[var(--c-text)] min-w-[80px] text-center">
            {loading ? '…' : `${pageNum} / ${numPages}`}
          </span>
          <button onClick={() => setPageNum(p => Math.min(numPages || p, p+1))} disabled={pageNum >= (numPages || 1)}
            className="p-2 rounded-xl hover:bg-white disabled:opacity-40 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setScale(s => Math.max(.5, s-.1))}
            className="p-2 rounded-xl hover:bg-white transition-colors" title="Zoom out">
            <ZoomOut size={16} />
          </button>
          <span className="text-xs font-mono w-12 text-center text-[var(--c-muted)]">{Math.round(scale*100)}%</span>
          <button onClick={() => setScale(s => Math.min(2.5, s+.1))}
            className="p-2 rounded-xl hover:bg-white transition-colors" title="Zoom in">
            <ZoomIn size={16} />
          </button>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
            className="p-2 rounded-xl hover:bg-white transition-colors ml-2" title="Open in new tab">
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      {/* PDF */}
      <div className="w-full overflow-auto rounded-2xl border border-[var(--c-border)] bg-[#f0ede8]">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Spinner size={28} />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <p className="font-semibold text-[var(--c-text)] mb-2">Couldn't load menu</p>
            <p className="text-sm text-[var(--c-muted)] mb-4">{error}</p>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline">
                <ExternalLink size={14} /> Open PDF directly
              </Button>
            </a>
          </div>
        )}

        <Document
          file={pdfUrl}
          onLoadSuccess={onLoad}
          onLoadError={(err) => { setError(err.message); setLoading(false) }}
          className="flex justify-center p-4"
          loading=""
        >
          <Page
            pageNumber={pageNum}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={false}
            className="shadow-card"
          />
        </Document>
      </div>

      {/* Page thumbnails for multi-page menus */}
      {numPages > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 w-full">
          {Array.from({ length: numPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPageNum(p)}
              className={`shrink-0 w-12 h-16 rounded-lg border-2 text-xs font-semibold transition-colors ${
                p === pageNum
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-[var(--c-border)] bg-white text-[var(--c-muted)] hover:border-brand-300'
              }`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
