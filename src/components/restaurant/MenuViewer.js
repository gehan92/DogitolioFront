'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ZoomIn, ZoomOut, ExternalLink, Download, FileText } from 'lucide-react'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export default function MenuViewer({ pdfUrl, restaurantName }) {
  const [numPages,   setNumPages]   = useState(null)
  const [scale,      setScale]      = useState(1.0)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const containerRef = useRef(null)
  const [containerW, setContainerW] = useState(700)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([e]) => setContainerW(e.contentRect.width))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const onLoad = useCallback(({ numPages }) => {
    setNumPages(numPages)
    setLoading(false)
  }, [])

  const pageWidth = Math.min(containerW - 32, 860) * scale

  if (!pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
          <FileText size={28} className="text-gray-300" />
        </div>
        <p className="font-semibold text-gray-700 mb-1">Menu not uploaded yet</p>
        <p className="text-sm text-gray-400">The restaurant hasn&apos;t uploaded their menu PDF yet. Check back soon.</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-4">

      {/* ── Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-100">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
          <FileText size={14} className="text-gray-400" />
          {restaurantName ? `${restaurantName} — Menu` : 'Menu'}
          {numPages && (
            <span className="ml-1 text-xs font-normal text-gray-400">
              ({numPages} {numPages === 1 ? 'page' : 'pages'})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setScale(s => Math.max(0.5, +(s - 0.15).toFixed(2)))}
            className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-gray-200 transition-all text-gray-500" title="Zoom out">
            <ZoomOut size={14} />
          </button>
          <span className="text-xs font-mono w-9 text-center text-gray-400">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(2.5, +(s + 0.15).toFixed(2)))}
            className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-gray-200 transition-all text-gray-500" title="Zoom in">
            <ZoomIn size={14} />
          </button>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
            className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-gray-200 transition-all text-gray-500" title="Open in new tab">
            <ExternalLink size={14} />
          </a>
          <a href={pdfUrl} download
            className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-gray-200 transition-all text-gray-500" title="Download PDF">
            <Download size={14} />
          </a>
        </div>
      </div>

      {/* ── All pages rendered vertically */}
      <div className="w-full rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#1a1a2e 0%,#2d1b4e 60%,#0f1f3c 100%)' }}>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-9 h-9 rounded-full border-[3px] border-white/20 border-t-white animate-spin" />
            <p className="text-white/50 text-sm font-medium">Loading menu…</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6 gap-4">
            <FileText size={36} className="text-white/25" />
            <p className="font-bold text-white">Couldn&apos;t load menu PDF</p>
            <p className="text-sm text-white/50">{error}</p>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold transition-colors">
              <ExternalLink size={14} /> Open PDF directly
            </a>
          </div>
        )}

        <Document
          file={pdfUrl}
          onLoadSuccess={onLoad}
          onLoadError={(err) => { setError(err.message); setLoading(false) }}
          className="flex flex-col items-center gap-6 py-8 px-4"
          loading=""
        >
          {numPages && Array.from({ length: numPages }, (_, i) => i + 1).map(p => (
            <div key={p} className="flex flex-col items-center gap-2 w-full">
              <Page
                pageNumber={p}
                width={pageWidth}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="rounded-2xl overflow-hidden"
                style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.55)' }}
              />
              {numPages > 1 && (
                <span className="px-3 py-0.5 rounded-full bg-black/40 text-white/50 text-[11px] font-medium">
                  {p} / {numPages}
                </span>
              )}
            </div>
          ))}
        </Document>
      </div>

      <p className="text-xs text-gray-400 text-center pb-2">
        Prices shown may vary. Contact the restaurant to confirm availability.
      </p>
    </div>
  )
}
