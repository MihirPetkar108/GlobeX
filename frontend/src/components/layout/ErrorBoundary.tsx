import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home, Zap, Server, RefreshCw, Copy, Check } from "lucide-react";
import SpecularButton from "@/components/ui/SpecularButton";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  private handleRetry = () => {
    const errorMsg = this.state.error?.message || "";
    // If it is a chunk load error or dynamically imported module failure, force reload the page
    if (
      errorMsg.includes("dynamically imported module") ||
      errorMsg.includes("Failed to fetch dynamically imported module") ||
      errorMsg.includes("loading chunk")
    ) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleCopyError = () => {
    if (this.state.error) {
      navigator.clipboard.writeText(
        `${this.state.error.name}: ${this.state.error.message}\n\nStack:\n${this.state.error.stack || ""}`
      );
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMsg = this.state.error?.message || "";
      const isN8nError =
        errorMsg.toLowerCase().includes("n8n") ||
        errorMsg.includes("5678") ||
        errorMsg.includes("webhook") ||
        errorMsg.includes("analyze-trade");

      const isModuleLoadError =
        errorMsg.includes("dynamically imported module") ||
        errorMsg.includes("Failed to fetch dynamically imported module") ||
        errorMsg.includes("loading chunk");

      const isBackendError =
        errorMsg.includes("8000") ||
        errorMsg.includes("ConnectionRefused") ||
        errorMsg.toLowerCase().includes("failed to fetch");

      // ───────────────────────────────────────────────────────────
      // Case 1: n8n Automation Engine Offline / Webhook Unreachable
      // ───────────────────────────────────────────────────────────
      if (isN8nError) {
        return (
          <div className="min-h-screen bg-[#070B12] text-slate-100 flex items-center justify-center p-6 select-none font-sans">
            <div className="max-w-lg w-full p-8 rounded-3xl bg-[#0C121D] border border-amber-500/40 shadow-2xl space-y-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-950/80 border border-amber-500/40 text-amber-400 mx-auto flex items-center justify-center shadow-lg">
                <Zap className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                  N8N AUTOMATION ENGINE ERROR
                </span>
                <h2 className="text-2xl font-display font-bold text-white">
                  n8n Webhook / Engine Unreachable
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The workflow failed because the local n8n automation engine or webhook listener is not responding on port 5678.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-black/50 border border-amber-500/20 text-left space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-amber-400 text-[11px] font-bold">
                  <span>Diagnostic Summary:</span>
                  <span>HTTP 5678 / Webhook</span>
                </div>
                <p className="text-amber-200/90 break-all">{errorMsg}</p>
                <div className="pt-2 border-t border-white/[0.06] text-slate-400 space-y-1.5 text-[11px]">
                  <div className="text-slate-300 font-bold">How to start n8n:</div>
                  <div>
                    <span className="text-amber-400 font-semibold">Docker:</span>{" "}
                    <code className="text-amber-200 bg-black/60 px-1 py-0.5 rounded break-all select-all">
                      docker run -it --rm --name n8n -p 5678:5678 --add-host=host.docker.internal:host-gateway -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
                    </code>
                  </div>
                  <div>
                    <span className="text-slate-400">or Local:</span>{" "}
                    <code className="text-slate-300 bg-black/60 px-1 py-0.5 rounded">n8n start</code>
                  </div>
                  <div className="pt-1">
                    Open <code className="text-amber-300 bg-black/60 px-1 py-0.5 rounded">http://localhost:5678</code> &rarr; Import{" "}
                    <code className="text-slate-200">backend/brain/n8n/globex_docker_master_workflow.json</code> &rarr; Toggle <strong className="text-emerald-400">Active</strong>.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <SpecularButton
                  onClick={this.handleRetry}
                  variant="outline"
                  size="sm"
                  radius={12}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  iconPosition="left"
                  className="flex-1"
                >
                  Retry Webhook
                </SpecularButton>

                <SpecularButton
                  onClick={this.handleReset}
                  variant="emerald"
                  size="sm"
                  radius={12}
                  icon={<Home className="w-3.5 h-3.5" />}
                  iconPosition="left"
                  className="flex-1"
                >
                  Command Center
                </SpecularButton>
              </div>
            </div>
          </div>
        );
      }

      // ───────────────────────────────────────────────────────────
      // Case 2: Vite Hot Reload / Chunk Load Exception
      // ───────────────────────────────────────────────────────────
      if (isModuleLoadError) {
        return (
          <div className="min-h-screen bg-[#070B12] text-slate-100 flex items-center justify-center p-6 select-none font-sans">
            <div className="max-w-md w-full p-8 rounded-3xl bg-[#0C121D] border border-sky-500/30 shadow-2xl space-y-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-sky-950/80 border border-sky-500/40 text-sky-400 mx-auto flex items-center justify-center shadow-lg">
                <RefreshCw className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-sky-400 font-bold">
                  APPLICATION CODE RELOADED
                </span>
                <h2 className="text-2xl font-display font-bold text-white">Fresh Assets Available</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Vite development server updated the application bundles. Click below to load the latest module chunks.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] text-left">
                <p className="text-[11px] font-mono text-sky-300 break-all">
                  {errorMsg}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <SpecularButton
                  onClick={this.handleRetry}
                  variant="emerald"
                  size="sm"
                  radius={12}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                  iconPosition="left"
                  className="w-full"
                >
                  Reload Application
                </SpecularButton>
              </div>
            </div>
          </div>
        );
      }

      // ───────────────────────────────────────────────────────────
      // Case 3: FastAPI Backend Server Offline
      // ───────────────────────────────────────────────────────────
      if (isBackendError) {
        return (
          <div className="min-h-screen bg-[#070B12] text-slate-100 flex items-center justify-center p-6 select-none font-sans">
            <div className="max-w-lg w-full p-8 rounded-3xl bg-[#0C121D] border border-rose-500/30 shadow-2xl space-y-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-400 mx-auto flex items-center justify-center shadow-lg">
                <Server className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-rose-400 font-bold">
                  BACKEND SERVICE OFFLINE
                </span>
                <h2 className="text-2xl font-display font-bold text-white">
                  FastAPI Engine Unreachable
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Could not establish connection to the GlobeX Trade OS backend service at <code className="text-rose-300 font-mono">http://localhost:8000</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-black/50 border border-rose-500/20 text-left space-y-2 text-xs font-mono">
                <p className="text-rose-300 break-all">{errorMsg}</p>
                <div className="pt-2 border-t border-white/[0.06] text-slate-400 space-y-1 text-[11px]">
                  <div className="text-slate-300 font-bold">How to start backend:</div>
                  <div>Run <code className="text-emerald-300 bg-black/60 px-1.5 py-0.5 rounded">python main.py</code> in project root.</div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <SpecularButton
                  onClick={this.handleRetry}
                  variant="outline"
                  size="sm"
                  radius={12}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  iconPosition="left"
                  className="flex-1"
                >
                  Retry Connection
                </SpecularButton>

                <SpecularButton
                  onClick={this.handleReset}
                  variant="emerald"
                  size="sm"
                  radius={12}
                  icon={<Home className="w-3.5 h-3.5" />}
                  iconPosition="left"
                  className="flex-1"
                >
                  Command Center
                </SpecularButton>
              </div>
            </div>
          </div>
        );
      }

      // ───────────────────────────────────────────────────────────
      // Case 4: General Uncaught Application Error
      // ───────────────────────────────────────────────────────────
      return (
        <div className="min-h-screen bg-[#070B12] text-slate-100 flex items-center justify-center p-6 select-none font-sans">
          <div className="max-w-md w-full p-8 rounded-3xl bg-[#0C121D] border border-red-500/30 shadow-2xl space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-950/80 border border-red-500/40 text-red-400 mx-auto flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-red-400 font-bold">
                APPLICATION STATE DIAGNOSTIC
              </span>
              <h2 className="text-2xl font-display font-bold text-white">Runtime Error Detected</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                The application encountered an unexpected runtime exception. Details are provided below:
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] text-left space-y-2">
                <p className="text-[11px] font-mono text-red-300 break-words">
                  {this.state.error.message || "Unknown runtime exception"}
                </p>
                <button
                  onClick={this.handleCopyError}
                  className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-white transition-colors"
                >
                  {this.state.copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{this.state.copied ? "Copied" : "Copy error details"}</span>
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <SpecularButton
                onClick={this.handleRetry}
                variant="outline"
                size="sm"
                radius={12}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                iconPosition="left"
                className="flex-1"
              >
                Retry Action
              </SpecularButton>

              <SpecularButton
                onClick={this.handleReset}
                variant="emerald"
                size="sm"
                radius={12}
                icon={<Home className="w-3.5 h-3.5" />}
                iconPosition="left"
                className="flex-1"
              >
                Command Center
              </SpecularButton>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
