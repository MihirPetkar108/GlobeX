import React, { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface SpecularButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  radius?: number;
  tint?: string;
  tintOpacity?: number;
  blur?: number;
  textColor?: string;
  lineColor?: string;
  baseColor?: string;
  intensity?: number;
  shineSize?: number;
  shineFade?: number;
  thickness?: number;
  speed?: number;
  followMouse?: boolean;
  proximity?: number;
  autoAnimate?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  variant?: "primary" | "emerald" | "sky" | "amber" | "outline" | "ghost" | "secondary";
  className?: string;
}

const SIZES = {
  xs: "text-[0.75rem] px-3 py-1.5 min-h-[28px] gap-1.5 font-medium",
  sm: "text-[0.8125rem] px-3.5 py-2 min-h-[34px] gap-2 font-medium",
  md: "text-[0.875rem] px-5 py-2.5 min-h-[40px] gap-2.5 font-semibold",
  lg: "text-[0.95rem] px-6 py-3 min-h-[46px] gap-3 font-bold",
  xl: "text-[1.05rem] px-8 py-3.5 min-h-[52px] gap-3.5 font-bold",
};

export const SpecularButton: React.FC<SpecularButtonProps> = ({
  children = "Get Started",
  size = "md",
  radius = 14,
  tint,
  tintOpacity,
  blur = 8,
  textColor,
  lineColor,
  baseColor,
  intensity = 1,
  followMouse = true,
  disabled = false,
  isLoading = false,
  icon,
  iconPosition = "right",
  variant = "primary",
  onClick,
  className = "",
  type = "button",
  style,
  ...props
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number; isHovered: boolean }>({
    x: 50,
    y: 50,
    isHovered: false,
  });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!followMouse || disabled || isLoading) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setMousePos({ x, y, isHovered: true });
    },
    [followMouse, disabled, isLoading]
  );

  const handleMouseEnter = useCallback(() => {
    if (!disabled && !isLoading) {
      setMousePos((prev) => ({ ...prev, isHovered: true }));
    }
  }, [disabled, isLoading]);

  const handleMouseLeave = useCallback(() => {
    setMousePos({ x: 50, y: 50, isHovered: false });
  }, []);

  // Theme styling configurations (Semantic Tokens across Dark & Light Mode)
  const getVariantStyles = () => {
    switch (variant) {
      case "sky":
        return {
          bg: "bg-[var(--brand-blue)] hover:brightness-110 active:scale-[0.98]",
          border: "border-[var(--brand-cyan)]/40 hover:border-[var(--brand-cyan)]/70",
          text: textColor || "text-white",
          glow: "var(--info-bg)",
          rim: "linear-gradient(135deg, var(--brand-cyan) 0%, transparent 50%, rgba(255, 255, 255, 0.2) 100%)",
        };
      case "amber":
        return {
          bg: "bg-[var(--amber)] hover:brightness-110 active:scale-[0.98]",
          border: "border-[var(--amber)]/40 hover:border-[var(--amber)]/70",
          text: textColor || "text-white",
          glow: "var(--amber-dim)",
          rim: "linear-gradient(135deg, var(--amber) 0%, transparent 50%, rgba(255, 255, 255, 0.2) 100%)",
        };
      case "outline":
        return {
          bg: "bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] active:bg-[var(--bg-surface-muted)]",
          border: "border-[var(--border-default)] hover:border-[var(--border-strong)]",
          text: textColor || "text-[var(--text-primary)]",
          glow: "var(--neutral-bg)",
          rim: "linear-gradient(135deg, var(--border-default) 0%, transparent 50%, var(--border-subtle) 100%)",
        };
      case "ghost":
        return {
          bg: "bg-transparent hover:bg-[var(--bg-surface-subtle)] active:bg-[var(--bg-surface-muted)]",
          border: "border-transparent hover:border-[var(--border-subtle)]",
          text: textColor || "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
          glow: "var(--neutral-bg)",
          rim: "transparent",
        };
      case "secondary":
        return {
          bg: "bg-[var(--bg-surface-subtle)] hover:bg-[var(--bg-surface-muted)] active:bg-[var(--bg-surface)]",
          border: "border-[var(--border-subtle)] hover:border-[var(--border-default)]",
          text: textColor || "text-[var(--text-primary)]",
          glow: "var(--neutral-bg)",
          rim: "linear-gradient(135deg, var(--border-default) 0%, transparent 100%)",
        };
      case "primary":
      case "emerald":
      default:
        return {
          bg: "bg-[var(--brand-teal-dark)] hover:bg-[var(--brand-teal)] active:scale-[0.98]",
          border: "border-[var(--brand-teal)]/40 hover:border-[var(--brand-teal)]/70",
          text: textColor || "text-white",
          glow: "var(--success-bg)",
          rim: "linear-gradient(135deg, var(--brand-teal) 0%, transparent 50%, rgba(255, 255, 255, 0.2) 100%)",
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <button
      ref={btnRef}
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        borderRadius: `${radius}px`,
        ...style,
      }}
      className={cn(
        "relative group inline-flex items-center justify-center font-sans select-none overflow-hidden",
        "border backdrop-blur-md transition-all duration-180 ease-out",
        "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400",
        "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed",
        vStyles.bg,
        vStyles.border,
        vStyles.text,
        SIZES[size],
        className
      )}
      {...props}
    >
      {/* Dynamic Specular Hover Light Follower */}
      {followMouse && mousePos.isHovered && !disabled && (
        <span
          className="absolute inset-0 pointer-events-none transition-opacity duration-200 opacity-100"
          style={{
            background: `radial-gradient(circle 80px at ${mousePos.x}% ${mousePos.y}%, ${vStyles.glow}, transparent 70%)`,
          }}
        />
      )}

      {/* Subtle Top Specular Rim Reflection */}
      <span
        className="absolute inset-x-0 top-0 h-[1px] pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity duration-180"
        style={{
          background: vStyles.rim,
        }}
      />

      {/* Content Layer */}
      <span className="relative z-10 flex items-center justify-center gap-2 pointer-events-none">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          <>
            {icon && iconPosition === "left" && (
              <span className="shrink-0">{icon}</span>
            )}
            <span>{children}</span>
            {icon && iconPosition === "right" && (
              <span className="shrink-0">{icon}</span>
            )}
          </>
        )}
      </span>
    </button>
  );
};

export default SpecularButton;
