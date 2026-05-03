import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { useColors } from "@/hooks/useColors";
import {
  supabase,
  type Contract,
  type Tenant,
  type Unit,
  type Property,
} from "@/lib/supabase";

type ContractEnriched = Contract & {
  tenantName: string;
  unitName: string;
  propertyName: string;
};

function formatCurrency(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "OMR",
    minimumFractionDigits: 0,
  });
}

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ContractsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const [
        { data: contracts, error: ce },
        { data: tenants, error: te },
        { data: units, error: ue },
        { data: properties, error: pe },
      ] = await Promise.all([
        supabase
          .from("contracts")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("tenants").select("id, name"),
        supabase.from("units").select("id, name, property_id"),
        supabase.from("properties").select("id, name"),
      ]);

      if (ce || te || ue || pe) throw new Error("Failed to load contracts");

      const allTenants = (tenants as Tenant[]) ?? [];
      const allUnits = (units as Unit[]) ?? [];
      const allProperties = (properties as Property[]) ?? [];

      return ((contracts as Contract[]) ?? []).map((c) => {
        const tenant = allTenants.find((t) => t.id === c.tenant_id);
        const unit = allUnits.find((u) => u.id === c.unit_id);
        const property = unit
          ? allProperties.find((p) => p.id === unit.property_id)
          : undefined;
        return {
          ...c,
          tenantName: tenant?.name ?? "Unknown",
          unitName: unit?.name ?? "Unknown",
          propertyName: property?.name ?? "Unknown",
        } as ContractEnriched;
      });
    },
  });

  const topPadding = isWeb ? 67 : insets.top;

  const renderItem = ({ item }: { item: ContractEnriched }) => (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={styles.titleRow}>
          <View
            style={[styles.iconBox, { backgroundColor: colors.secondary }]}
          >
            <Feather name="file-text" size={18} color={colors.primary} />
          </View>
          <View style={styles.titleInfo}>
            <Text
              style={[styles.tenantName, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {item.tenantName}
            </Text>
            <Text
              style={[styles.unitName, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {item.propertyName} · {item.unitName}
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
            Rent
          </Text>
          <Text style={[styles.detailValue, { color: colors.primary }]}>
            {formatCurrency(item.rent_amount)}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
            Start
          </Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]}>
            {formatDate(item.start_date)}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
            End
          </Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]}>
            {formatDate(item.end_date)}
          </Text>
        </View>
        {item.deposit != null && (
          <View style={styles.detailItem}>
            <Text
              style={[styles.detailLabel, { color: colors.mutedForeground }]}
            >
              Deposit
            </Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>
              {formatCurrency(item.deposit)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

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

  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.list,
        {
          paddingTop: topPadding + 16,
          paddingBottom: isWeb ? 34 : insets.bottom + 100,
        },
      ]}
      scrollEnabled={!!(data && data.length > 0)}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            Lease Agreements
          </Text>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>
            Contracts
          </Text>
          <View style={[styles.accent, { backgroundColor: colors.primary }]} />
        </View>
      }
      ListEmptyComponent={
        isError ? (
          <EmptyState
            icon="alert-circle"
            title="Failed to load"
            subtitle="Check your connection"
          />
        ) : (
          <EmptyState
            icon="file-text"
            title="No contracts yet"
            subtitle="Create contracts in the web app"
          />
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { marginBottom: 20 },
  greeting: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
    marginBottom: 12,
  },
  accent: { width: 40, height: 3, borderRadius: 2 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardTop: { padding: 14 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  titleInfo: { flex: 1 },
  tenantName: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Cairo_600SemiBold",
    marginBottom: 2,
  },
  unitName: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
  },
  divider: { height: 1 },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    gap: 8,
  },
  detailItem: {
    minWidth: "45%",
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Cairo_600SemiBold",
  },
});
