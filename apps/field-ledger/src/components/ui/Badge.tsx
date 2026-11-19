type BadgeProps = {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
};

export default function Badge({
  children,
  variant = "neutral",
}: BadgeProps) {
  const styles = {
    success:
      "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
    warning:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    danger:
      "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
    info:
      "bg-[#ecffb6] text-[#00545f] dark:bg-[#12363b] dark:text-[#d6fb00]",
    neutral:
      "bg-[var(--hover)] text-[var(--muted)]",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold ${styles[variant]}`}
    >
      {children}
    </span>
  );
}