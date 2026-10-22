import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';

export const colors = {
  bg: '#0f1115',
  card: '#181b22',
  border: '#272b35',
  text: '#f2f4f8',
  muted: '#8a91a1',
  accent: '#3ddc97',
  accentText: '#06150e',
  danger: '#ff6b6b',
  warn: '#ffc857',
};

export function Screen({
  title,
  onBack,
  right,
  children,
  scroll = true,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
}) {
  return (
    <View style={s.screen}>
      <View style={s.header}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Text style={s.back}>‹ Back</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <Text style={s.title}>{title}</Text>
        <View style={{ minWidth: 50, alignItems: 'flex-end' }}>{right}</View>
      </View>
      {scroll ? <ScrollView contentContainerStyle={s.content}>{children}</ScrollView> : <View style={[s.content, { flex: 1 }]}>{children}</View>}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      style={[s.btn, variant === 'primary' ? s.btnPrimary : s.btnSecondary, off && { opacity: 0.45 }]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.accentText : colors.text} />
      ) : (
        <Text style={[s.btnText, variant === 'primary' ? { color: colors.accentText } : variant === 'danger' ? { color: colors.danger } : null]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Banner({ tone, children }: { tone: 'info' | 'warn' | 'error' | 'success'; children: React.ReactNode }) {
  const c = tone === 'error' ? colors.danger : tone === 'warn' ? colors.warn : tone === 'success' ? colors.accent : colors.muted;
  return (
    <View style={[s.banner, { borderColor: c }]}>
      {typeof children === 'string' ? <Text style={[s.text, { color: c }]}>{children}</Text> : children}
    </View>
  );
}

export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.muted}>{label}</Text>
      <Text style={[s.text, strong && { fontWeight: '700' }, { flexShrink: 1, textAlign: 'right' }]} selectable>
        {value}
      </Text>
    </View>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, width: '100%', maxWidth: 480, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { color: colors.accent, fontSize: 16, minWidth: 50 },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 8 },
  btn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btnPrimary: { backgroundColor: colors.accent },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  btnText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  banner: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  text: { color: colors.text, fontSize: 15 },
  muted: { color: colors.muted, fontSize: 14 },
  h1: { color: colors.text, fontSize: 32, fontWeight: '800' },
  h2: { color: colors.text, fontSize: 18, fontWeight: '700' },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 18,
    backgroundColor: colors.card,
  },
});
