import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type StatCardProps = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  accent?: boolean;
};

export function StatCard({ label, value, icon, subtitle, accent }: StatCardProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: accent ? colors.primary : colors.card,
          borderColor: accent ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: accent
                ? "rgba(255,255,255,0.2)"
                : colors.secondary,
            },
          ]}
        >
          {icon}
        </View>
      </View>
      <Text
        style={[
          styles.value,
          { color: accent ? "#FFFFFF" : colors.foreground },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text
        style={[
          styles.label,
          { color: accent ? "rgba(255,255,255,0.85)" : colors.mutedForeground },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            {
              color: accent ? "rgba(255,255,255,0.7)" : colors.mutedForeground,
            },
          ]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    flex: 1,
    minWidth: 150,
  },
  topRow: {
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
    marginBottom: 2,
  },
  label: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    marginTop: 2,
  },
});
