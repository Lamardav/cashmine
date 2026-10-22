import React from 'react';
import { Pressable } from 'react-native';
import { Banner } from '@/shared/ui';
import { useClaimStore } from '@/entities/claim';
import { useSubmissionStore } from '@/features/claim-create';

const RECENT_MS = 10 * 60_000;

/** Banners for claims in flight, unknown, or recently settled. */
export function ClaimNotices({ onOpenClaim, onOpenSubmission }: { onOpenClaim: (id: string) => void; onOpenSubmission: () => void }) {
  const submission = useSubmissionStore((st) => st.submission);
  const claims = useClaimStore((st) => st.claims);
  const now = Date.now();
  const recent = claims.filter((c) => c.status === 'pending' || now - Date.parse(c.updatedAt) < RECENT_MS);

  return (
    <>
      {submission && submission.phase !== 'rejected' ? (
        <Pressable onPress={onOpenSubmission}>
          <Banner tone="warn">
            {`Claim of ${submission.body.amount} ${submission.body.asset}: ${
              submission.phase === 'unknown' ? 'status unknown. Tap to check.' : 'sending…'
            }`}
          </Banner>
        </Pressable>
      ) : null}
      {recent.map((c) => (
        <Pressable key={c.id} onPress={() => onOpenClaim(c.id)}>
          <Banner tone={c.status === 'failed' ? 'error' : c.status === 'completed' ? 'success' : 'info'}>
            {c.status === 'pending'
              ? `Claim of ${c.amount} ${c.asset} in progress. Tap to follow.`
              : c.status === 'completed'
                ? `Claim of ${c.amount} ${c.asset} completed. You received ${c.receiveAmount} ${c.asset}.`
                : `Claim of ${c.amount} ${c.asset} failed${c.failureReason ? `: ${c.failureReason}` : ''}. The amount is back in available.`}
          </Banner>
        </Pressable>
      ))}
    </>
  );
}
