import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, s } from '@/shared/ui';
import type { ActivityItem } from '../api';

const TITLES: Record<ActivityItem['type'], string> = {
  accrual: 'Payback',
  reversal: 'Reversal',
  claim: 'Claim',
};

const STATUS_COLORS: Record<string, string> = {
  pending: colors.warn,
  confirmed: colors.accent,
  completed: colors.accent,
  failed: colors.danger,
};

export function ActivityRow({ item, onPress }: { item: ActivityItem; onPress?: () => void }) {
  const negative = item.amount.startsWith('-');
  // Amount is displayed exactly as the API sent it; no arithmetic needed here.
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={[s.row, { alignItems: 'center' }]}>
        <Text style={[s.text, { fontWeight: '600' }]}>
          {TITLES[item.type]}
          {item.exchange ? <Text style={s.muted}>{` · ${item.exchange}`}</Text> : null}
        </Text>
        <Text style={[s.text, { color: negative ? colors.text : colors.accent, fontWeight: '600' }]} selectable>
          {`${negative ? '' : '+'}${item.amount} ${item.asset}`}
        </Text>
      </View>
      <View style={[s.row, { marginTop: 2 }]}>
        <Text style={[s.muted, { fontSize: 12 }]}>{new Date(item.createdAt).toLocaleString()}</Text>
        <Text style={{ color: STATUS_COLORS[item.status] ?? colors.muted, fontSize: 12 }}>
          {item.status}
          {onPress ? ' ›' : ''}
        </Text>
      </View>
    </Pressable>
  );
}
