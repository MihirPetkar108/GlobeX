/** @type {import('tailwindcss').Config} */
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        // Semantic token mappings — light theme only, single source of
        // truth is src/index.css `:root`. Every key here is a var().
        app: "var(--bg-app)",
        "surface-base": "var(--bg-surface)",
        "surface-subtle": "var(--bg-surface-subtle)",
        "surface-muted": "var(--bg-surface-muted)",
        "border-subtle": "var(--border-subtle)",
        "border-default": "var(--border-default)",
        "border-strong": "var(--border-strong)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "text-muted": "var(--text-muted)",
        "brand-teal": "var(--brand-teal)",
        "brand-teal-dark": "var(--brand-teal-dark)",
        "brand-cyan": "var(--brand-cyan)",
        "brand-blue": "var(--brand-blue)",
        accent: { DEFAULT: "var(--accent)", dim: "var(--accent-dim)" },
        emerald: { DEFAULT: "var(--emerald)", dim: "var(--emerald-dim)" },
        amber: { DEFAULT: "var(--amber)", dim: "var(--amber-dim)" },
        red: { DEFAULT: "var(--red)", dim: "var(--red-dim)" },
        status: {
          verified: "var(--status-verified)",
          "verified-bg": "var(--status-verified-bg)",
          pending: "var(--status-pending)",
          "pending-bg": "var(--status-pending-bg)",
          review: "var(--status-review)",
          "review-bg": "var(--status-review-bg)",
          blocked: "var(--status-blocked)",
          "blocked-bg": "var(--status-blocked-bg)",
          stale: "var(--status-stale)",
          "stale-bg": "var(--status-stale-bg)",
          unavailable: "var(--status-unavailable)",
          "unavailable-bg": "var(--status-unavailable-bg)",
        },
        // shadcn/ui aliases
        border: "var(--border-subtle)",
        input: "var(--hairline)",
        ring: "var(--brand-teal)",
        foreground: "var(--text-primary)",
        destructive: {
          DEFAULT: "var(--error)",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "var(--bg-surface-muted)",
          foreground: "var(--text-secondary)",
        },
        popover: {
          DEFAULT: "var(--bg-surface)",
          foreground: "var(--text-primary)",
        },
        card: {
          DEFAULT: "var(--bg-surface)",
          foreground: "var(--text-primary)",
        },
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      spacing: {
        gutter: "24px",
        "container-max": "1440px",
        "margin-desktop": "64px",
        "margin-mobile": "20px",
        unit: "8px",
      },
      fontFamily: {
        "label-sm": ["JetBrains Mono", "monospace"],
        "body-lg": ["Figtree", "sans-serif"],
        "display-lg": ["Outfit", "sans-serif"],
        "headline-lg": ["Outfit", "sans-serif"],
        "headline-md": ["Outfit", "sans-serif"],
        "headline-lg-mobile": ["Outfit", "sans-serif"],
        "label-md": ["JetBrains Mono", "monospace"],
        "body-md": ["Figtree", "sans-serif"],
        sans: ["Figtree", "Outfit", "sans-serif"],
        display: ["Outfit", "Figtree", "sans-serif"],
        serif: ["Instrument Serif", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        "label-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.03em", fontWeight: "500" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "500" }],
        "headline-lg-mobile": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "label-md": ["14px", { lineHeight: "20px", letterSpacing: "0.05em", fontWeight: "500" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
