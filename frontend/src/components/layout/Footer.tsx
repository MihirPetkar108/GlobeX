import { Shield, Cpu, Layers } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-[var(--hairline)] bg-[var(--ink)] py-6 px-6 sm:px-10 lg:px-16 text-xs text-[var(--text-secondary)] font-sans">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-display font-medium text-[var(--text-primary)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)]" />
            GLOBEX.AI
          </div>
          <span className="text-[var(--hairline-strong)]">•</span>
          <p className="text-[11px] text-[var(--text-tertiary)]">
            Smart India Hackathon Prototype — AI-Powered Cross-Border Trade Intelligence & Trust Layer
          </p>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-[var(--emerald)]" /> Tamper-Evident SHA-256
          </span>
          <span className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-[var(--accent)]" /> AI Inference
          </span>
          <span className="flex items-center gap-1 text-[var(--text-tertiary)]">
            <Layers className="w-3.5 h-3.5" /> Appwrite • n8n • EVM
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
