import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { useColors } from "@/hooks/useColors";
import { supabase, type Tenant } from "@/lib/supabase";

export default function TenantsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("name");
      if (error) throw new Error("Failed to load tenants");
      return (data as Tenant[]) ?? [];
    },
  });

  const topPadding = isWeb ? 67 : insets.top;

  const filtered = (data ?? []).filter((t) =>
    search.trim()
      ? t.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.phone?.includes(search) ||
        t.id_no?.includes(search)
      : true
  );

  const renderItem = ({ item }: { item: Tenant }) => (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.cardLeft}>
        <View
          style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}
        >
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {(item.name ?? "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <Text
            style={[styles.name, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {item.phone ? (
            <Text
              style={[styles.detail, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {item.phone}
            </Text>
          ) : null}
          {item.nationality ? (
            <Text
              style={[styles.detail, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {item.nationality}
            </Text>
          ) : null}
        </View>
      </View>
      <StatusBadge status={item.status} />
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
      data={filtered}
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
      scrollEnabled={!!(filtered.length > 0)}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              Tenant Management
            </Text>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>
              Tenants
            </Text>
            <View
              style={[styles.accent, { backgroundColor: colors.primary }]}
            />
          </View>
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search tenants..."
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
          {data && (
            <Text
              style={[styles.countLabel, { color: colors.mutedForeground }]}
            >
              {filtered.length} tenant{filtered.length !== 1 ? "s" : ""}
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        isError ? (
          <EmptyState
            icon="alert-circle"
            title="Failed to load"
            subtitle="Check your connection"
          />
        ) : search ? (
          <EmptyState
            icon="search"
            title="No results"
            subtitle={`No tenants matching "${search}"`}
          />
        ) : (
          <EmptyState
            icon="users"
            title="No tenants yet"
            subtitle="Add tenants in the web app"
          />
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { marginBottom: 16 },
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
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    padding: 0,
  },
  countLabel: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    marginBottom: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
  },
  info: { flex: 1 },
  name: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Cairo_600SemiBold",
    marginBottom: 2,
  },
  detail: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
  },
});
