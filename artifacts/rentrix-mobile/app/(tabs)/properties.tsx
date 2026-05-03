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
import { useColors } from "@/hooks/useColors";
import { supabase, type Property, type Unit } from "@/lib/supabase";

type PropertyWithStats = Property & {
  totalUnits: number;
  rentedUnits: number;
  availableUnits: number;
};

export default function PropertiesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const [{ data: properties, error: pe }, { data: units, error: ue }] =
        await Promise.all([
          supabase.from("properties").select("*").order("name"),
          supabase.from("units").select("id, property_id, status"),
        ]);

      if (pe || ue) throw new Error("Failed to load properties");

      const props = (properties as Property[]) ?? [];
      const allUnits = (units as Unit[]) ?? [];

      return props.map((p) => {
        const pUnits = allUnits.filter((u) => u.property_id === p.id);
        return {
          ...p,
          totalUnits: pUnits.length,
          rentedUnits: pUnits.filter((u) => u.status === "RENTED").length,
          availableUnits: pUnits.filter((u) => u.status === "AVAILABLE").length,
        } as PropertyWithStats;
      });
    },
  });

  const topPadding = isWeb ? 67 : insets.top;

  const renderItem = ({ item }: { item: PropertyWithStats }) => {
    const occupancy =
      item.totalUnits > 0
        ? Math.round((item.rentedUnits / item.totalUnits) * 100)
        : 0;
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: colors.secondary },
            ]}
          >
            <Feather name="home" size={20} color={colors.primary} />
          </View>
          <View style={styles.cardInfo}>
            <Text
              style={[styles.cardTitle, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.address ? (
              <Text
                style={[styles.cardSub, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {item.address}
              </Text>
            ) : null}
          </View>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {item.totalUnits}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Total
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {item.rentedUnits}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Rented
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.info }]}>
              {item.availableUnits}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Available
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {occupancy}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Occupancy
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.centered,
          {
            backgroundColor: colors.background,
            paddingTop: topPadding,
          },
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
            Real Estate Portfolio
          </Text>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>
            Properties
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
            icon="home"
            title="No properties yet"
            subtitle="Add properties in the web app to see them here"
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Cairo_600SemiBold",
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
  },
  divider: { height: 1 },
  statsRow: {
    flexDirection: "row",
    padding: 12,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
  },
  statDivider: { width: 1, marginHorizontal: 4 },
});
