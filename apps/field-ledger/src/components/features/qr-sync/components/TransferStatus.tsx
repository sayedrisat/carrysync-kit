
interface TransferStatusProps {
  message: string;
  type?: "success" | "error" | "info";
}

export default function TransferStatus({
  message,
  type = "info",
}: TransferStatusProps) {
  if (!message) return null;

  const styles = {
    success: "border-green-500/30 bg-green-500/10 text-green-600",
    error: "border-red-500/30 bg-red-500/10 text-red-500",
    info: "border-blue-500/30 bg-blue-500/10 text-blue-500",
  };

  return (
    <p
      role="status"
      aria-live="polite"
      className={`rounded-xl border p-3 text-sm font-medium ${styles[type]}`}
    >
      {message}
    </p>
  );
}
