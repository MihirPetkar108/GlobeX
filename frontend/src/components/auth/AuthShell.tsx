import React from "react";
import AuthAccordion from "@/components/auth/AuthAccordion";
import { cn } from "@/lib/utils";

export interface AuthShellProps {
  onSuccess?: () => void;
  className?: string;
  initialMode?: "signin" | "register";
}

export const AuthShell: React.FC<AuthShellProps> = ({
  onSuccess,
  className = "",
  initialMode = "signin",
}) => {
  return (
    <div className={cn("w-full max-w-[760px] mx-auto select-none", className)}>
      <AuthAccordion
        onSuccess={onSuccess}
        initialMode={initialMode}
      />
    </div>
  );
};

export default AuthShell;
