import React, { useMemo } from "react";
import { FLAGSHIP_DEMO_TRADE, DEMO_SHIPMENT_EVENT } from "@/data/mockTradeData";
import { Ship, Anchor, Navigation, Clock } from "lucide-react";

interface ShipmentRouteMapProps {
  originCountry?: string;
  originPort?: string;
  destCountry?: string;
  destPort?: string;
  status?: string;
  vesselName?: string;
  carrier?: string;
  eta?: string;
}

/** Minimal ISO-3166 lookup for the countries this demo trades between — falls
 *  back to a globe glyph for anything not covered rather than guessing. */
const COUNTRY_ISO: Record<string, string> = {
  india: "IN",
  uae: "AE",
  "united arab emirates": "AE",
  "united states": "US",
  usa: "US",
  china: "CN",
  "united kingdom": "GB",
  singapore: "SG",
  germany: "DE",
};

function flagEmoji(country: string): string {
  const iso = COUNTRY_ISO[country.trim().toLowerCase()];
  if (!iso) return "🌐";
  const codePoints = [...iso.toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/** 0–1 progress along the route inferred from shipment status — this is the
 *  only piece of "telemetry" the hero visual needs. */
const STATUS_PROGRESS: Record<string, number> = {
  "Order Confirmed": 0.06,
  Dispatched: 0.28,
  "In Transit": 0.55,
  "Customs Cleared": 0.82,
  Arrived: 0.95,
  Inspected: 1,
};

// Route drawn on a 1000×360 canvas — coordinates below are expressed as
// percentages of that canvas so the HTML pin labels line up with the SVG path.
const P0 = { x: 110, y: 250 };
const P2 = { x: 890, y: 130 };
const CTRL = { x: (P0.x + P2.x) / 2, y: Math.min(P0.y, P2.y) - 110 };

function bezierPoint(t: number, p0: typeof P0, c: typeof CTRL, p2: typeof P2) {
  const x = (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * c.x + t ** 2 * p2.x;
  const y = (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * c.y + t ** 2 * p2.y;
  return { x, y };
}

export const ShipmentRouteMap: React.FC<ShipmentRouteMapProps> = ({
  originCountry = FLAGSHIP_DEMO_TRADE.exporterCountry,
  originPort = FLAGSHIP_DEMO_TRADE.exporterPort,
  destCountry = FLAGSHIP_DEMO_TRADE.importerCountry,
  destPort = FLAGSHIP_DEMO_TRADE.importerPort,
  status = DEMO_SHIPMENT_EVENT.status,
  vesselName = DEMO_SHIPMENT_EVENT.vesselName,
  carrier = DEMO_SHIPMENT_EVENT.carrier,
  eta = DEMO_SHIPMENT_EVENT.eta,
}) => {
  const progress = STATUS_PROGRESS[status] ?? 0.5;
  const shipPos = useMemo(() => bezierPoint(progress, P0, CTRL, P2), [progress]);
  const pathD = `M ${P0.x},${P0.y} Q ${CTRL.x},${CTRL.y} ${P2.x},${P2.y}`;

  const nextMilestone = DEMO_SHIPMENT_EVENT.milestones.find((m) => !m.completed);

  const toPct = (pt: { x: number; y: number }) => ({
    left: `${(pt.x / 1000) * 100}%`,
    top: `${(pt.y / 360) * 100}%`,
  });

  return (
    <div className="space-y-4 select-none">
      {/* ── HERO: Origin → Destination Route Map ────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden border border-sky-200/80 bg-gradient-to-br from-sky-100 via-blue-50 to-emerald-50 shadow-sm">
        {/* Status pill */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur border border-sky-200 shadow-2xs">
          <Ship className="w-3.5 h-3.5 text-sky-600" />
          <span className="text-xs font-bold text-slate-900">{status}</span>
        </div>

        {eta && (
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur border border-sky-200 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700">
              ETA {new Date(eta).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
        )}

        {/* Route canvas */}
        <div className="relative w-full aspect-[1000/430] sm:aspect-[1000/360]">
          <svg viewBox="0 0 1000 360" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full">
            <defs>
              <pattern id="graticule" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(15,23,42,0.05)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="1000" height="360" fill="url(#graticule)" />

            {/* Full route (dashed) */}
            <path d={pathD} fill="none" stroke="rgba(100,116,139,0.35)" strokeWidth="2.5" strokeDasharray="1 10" strokeLinecap="round" />

            {/* Traveled portion (solid, animated draw-in) */}
            <path
              d={pathD}
              fill="none"
              stroke="#0EA5E9"
              strokeWidth="3"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={100}
              strokeDashoffset={100 - progress * 100}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />

            {/* Origin pin */}
            <circle cx={P0.x} cy={P0.y} r="7" fill="#0F172A" />
            <circle cx={P0.x} cy={P0.y} r="12" fill="none" stroke="#0F172A" strokeOpacity="0.25" strokeWidth="2" />

            {/* Destination pin */}
            <circle cx={P2.x} cy={P2.y} r="7" fill="#0F9D6B" />
            <circle cx={P2.x} cy={P2.y} r="12" fill="none" stroke="#0F9D6B" strokeOpacity="0.3" strokeWidth="2" />
          </svg>

          {/* Ship marker (HTML, positioned over the SVG point) */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
            style={toPct(shipPos)}
          >
            <div className="relative flex items-center justify-center">
              <span className="absolute w-8 h-8 rounded-full bg-sky-400/40 animate-ping" />
              <span className="relative w-8 h-8 rounded-full bg-sky-600 border-2 border-white shadow-md flex items-center justify-center text-white">
                <Ship className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* Origin label — anchored below its pin */}
          <div className="absolute -translate-x-1/2" style={toPct(P0)}>
            <div className="mt-3 px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-sm text-center min-w-[130px] max-w-[160px]">
              <div className="text-lg leading-none mb-1">{flagEmoji(originCountry)}</div>
              <div className="text-xs font-bold text-slate-900 truncate">{originCountry}</div>
              <div className="text-[10px] text-slate-500 font-sans truncate">{originPort}</div>
            </div>
          </div>

          {/* Destination label — anchored above its pin */}
          <div className="absolute -translate-x-1/2 -translate-y-full" style={toPct(P2)}>
            <div className="-mt-3 px-3 py-2 rounded-xl bg-white border border-emerald-200 shadow-sm text-center min-w-[130px] max-w-[160px]">
              <div className="text-lg leading-none mb-1">{flagEmoji(destCountry)}</div>
              <div className="text-xs font-bold text-slate-900 truncate">{destCountry}</div>
              <div className="text-[10px] text-slate-500 font-sans truncate">{destPort}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Minimal supporting info strip ───────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-xl bg-white border border-slate-200/90 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
            <Anchor className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase text-slate-400">Vessel</div>
            <div className="text-xs font-bold text-slate-900 truncate">{vesselName}</div>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-white border border-slate-200/90 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
            <Navigation className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase text-slate-400">Carrier</div>
            <div className="text-xs font-bold text-slate-900 truncate">{carrier}</div>
          </div>
        </div>
        {nextMilestone && (
          <div className="p-3 rounded-xl bg-white border border-slate-200/90 flex items-center gap-2.5 col-span-2 sm:col-span-1">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase text-slate-400">Next Checkpoint</div>
              <div className="text-xs font-bold text-slate-900 truncate">{nextMilestone.title}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShipmentRouteMap;
