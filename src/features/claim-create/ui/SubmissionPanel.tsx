import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Button, Card, Row, colors, s } from '@/shared/ui';
import type { Claim } from '@/entities/claim';
import { useSubmissionStore } from '../model/submission';

/** Shown while a claim request is in flight or its outcome is unknown. */
export function SubmissionPanel({ onCreated }: { onCreated: (c: Claim) => void }) {
  const { submission, retry } = useSubmissionStore();
  if (!submission) return null;
  const { body, phase, message } = submission;
  const unknown = phase === 'unknown';

  return (
    <Card>
      <Text style={s.h2}>{unknown ? 'Claim status unknown' : 'Submitting claim…'}</Text>
      <Row label="Amount" value={`${body.amount} ${body.asset}`} />
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        {!unknown ? <ActivityIndicator color={colors.accent} /> : null}
        <Text style={[s.text, unknown && { color: colors.warn }, { flex: 1 }]}>{message ?? 'Sending…'}</Text>
      </View>
      {unknown ? (
        <>
          <Text style={s.muted}>
            Your claim may or may not have been created. Checking again re-sends the same request, so it can never
            create a second claim. Don't start a new claim until this is resolved.
          </Text>
          <Button
            label="Check again"
            onPress={async () => {
              const c = await retry();
              if (c) onCreated(c);
            }}
          />
        </>
      ) : null}
    </Card>
  );
}
