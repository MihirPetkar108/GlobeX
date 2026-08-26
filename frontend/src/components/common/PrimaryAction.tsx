import React from "react";
import { cn } from "@/lib/utils";
import { ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SpecularButton, { SpecularButtonProps } from "@/components/ui/SpecularButton";

export interface PrimaryActionProps extends Omit<SpecularButtonProps, "onClick"> {
  variant?: "primary" | "emerald" | "sky" | "amber" | "outline" | "ghost" | "secondary";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  isLoading?: boolean;
  to?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const PrimaryAction: React.FC<PrimaryActionProps> = ({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "right",
  isLoading = false,
  to,
  className,
  disabled,
  onClick,
  radius = 16,
  ...specularProps
}) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;
    if (onClick) onClick(e);
    if (to) {
      navigate(to);
    }
  };

  const isPrimary = variant === "primary" || variant === "emerald";

  const content = (
    <div className="flex items-center justify-center gap-2 font-semibold">
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : icon && iconPosition === "left" ? (
        <span className="shrink-0">{icon}</span>
      ) : null}

      <span>{children}</span>

      {!isLoading && icon && iconPosition === "right" ? (
        <span className="shrink-0">{icon}</span>
      ) : !isLoading && !icon && isPrimary && iconPosition === "right" ? (
        <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      ) : null}
    </div>
  );

  return (
    <SpecularButton
      size={size}
      variant={variant}
      radius={radius}
      disabled={disabled || isLoading}
      onClick={handleClick}
      className={cn(className)}
      {...specularProps}
    >
      {content}
    </SpecularButton>
  );
};

export default PrimaryAction;
