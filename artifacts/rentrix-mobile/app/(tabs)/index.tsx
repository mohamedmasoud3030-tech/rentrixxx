import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { useColors } from "@/hooks/useColors";
import { supabase, type Contract, type Invoice, type Receipt, type Expense, type Unit, type Tenant } from "@/lib/supabase";

function formatCurrency(amount: number) {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "OMR",
    minimumFractionDigits: 0,
  });
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [
        { data: properties, error: pe },
        { data: units, error: ue },
        { data: tenants, error: te },
        { data: contracts, error: ce },
        { data: invoices, error: ie },
        { data: receipts, error: re },
        { data: expenses, error: ee },
      ] = await Promise.all([
        supabase.from("properties").select("id, name"),
        supabase.from("units").select("id, status"),
        supabase.from("tenants").select("id, status"),
        supabase.from("contracts").select("id, status, rent_amount"),
        supabase.from("invoices").select("id, amount, status, type"),
        supabase.from("receipts").select("id, amount, paid_at"),
        supabase.from("expenses").select("id, amount"),
      ]);

      if (pe || ue || te || ce || ie || re || ee) {
        throw new Error("Failed to load dashboard data");
      }

      const activeContracts = ((contracts as Contract[]) ?? []).filter(
        (c) => c.status === "ACTIVE"
      );
      const totalUnits = (units ?? []).length;
      const rentedUnits = ((units as Unit[]) ?? []).filter(
        (u) => u.status === "RENTED"
      ).length;
      const occupancy =
        totalUnits > 0
          ? Math.round((rentedUnits / totalUnits) * 100)
          : 0;

      const totalInvoiced = ((invoices as Invoice[]) ?? []).reduce(
        (s, i) => s + (i.amount ?? 0),
        0
      );
      const totalCollected = ((receipts as Receipt[]) ?? []).reduce(
        (s, r) => s + (r.amount ?? 0),
        0
      );
      const totalExpenses = ((expenses as Expense[]) ?? []).reduce(
        (s, e) => s + (e.amount ?? 0),
        0
      );
      const arrears = ((invoices as Invoice[]) ?? [])
        .filter((i) => i.status === "UNPAID" || i.status === "OVERDUE")
        .reduce((s, i) => s + (i.amount ?? 0), 0);

      return {
        properties: (properties ?? []).length,
        units: totalUnits,
        activeTenants: ((tenants as Tenant[]) ?? []).filter(
          (t) => t.status === "ACTIVE"
        ).length,
        activeContracts: activeContracts.length,
        occupancy,
        totalCollected,
        totalExpenses,
        arrears,
        netIncome: totalCollected - totalExpenses,
      };
    },
  });

  const topPadding = isWeb ? 67 : insets.top;

  if (isLoading) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background, paddingTop: topPadding },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background, paddingTop: topPadding },
        ]}
      >
        <EmptyState
          icon="alert-circle"
          title="Failed to load data"
          subtitle="Check your Supabase connection"
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPadding + 16,
          paddingBottom: isWeb ? 34 : insets.bottom + 100,
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
          Property Management
        </Text>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Overview
        </Text>
        <View style={[styles.divider, { backgroundColor: colors.primary }]} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
        PORTFOLIO
      </Text>
      <View style={styles.row}>
        <StatCard
          label="Properties"
          value={data?.properties ?? 0}
          icon={
            <Feather name="home" size={18} color={colors.primary} />
          }
          accent
        />
        <View style={styles.gap} />
        <StatCard
          label="Units"
          value={data?.units ?? 0}
          icon={
            <MaterialCommunityIcons
              name="office-building"
              size={18}
              color={colors.primary}
            />
          }
        />
      </View>

      <View style={[styles.row, { marginTop: 12 }]}>
        <StatCard
          label="Active Contracts"
          value={data?.activeContracts ?? 0}
          icon={<Feather name="file-text" size={18} color={colors.primary} />}
        />
        <View style={styles.gap} />
        <StatCard
          label="Occupancy"
          value={`${data?.occupancy ?? 0}%`}
          icon={<Feather name="percent" size={18} color={colors.primary} />}
          subtitle={`${data?.activeTenants ?? 0} active tenants`}
        />
      </View>

      <Text
        style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 24 }]}
      >
        FINANCIALS
      </Text>
      <View style={styles.row}>
        <StatCard
          label="Collected"
          value={formatCurrency(data?.totalCollected ?? 0)}
          icon={<Feather name="trending-up" size={18} color={colors.success} />}
          accent={false}
        />
        <View style={styles.gap} />
        <StatCard
          label="Expenses"
          value={formatCurrency(data?.totalExpenses ?? 0)}
          icon={
            <Feather name="trending-down" size={18} color={colors.danger} />
          }
        />
      </View>

      <View style={[styles.row, { marginTop: 12 }]}>
        <StatCard
          label="Net Income"
          value={formatCurrency(data?.netIncome ?? 0)}
          icon={<Feather name="dollar-sign" size={18} color={colors.primary} />}
          accent
        />
        <View style={styles.gap} />
        <StatCard
          label="Arrears"
          value={formatCurrency(data?.arrears ?? 0)}
          icon={
            <Feather name="alert-triangle" size={18} color={colors.warning} />
          }
          subtitle="Outstanding"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { marginBottom: 24 },
  greeting: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
    marginBottom: 12,
  },
  divider: {
    width: 40,
    height: 3,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Cairo_700Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  gap: { width: 0 },
});
