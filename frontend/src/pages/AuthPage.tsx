import React from "react";
import { useNavigate } from "react-router-dom";
import AuthShell from "@/components/auth/AuthShell";

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-[100dvh] bg-[var(--surface-0)] text-[var(--text-primary)] flex items-center justify-center p-4 sm:p-6 font-sans select-none overflow-x-hidden relative">
      {/* Background ambient lighting */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40 -z-10"
        style={{
          background:
            "radial-gradient(circle at 50% 35%, var(--brand-subtle) 0%, transparent 60%), radial-gradient(circle at 75% 75%, var(--accent-dim) 0%, transparent 50%)",
        }}
      />
      <AuthShell onSuccess={() => navigate("/home")} />
    </div>
  );
};

export default AuthPage;
