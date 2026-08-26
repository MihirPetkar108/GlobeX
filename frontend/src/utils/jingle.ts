/**
 * GlobeXAI — n8n Audio & Visual Celebration Engine
 * Plays a pleasant synthesizer chime ("jingle") and triggers custom visual toast
 * whenever an n8n workflow or ML model executes.
 */

import { toast } from "sonner";

class SoundManager {
  private audioCtx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Plays a crisp, cheerful 3-note ascending chime (C5 -> E5 -> G5 -> C6).
   */
  public playJingle(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, time: 0.00, dur: 0.12 }, // C5
        { freq: 659.25, time: 0.09, dur: 0.14 }, // E5
        { freq: 783.99, time: 0.18, dur: 0.16 }, // G5
        { freq: 1046.50, time: 0.28, dur: 0.32 }, // C6
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + time);

        // Soft envelope: fast attack, exponential decay
        gain.gain.setValueAtTime(0.0001, now + time);
        gain.gain.exponentialRampToValueAtTime(0.18, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.05);
      });
    } catch (e) {
      console.warn("Audio jingle suppressed by browser autoplay policy:", e);
    }
  }
}

export const soundManager = new SoundManager();

export interface N8nNotificationOptions {
  workflowName: string;
  executionId?: string;
  latencyMs?: number;
  summary?: string;
  modelsTriggered?: string[];
}

/**
 * Triggers the n8n celebration jingle and a stylish toast notification on the UI.
 */
export function notifyN8nWorkflow(options: N8nNotificationOptions): void {
  // 1. Play joyful jingle chime
  soundManager.playJingle();

  // 2. Format model tags
  const models = options.modelsTriggered || ["Trade Anomaly (XGBoost)", "Market Opportunity (GRU)", "CEPA Compliance"];
  const latency = options.latencyMs ? `${options.latencyMs}ms` : "< 300ms";

  // 3. Display celebratory toast
  toast.success(`⚡ n8n Workflow Executed!`, {
    description: `${options.workflowName} (${latency}) · ${options.summary || "All ML models synthesized successfully"}`,
    duration: 4500,
    className: "bg-[#0C121D] border border-amber-500/40 text-white font-mono shadow-2xl",
  });
}
