import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { toApiError, type ApiError } from '@/shared/api';
import { Banner, Button, Card, Row, Screen, colors, s } from '@/shared/ui';
import { ClaimStatusBadge, getClaim, useClaimStore } from '@/entities/claim';

export function ClaimStatusPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const claim = useClaimStore((st) => st.claims.find((c) => c.id === id));
  const [error, setError] = useState<ApiError | null>(null);
  const [reload, setReload] = useState(0);

  // Claims not created on this device (e.g. opened from Activity): fetch once and
  // add to the store; useClaimTracking then follows it while pending.
  useEffect(() => {
    if (claim || !id) return;
    let cancelled = false;
    setError(null);
    getClaim(id)
      .then((c) => !cancelled && useClaimStore.getState().upsert(c))
      .catch((e) => !cancelled && setError(toApiError(e)));
    return () => {
      cancelled = true;
    };
  }, [claim, id, reload]);

  const home = () => router.replace('/');

  return (
    <Screen title="Claim" onBack={home}>
      {!claim ? (
        error ? (
          <Card>
            <Text style={s.h2}>Couldn't load this claim</Text>
            <Text style={s.muted}>{error.message}</Text>
            {error.kind !== 'not_found' ? <Button label="Retry" onPress={() => setReload((n) => n + 1)} /> : null}
          </Card>
        ) : (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        )
      ) : (
        <>
          {claim.status === 'pending' ? (
            <Banner tone="info">
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <ActivityIndicator color={colors.accent} />
                <Text style={[s.text, { flex: 1 }]}>Processing. This usually takes up to 20 seconds.</Text>
              </View>
            </Banner>
          ) : claim.status === 'completed' ? (
            <Banner tone="success">{`Completed. ${claim.receiveAmount} ${claim.asset} is on its way to your wallet.`}</Banner>
          ) : (
            <Banner tone="error">
              {`Failed${claim.failureReason ? `: ${claim.failureReason}` : ''}. ${claim.amount} ${claim.asset} is back in your available balance.`}
            </Banner>
          )}
          <Card>
            <View style={[s.row, { alignItems: 'center' }]}>
              <Text style={s.h2}>{`${claim.amount} ${claim.asset}`}</Text>
              <ClaimStatusBadge status={claim.status} />
            </View>
            <Row label="Fee" value={`− ${claim.fee} ${claim.asset}`} />
            <Row label="You receive" value={`${claim.receiveAmount} ${claim.asset}`} strong />
            <Row label="Created" value={new Date(claim.createdAt).toLocaleString()} />
            <Row label="Updated" value={new Date(claim.updatedAt).toLocaleString()} />
            <Row label="ID" value={claim.id} />
          </Card>
          <Button label="Back to balances" variant={claim.status === 'pending' ? 'secondary' : 'primary'} onPress={home} />
        </>
      )}
    </Screen>
  );
}
