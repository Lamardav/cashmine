import React from 'react';
import { Text } from 'react-native';
import { colors } from '@/shared/ui';

const COLORS: Record<string, string> = {
  pending: colors.warn,
  completed: colors.accent,
  confirmed: colors.accent,
  failed: colors.danger,
};

export function ClaimStatusBadge({ status }: { status: string }) {
  return <Text style={{ color: COLORS[status] ?? colors.muted, fontWeight: '600', fontSize: 13 }}>{status}</Text>;
}
