import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { formatUsd } from '@/shared/lib/money';
import { Card, Row, colors, s } from '@/shared/ui';
import { sumUsd, useBalanceStore, type AssetBalance } from '@/entities/balance';

const STALE_AFTER_S = 60;

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function ago(seconds: number) {
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  return m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ago`;
}

/** Totals in USD plus how fresh the snapshot is. */
export function BalanceSummary({ balances }: { balances: AssetBalance[] }) {
  const { snapshot, loading, error, refresh } = useBalanceStore();
  const now = useNow();
  if (!snapshot) return null;

  const ageS = Math.max(0, Math.floor((now - Date.parse(snapshot.asOf)) / 1000));
  const stale = ageS > STALE_AFTER_S;

  return (
    <Card>
      <Text style={s.muted}>Total payback</Text>
      <Text style={s.h1}>{formatUsd(sumUsd(balances, 'total'))}</Text>
      <Row label="Available to claim" value={formatUsd(sumUsd(balances, 'available'))} strong />
      <Row label="Pending confirmation" value={formatUsd(sumUsd(balances, 'pending'))} />
      <Row label="Being claimed" value={formatUsd(sumUsd(balances, 'claiming'))} />
      <View style={[s.row, { alignItems: 'center', marginTop: 4 }]}>
        <Text style={[s.muted, { fontSize: 13 }, stale && { color: colors.warn }]}>
          {`Updated ${ago(ageS)} · ${new Date(snapshot.asOf).toLocaleTimeString()}`}
        </Text>
        <Pressable onPress={refresh} hitSlop={10} accessibilityRole="button" disabled={loading} style={{ minWidth: 60, alignItems: 'flex-end' }}>
          {loading ? <ActivityIndicator color={colors.accent} /> : <Text style={{ color: colors.accent, fontWeight: '600' }}>Refresh</Text>}
        </Pressable>
      </View>
      {error ? (
        <Text style={{ color: colors.danger, fontSize: 13 }}>{`Couldn't refresh: ${error.message} Showing the last known balances.`}</Text>
      ) : stale ? (
        <Text style={{ color: colors.warn, fontSize: 13 }}>These balances may be out of date.</Text>
      ) : null}
    </Card>
  );
}
