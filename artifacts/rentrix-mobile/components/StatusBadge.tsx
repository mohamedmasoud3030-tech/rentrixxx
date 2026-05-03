import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type StatusBadgeProps = {
  status: string;
};

const STATUS_MAP: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  ACTIVE: { label: "Active", bg: "#F0FDF4", text: "#16A34A" },
  RENTED: { label: "Rented", bg: "#F0FDF4", text: "#16A34A" },
  AVAILABLE: { label: "Available", bg: "#EFF6FF", text: "#2563EB" },
  EXPIRED: { label: "Expired", bg: "#FEF2F2", text: "#EF4444" },
  TERMINATED: { label: "Terminated", bg: "#FEF2F2", text: "#EF4444" },
  BLACKLIST: { label: "Blacklisted", bg: "#FEF2F2", text: "#EF4444" },
  INACTIVE: { label: "Inactive", bg: "#F9FAFB", text: "#6B7280" },
  PENDING: { label: "Pending", bg: "#FFFBEB", text: "#F59E0B" },
  PAID: { label: "Paid", bg: "#F0FDF4", text: "#16A34A" },
  UNPAID: { label: "Unpaid", bg: "#FEF2F2", text: "#EF4444" },
  OVERDUE: { label: "Overdue", bg: "#FEF2F2", text: "#EF4444" },
  PARTIAL: { label: "Partial", bg: "#FFFBEB", text: "#F59E0B" },
  MAINTENANCE: { label: "Maintenance", bg: "#FFFBEB", text: "#F59E0B" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = useColors();
  const config = STATUS_MAP[status?.toUpperCase()] ?? {
    label: status ?? "Unknown",
    bg: colors.secondary,
    text: colors.mutedForeground,
  };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
    letterSpacing: 0.3,
  },
});
