import React, { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { aiService, HSCodeSearchMatch } from "@/services/api/aiService";
import { cn } from "@/lib/utils";

interface LiveProductSearchProps {
  value: string;
  onChange: (productName: string) => void;
  onSelect: (match: HSCodeSearchMatch) => void;
  placeholder?: string;
  className?: string;
}

const DEBOUNCE_MS = 250;
const MAX_RESULTS = 3;

/**
 * Free-text product search box backed by the real, live
 * GET /predict/hs-code/search catalogue endpoint — shows exactly the next
 * 3 matches as the user types. Not a <select>/dropdown of a static list.
 */
export const LiveProductSearch: React.FC<LiveProductSearchProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = "Type a product to export (e.g. 'basmati', 'cotton yarn', 'solar')...",
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [matches, setMatches] = useState<HSCodeSearchMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const query = value.trim();
    if (!query) {
      setMatches([]);
      setLoading(false);
      return;
    }
    const thisRequestId = ++requestIdRef.current;
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await aiService.searchHSCodes(query);
      if (requestIdRef.current !== thisRequestId) return; // stale response, a newer keystroke superseded it
      setMatches(results.slice(0, MAX_RESULTS));
      setLoading(false);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const handleSelect = (match: HSCodeSearchMatch) => {
    onChange(match.productDescription);
    onSelect(match);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-[var(--surface-1)] border border-[var(--hairline-strong)] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-sky-500 transition-colors shadow-inner"
        />
        {loading ? (
          <Loader2 className="w-4 h-4 text-sky-600 absolute left-3.5 top-3.5 animate-spin" />
        ) : (
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-3.5 pointer-events-none" />
        )}
      </div>

      {isOpen && value.trim() && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-[var(--surface-1)] border border-sky-500/30 rounded-2xl shadow-2xl overflow-hidden">
          {matches.length === 0 ? (
            <div className="p-3.5 text-center text-xs text-[var(--text-secondary)] font-sans">
              {loading ? "Searching live catalogue..." : `No matching HS6 product for "${value}".`}
            </div>
          ) : (
            <ul className="py-1 divide-y divide-[var(--hairline)]">
              {matches.map((m) => (
                <li
                  key={m.hs6}
                  onClick={() => handleSelect(m)}
                  className="px-4 py-2.5 cursor-pointer flex items-center justify-between gap-3 hover:bg-[var(--surface-3)] transition-colors"
                >
                  <span className="text-sm text-[var(--text-primary)] font-sans truncate">{m.productDescription}</span>
                  <span className="shrink-0 px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-600 text-[10px] font-mono font-bold">
                    HS {m.hsCodeFormatted}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveProductSearch;
