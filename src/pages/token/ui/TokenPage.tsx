import React from 'react';
import { router } from 'expo-router';
import { Screen } from '@/shared/ui';
import { useSessionStore } from '@/entities/session';
import { TokenForm } from '@/features/set-token';

export function TokenPage() {
  const token = useSessionStore((st) => st.token);
  return (
    <Screen title="API token" onBack={token ? () => (router.canGoBack() ? router.back() : router.replace('/')) : undefined}>
      <TokenForm onSaved={() => router.replace('/')} />
    </Screen>
  );
}
