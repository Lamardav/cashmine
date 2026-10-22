import React from 'react';
import { Text, View } from 'react-native';
import { formatUnits, formatUsd } from '@/shared/lib/money';
import { Button, Card, Row, s } from '@/shared/ui';
import { usdOf, type AssetBalance } from '../model/applyClaims';

export function AssetCard({ b, onClaim }: { b: AssetBalance; onClaim: () => void }) {
  const fmt = (u: bigint) => `${formatUnits(u, b.decimals)} ${b.asset}`;
  return (
    <Card>
      <View style={[s.row, { alignItems: 'center' }]}>
        <Text style={s.h2}>{b.asset}</Text>
        <Text style={s.muted}>{formatUsd(usdOf(b, 'total'))}</Text>
      </View>
      <Row label={`Available${b.adjusted ? ' *' : ''}`} value={fmt(b.available)} strong />
      <Row label="" value={`≈ ${formatUsd(usdOf(b, 'available'))}`} />
      {b.pending > 0n ? <Row label="Pending" value={fmt(b.pending)} /> : null}
      {b.claiming > 0n ? <Row label={`Being claimed${b.adjusted ? ' *' : ''}`} value={fmt(b.claiming)} /> : null}
      <Button label={`Claim ${b.asset}`} variant="secondary" disabled={b.available <= 0n} onPress={onClaim} />
    </Card>
  );
}
