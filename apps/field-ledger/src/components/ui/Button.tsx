import type { ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
};

export default function Button({
  children,
  variant = "primary",
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-[#00545f] text-white hover:bg-[#003f48] dark:bg-[#d6fb00] dark:text-[#00545f] dark:hover:bg-[#ecffb6]",
    secondary:
      "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--hover)]",
    danger:
      "bg-red-500 text-white hover:bg-red-600",
    ghost:
      "bg-transparent text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <LoaderCircle size={16} className="animate-spin" />}
      {children}
    </button>
  );
}