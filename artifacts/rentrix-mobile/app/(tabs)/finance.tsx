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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { useColors } from "@/hooks/useColors";
import { supabase, type Invoice, type Expense, type Receipt } from "@/lib/supabase";

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

type FinanceData = {
  summary: {
    totalInvoiced: number;
    totalCollected: number;
    totalExpenses: number;
    arrears: number;
    netIncome: number;
  };
  recentInvoices: Invoice[];
  recentExpenses: Expense[];
};

export default function FinanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["finance"],
    queryFn: async () => {
      const [
        { data: allInvoicesRaw, error: ie },
        { data: allReceiptsRaw, error: re },
        { data: allExpensesRaw, error: ee },
        { data: recentInvoicesRaw, error: rie },
        { data: recentExpensesRaw, error: ree },
      ] = await Promise.all([
        supabase.from("invoices").select("id, amount, status"),
        supabase.from("receipts").select("id, amount"),
        supabase.from("expenses").select("id, amount"),
        supabase
          .from("invoices")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("expenses")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      if (ie || re || ee || rie || ree)
        throw new Error("Failed to load finance data");

      const allInvoices = (allInvoicesRaw as Pick<Invoice, "id" | "amount" | "status">[]) ?? [];
      const allReceipts = (allReceiptsRaw as Receipt[]) ?? [];
      const allExpenses = (allExpensesRaw as Pick<Expense, "id" | "amount">[]) ?? [];

      const totalInvoiced = allInvoices.reduce(
        (s, i) => s + (i.amount ?? 0),
        0
      );
      const totalCollected = allReceipts.reduce(
        (s, r) => s + (r.amount ?? 0),
        0
      );
      const totalExpenses = allExpenses.reduce(
        (s, e) => s + (e.amount ?? 0),
        0
      );
      const arrears = allInvoices
        .filter((i) => i.status === "UNPAID" || i.status === "OVERDUE")
        .reduce((s, i) => s + (i.amount ?? 0), 0);

      return {
        summary: {
          totalInvoiced,
          totalCollected,
          totalExpenses,
          arrears,
          netIncome: totalCollected - totalExpenses,
        },
        recentInvoices: (recentInvoicesRaw as Invoice[]) ?? [],
        recentExpenses: (recentExpensesRaw as Expense[]) ?? [],
      } as FinanceData;
    },
  });

  const topPadding = isWeb ? 67 : insets.top;

  type ListItem =
    | { type: "header" }
    | { type: "summary" }
    | { type: "invoices_header" }
    | { type: "invoice"; item: Invoice }
    | { type: "expenses_header" }
    | { type: "expense"; item: Expense }
    | { type: "empty_invoices" }
    | { type: "empty_expenses" };

  const listData: ListItem[] = [
    { type: "header" },
    { type: "summary" },
    { type: "invoices_header" },
    ...(data?.recentInvoices.length
      ? data.recentInvoices.map((i): ListItem => ({ type: "invoice", item: i }))
      : [{ type: "empty_invoices" } as ListItem]),
    { type: "expenses_header" },
    ...(data?.recentExpenses.length
      ? data.recentExpenses.map((e): ListItem => ({ type: "expense", item: e }))
      : [{ type: "empty_expenses" } as ListItem]),
  ];

  const SummaryRow = ({
    label,
    value,
    color,
    bold,
  }: {
    label: string;
    value: number;
    color?: string;
    bold?: boolean;
  }) => (
    <View style={styles.summaryRow}>
      <Text
        style={[
          styles.summaryLabel,
          { color: colors.mutedForeground },
          bold && { color: colors.foreground, fontFamily: "Cairo_600SemiBold" },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.summaryValue,
          { color: color ?? colors.foreground },
          bold && { fontFamily: "Cairo_700Bold", fontSize: 16 },
        ]}
      >
        {formatCurrency(value)}
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: ListItem }) => {
    switch (item.type) {
      case "header":
        return (
          <View style={styles.header}>
            <Text
              style={[styles.greeting, { color: colors.mutedForeground }]}
            >
              Financial Overview
            </Text>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>
              Finance
            </Text>
            <View
              style={[styles.accent, { backgroundColor: colors.primary }]}
            />
          </View>
        );

      case "summary":
        if (!data) return null;
        return (
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <SummaryRow
              label="Total Invoiced"
              value={data.summary.totalInvoiced}
            />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <SummaryRow
              label="Total Collected"
              value={data.summary.totalCollected}
              color={colors.success}
            />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <SummaryRow
              label="Total Expenses"
              value={data.summary.totalExpenses}
              color={colors.danger}
            />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <SummaryRow
              label="Arrears"
              value={data.summary.arrears}
              color={colors.warning}
            />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <SummaryRow
              label="Net Income"
              value={data.summary.netIncome}
              color={
                data.summary.netIncome >= 0 ? colors.success : colors.danger
              }
              bold
            />
          </View>
        );

      case "invoices_header":
        return (
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.mutedForeground, marginTop: 24 },
            ]}
          >
            RECENT INVOICES
          </Text>
        );

      case "invoice":
        return (
          <View
            style={[
              styles.transactionCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.txIcon,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Feather name="file-text" size={16} color={colors.primary} />
            </View>
            <View style={styles.txInfo}>
              <Text
                style={[styles.txType, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {item.item.type ?? "Invoice"}
              </Text>
              <Text
                style={[styles.txDate, { color: colors.mutedForeground }]}
              >
                {formatDate(item.item.due_date ?? item.item.created_at)}
              </Text>
            </View>
            <View style={styles.txRight}>
              <Text style={[styles.txAmount, { color: colors.foreground }]}>
                {formatCurrency(item.item.amount)}
              </Text>
              <StatusBadge status={item.item.status} />
            </View>
          </View>
        );

      case "empty_invoices":
        return (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No invoices found
          </Text>
        );

      case "expenses_header":
        return (
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.mutedForeground, marginTop: 24 },
            ]}
          >
            RECENT EXPENSES
          </Text>
        );

      case "expense":
        return (
          <View
            style={[
              styles.transactionCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.txIcon,
                { backgroundColor: colors.danger + "15" },
              ]}
            >
              <Feather name="trending-down" size={16} color={colors.danger} />
            </View>
            <View style={styles.txInfo}>
              <Text
                style={[styles.txType, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {item.item.description ?? item.item.type ?? "Expense"}
              </Text>
              <Text
                style={[styles.txDate, { color: colors.mutedForeground }]}
              >
                {formatDate(item.item.date ?? item.item.created_at)}
              </Text>
            </View>
            <Text
              style={[styles.txAmount, { color: colors.danger }]}
            >
              -{formatCurrency(item.item.amount)}
            </Text>
          </View>
        );

      case "empty_expenses":
        return (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No expenses found
          </Text>
        );

      default:
        return null;
    }
  };

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
          title="Failed to load finance data"
          subtitle="Check your Supabase connection"
        />
      </View>
    );
  }

  return (
    <FlatList
      data={listData}
      keyExtractor={(item, index) =>
        item.type === "invoice"
          ? `inv-${item.item.id}`
          : item.type === "expense"
          ? `exp-${item.item.id}`
          : `${item.type}-${index}`
      }
      renderItem={renderItem}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.list,
        {
          paddingTop: topPadding + 16,
          paddingBottom: isWeb ? 34 : insets.bottom + 100,
        },
      ]}
      scrollEnabled
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
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
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Cairo_700Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Cairo_600SemiBold",
  },
  divider: { height: 1 },
  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    marginBottom: 8,
  },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: { flex: 1 },
  txType: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Cairo_600SemiBold",
    marginBottom: 2,
  },
  txDate: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
  },
  txRight: { alignItems: "flex-end", gap: 4 },
  txAmount: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
    paddingVertical: 16,
  },
});
