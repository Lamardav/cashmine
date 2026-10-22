import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Screen, colors, s } from '@/shared/ui';
import { AssetCard, applyClaims, useBalanceStore } from '@/entities/balance';
import { useClaimStore } from '@/entities/claim';
import { BalanceSummary } from '@/widgets/balance-summary';
import { ClaimNotices } from '@/widgets/claim-notices';

export function HomePage() {
  const { snapshot, error, loading, refresh } = useBalanceStore();
  const claims = useClaimStore((st) => st.claims);
  const balances = useMemo(() => (snapshot ? applyClaims(snapshot, claims) : null), [snapshot, claims]);

  const tokenLink = (
    <Pressable onPress={() => router.push('/token')} hitSlop={12} accessibilityRole="button">
      <Text style={{ color: colors.accent }}>Token</Text>
    </Pressable>
  );
  const openClaim = (asset?: string) => router.push(asset ? { pathname: '/claim', params: { asset } } : '/claim');

  return (
    <Screen title="Payback" right={tokenLink}>
      <ClaimNotices onOpenClaim={(id) => router.push(`/claims/${id}`)} onOpenSubmission={() => router.push('/claim')} />

      {!balances ? (
        error ? (
          <Card>
            <Text style={s.h2}>Couldn't load balances</Text>
            <Text style={s.muted}>{error.message}</Text>
            {error.kind === 'unauthorized' ? (
              <Button label="Change token" onPress={() => router.push('/token')} />
            ) : (
              <Button label="Retry" loading={loading} onPress={refresh} />
            )}
          </Card>
        ) : (
          <View style={{ paddingVertical: 60, alignItems: 'center', gap: 12 }}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={s.muted}>Loading balances…</Text>
          </View>
        )
      ) : (
        <>
          <BalanceSummary balances={balances} />
          {error?.kind === 'unauthorized' ? <Button label="Change token" onPress={() => router.push('/token')} /> : null}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button label="Claim" onPress={() => openClaim()} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Activity" variant="secondary" onPress={() => router.push('/activity')} />
            </View>
          </View>
          {balances.length === 0 ? <Text style={s.muted}>No balances yet.</Text> : null}
          {balances.map((b) => (
            <AssetCard key={b.asset} b={b} onClaim={() => openClaim(b.asset)} />
          ))}
          {balances.some((b) => b.adjusted) ? (
            <Text style={[s.muted, { fontSize: 12 }]}>
              * Includes claims you just made. The server snapshot (refreshed every 15 s) will show them shortly.
            </Text>
          ) : null}
        </>
      )}
    </Screen>
  );
}
