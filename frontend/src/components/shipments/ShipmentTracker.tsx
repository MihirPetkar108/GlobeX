import { ShipmentEvent } from "@/types/trade";
import { DEMO_SHIPMENT_EVENT } from "@/data/mockTradeData";
import { Ship, Thermometer, Droplets, CheckCircle2 } from "lucide-react";

interface ShipmentTrackerProps {
  shipment?: ShipmentEvent;
}

export const ShipmentTracker = ({ shipment = DEMO_SHIPMENT_EVENT }: ShipmentTrackerProps) => {
  return (
    <div className="p-5 bg-white border border-slate-200/90 rounded-2xl space-y-5 select-none shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
            <Ship className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-900">
                Cargo & IoT Telemetry
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                DEMO DATA
              </span>
            </div>
            <p className="text-xs text-slate-500 font-sans">
              Vessel: <strong className="text-slate-900">{shipment.vesselName}</strong> · Voyage: {shipment.voyageNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-500">Carrier:</span>
          <span className="text-slate-900 font-semibold">{shipment.carrier}</span>
        </div>
      </div>

      {/* Real-time Telemetry Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
          <div className="text-[10px] font-mono uppercase text-slate-500">Current Coordinates</div>
          <div className="text-sm font-mono font-bold text-slate-900">
            {shipment.coordinates[0]}°N, {shipment.coordinates[1]}°E
          </div>
          <div className="text-[10px] font-mono text-sky-600 truncate">{shipment.location}</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
          <div className="text-[10px] font-mono uppercase text-slate-500">Estimated Arrival (ETA)</div>
          <div className="text-sm font-mono font-bold text-emerald-600">Aug 18, 2026 08:00</div>
          <div className="text-[10px] font-mono text-slate-500">Jebel Ali Berth 2</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
          <div className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
            <Thermometer className="w-3 h-3 text-sky-600" /> Container Temp
          </div>
          <div className="text-sm font-mono font-bold text-slate-900">
            {shipment.temperatureCelsius}°C
          </div>
          <div className="text-[10px] font-mono text-emerald-600">Within Optimal Spec (20-25°C)</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
          <div className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
            <Droplets className="w-3 h-3 text-sky-600" /> Relative Humidity
          </div>
          <div className="text-sm font-mono font-bold text-slate-900">
            {shipment.humidityPercent}%
          </div>
          <div className="text-[10px] font-mono text-emerald-600">Controlled Agri Grade</div>
        </div>
      </div>

      {/* Step-by-Step Waypoint Milestones */}
      <div className="space-y-3">
        <div className="text-xs font-mono font-semibold uppercase text-slate-500 tracking-wider">
          Voyage Milestones & Checkpoints
        </div>

        <div className="space-y-2 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
          {shipment.milestones.map((ms) => (
            <div key={ms.title} className="relative flex items-start gap-4 pl-8">
              <div
                className={`absolute left-1.5 top-1 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                  ms.completed
                    ? "bg-emerald-500 border-white text-white"
                    : ms.current
                    ? "bg-sky-500 border-white animate-pulse"
                    : "bg-white border-slate-300"
                }`}
              />
              <div className="flex-1 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>{ms.title}</span>
                    {ms.current && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 border border-sky-200">
                        CURRENT LOCATION
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">{ms.location}</div>
                </div>

                <div className="text-right text-[11px] font-mono">
                  {ms.completed ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {ms.timestamp ? new Date(ms.timestamp).toLocaleDateString() : "Completed"}
                    </span>
                  ) : ms.current ? (
                    <span className="text-sky-600">In Transit (ETA 2 Days)</span>
                  ) : (
                    <span className="text-slate-400">{ms.timestamp ? new Date(ms.timestamp).toLocaleDateString() : "Pending"}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShipmentTracker;
