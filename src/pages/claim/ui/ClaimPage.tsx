import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/shared/ui';
import { ClaimForm } from '@/features/claim-create';

export function ClaimPage() {
  const { asset } = useLocalSearchParams<{ asset?: string }>();
  return (
    <Screen title="Claim" onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
      <ClaimForm initialAsset={asset} onCreated={(c) => router.replace(`/claims/${c.id}`)} />
    </Screen>
  );
}
