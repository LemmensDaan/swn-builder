interface Props {
  page: number | string;
  note?: string;
}

/**
 * Small inline badge that cites the SWN Revised Deluxe page number.
 * Hover shows an optional note.
 */
export default function PageRef({ page, note }: Props) {
  return (
    <span
      className="inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono
                 bg-gray-700 text-gray-400 border border-gray-600
                 cursor-help relative group"
      title={note ? `p.${page} — ${note}` : `SWN Revised Deluxe p.${page}`}
    >
      p.{page}
      {note && (
        <span
          className="pointer-events-none absolute bottom-full left-0 mb-1.5 w-64 z-50
                     bg-gray-900 border border-gray-600 rounded-lg px-3 py-2
                     text-xs text-gray-300 leading-relaxed shadow-xl
                     opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        >
          <span className="text-amber-400 font-semibold block mb-1">p.{page}</span>
          {note}
        </span>
      )}
    </span>
  );
}
