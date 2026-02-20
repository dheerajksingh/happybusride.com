interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const variants = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function bookingStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
    PENDING: { label: "Pending", variant: "warning" },
    CONFIRMED: { label: "Confirmed", variant: "success" },
    CANCELLED_USER: { label: "Cancelled", variant: "danger" },
    CANCELLED_OPERATOR: { label: "Cancelled by Operator", variant: "danger" },
    COMPLETED: { label: "Completed", variant: "info" },
    REFUND_PENDING: { label: "Refund Pending", variant: "warning" },
    REFUNDED: { label: "Refunded", variant: "default" },
  };
  const entry = map[status] ?? { label: status, variant: "default" as const };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

export function tripStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
    SCHEDULED: { label: "Scheduled", variant: "info" },
    BOARDING: { label: "Boarding", variant: "warning" },
    IN_PROGRESS: { label: "In Progress", variant: "success" },
    COMPLETED: { label: "Completed", variant: "default" },
    CANCELLED: { label: "Cancelled", variant: "danger" },
    DELAYED: { label: "Delayed", variant: "warning" },
  };
  const entry = map[status] ?? { label: status, variant: "default" as const };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}
