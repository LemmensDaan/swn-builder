import { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface Props {
  onClose: () => void;
}

export default function PDFViewer({ onClose }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [jumpInput, setJumpInput] = useState('1');
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  function onLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  // Track which page is visible using IntersectionObserver
  useEffect(() => {
    if (!numPages) return;
    const observer = new IntersectionObserver(
      entries => {
        // Find the entry with the greatest intersection ratio
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const page = Number((visible.target as HTMLElement).dataset.page);
          if (page) {
            setCurrentPage(page);
            setJumpInput(String(page));
          }
        }
      },
      { root: scrollRef.current, threshold: 0.3 }
    );

    pageRefs.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [numPages, scale]);

  const jumpTo = useCallback((page: number) => {
    const clamped = Math.max(1, Math.min(numPages, page));
    const el = pageRefs.current.get(clamped);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [numPages]);

  function handleJumpSubmit(e: React.FormEvent) {
    e.preventDefault();
    jumpTo(Number(jumpInput));
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center gap-3 flex-shrink-0">
        {/* Title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="text-amber-400 flex-shrink-0">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span className="text-amber-300 font-semibold text-sm truncate">
            Stars Without Number — Revised Deluxe Edition
          </span>
        </div>

        {/* Page indicator + jump */}
        {numPages > 0 && (
          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-gray-500 text-xs">p.</span>
            <input
              type="number"
              min={1}
              max={numPages}
              value={jumpInput}
              onChange={e => setJumpInput(e.target.value)}
              className="w-14 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-center text-gray-100 text-sm"
            />
            <button type="submit" className="text-xs text-gray-500 hover:text-amber-300 transition-colors">
              Go
            </button>
            <span className="text-gray-600 text-xs">/ {numPages}</span>
          </form>
        )}

        {/* Zoom */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setScale(s => Math.max(0.5, +(s - 0.2).toFixed(1)))}
            className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm flex items-center justify-center"
          >−</button>
          <span className="text-gray-500 text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(s => Math.min(3, +(s + 0.2).toFixed(1)))}
            className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm flex items-center justify-center"
          >+</button>
        </div>

        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium flex-shrink-0"
        >
          ✕ Close
        </button>
      </div>

      {/* Scrollable PDF */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-800">
        <Document
          file="/swn-rules.pdf"
          onLoadSuccess={onLoadSuccess}
          className="flex flex-col items-center py-4 gap-3"
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map(p => (
            <div
              key={p}
              data-page={p}
              ref={el => {
                if (el) pageRefs.current.set(p, el);
                else pageRefs.current.delete(p);
              }}
            >
              <Page
                pageNumber={p}
                scale={scale}
                renderTextLayer
                renderAnnotationLayer
                className="shadow-xl"
              />
            </div>
          ))}
        </Document>

        {numPages === 0 && (
          <div className="flex items-center justify-center h-64 text-gray-500">
            Loading rulebook…
          </div>
        )}
      </div>

      {/* Thin current-page footer */}
      {numPages > 0 && (
        <div className="bg-gray-900/80 border-t border-gray-800 py-1 flex justify-center">
          <span className="text-xs text-gray-600">Page {currentPage} of {numPages}</span>
        </div>
      )}
    </div>
  );
}
