import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { toApiError, type ApiError } from '@/shared/api';
import { formatUnits, parseApiAmount, validateClaimAmount } from '@/shared/lib/money';
import { Banner, Button, Card, Row, colors, s } from '@/shared/ui';
import { applyClaims, useBalanceStore } from '@/entities/balance';
import { getClaimOptions, useClaimStore, type Claim, type ClaimOptions } from '@/entities/claim';
import { useSubmissionStore } from '../model/submission';
import { SubmissionPanel } from './SubmissionPanel';

export function ClaimForm({ initialAsset, onCreated }: { initialAsset?: string; onCreated: (c: Claim) => void }) {
  const snapshot = useBalanceStore((st) => st.snapshot);
  const claims = useClaimStore((st) => st.claims);
  const balances = useMemo(() => (snapshot ? applyClaims(snapshot, claims) : null), [snapshot, claims]);
  const { submission, submit, dismiss } = useSubmissionStore();

  const [asset, setAsset] = useState<string | undefined>(initialAsset);
  const [options, setOptions] = useState<ClaimOptions | null>(null);
  const [optionsError, setOptionsError] = useState<ApiError | null>(null);
  const [optionsReload, setOptionsReload] = useState(0);
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'edit' | 'review'>('edit');

  // Default to the first asset with something available.
  useEffect(() => {
    if (!asset && balances?.length) setAsset((balances.find((b) => b.available > 0n) ?? balances[0]).asset);
  }, [asset, balances]);

  useEffect(() => {
    if (!asset) return;
    let cancelled = false;
    setOptions(null);
    setOptionsError(null);
    getClaimOptions(asset)
      .then((o) => {
        if (cancelled) return;
        setOptions(o);
        setDestinationId((cur) => (cur && o.destinations.some((d) => d.id === cur) ? cur : o.destinations[0]?.id ?? null));
      })
      .catch((e) => !cancelled && setOptionsError(toApiError(e)));
    return () => {
      cancelled = true;
    };
  }, [asset, optionsReload]);

  // An open submission (sending / retrying / unknown) takes over the screen:
  // the user must not be able to start a second claim while the first is unresolved.
  if (submission && submission.phase !== 'rejected') {
    return <SubmissionPanel onCreated={onCreated} />;
  }

  if (!balances) {
    return <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />;
  }

  const balance = balances.find((b) => b.asset === asset);
  const rules =
    balance && options
      ? {
          decimals: balance.decimals,
          available: balance.available,
          minAmount: parseApiAmount(options.minAmount, balance.decimals),
          fee: parseApiAmount(options.fee, balance.decimals),
        }
      : null;
  const result = rules && amount !== '' ? validateClaimAmount(amount, rules) : null;
  const destination = options?.destinations.find((d) => d.id === destinationId);
  const canReview = !!(result?.ok && destination);

  const confirm = async () => {
    if (!result?.ok || !asset || !destinationId) return;
    const claim = await submit({ asset, amount: result.canonical, destinationId });
    if (claim) onCreated(claim);
  };

  if (step === 'review' && result?.ok && rules && destination && asset) {
    return (
      <>
        <Card>
          <Text style={s.h2}>Confirm claim</Text>
          <Row label="Amount" value={`${result.canonical} ${asset}`} />
          <Row label="Network fee" value={`− ${formatUnits(result.fee, rules.decimals)} ${asset}`} />
          <Row label="You receive" value={`${formatUnits(result.receive, rules.decimals)} ${asset}`} strong />
          <Row label="To" value={destination.label} />
        </Card>
        <Text style={s.muted}>The amount leaves your available balance right away and arrives within about 20 seconds.</Text>
        <Button label={`Claim ${result.canonical} ${asset}`} onPress={confirm} />
        <Button label="Edit" variant="secondary" onPress={() => setStep('edit')} />
      </>
    );
  }

  const rejected = submission?.phase === 'rejected' ? submission : null;

  return (
    <>
      {rejected ? (
        <Banner tone="error">
          <Text style={{ color: colors.danger }}>{`Claim was not created: ${rejected.message}`}</Text>
          <Pressable onPress={dismiss}>
            <Text style={{ color: colors.accent }}>Dismiss</Text>
          </Pressable>
        </Banner>
      ) : null}

      <Text style={s.muted}>Asset</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {balances.map((b) => (
          <Chip
            key={b.asset}
            label={b.asset}
            selected={b.asset === asset}
            onPress={() => {
              if (b.asset === asset) return;
              setAsset(b.asset);
              setAmount('');
            }}
          />
        ))}
      </View>

      {balance ? (
        <Card>
          <Row label={`Available${balance.adjusted ? ' *' : ''}`} value={`${formatUnits(balance.available, balance.decimals)} ${balance.asset}`} strong />
          {optionsError ? (
            <>
              <Text style={{ color: colors.danger }}>{`Couldn't load claim options: ${optionsError.message}`}</Text>
              <Button label="Retry" variant="secondary" onPress={() => setOptionsReload((n) => n + 1)} />
            </>
          ) : !options ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <>
              <Row label="Minimum" value={`${options.minAmount} ${balance.asset}`} />
              <Row label="Fee" value={`${options.fee} ${balance.asset}`} />
            </>
          )}
        </Card>
      ) : null}

      {options && options.destinations.length > 1 ? (
        <>
          <Text style={s.muted}>Destination</Text>
          <View style={{ gap: 8 }}>
            {options.destinations.map((d) => (
              <Chip key={d.id} label={d.label} selected={d.id === destinationId} onPress={() => setDestinationId(d.id)} />
            ))}
          </View>
        </>
      ) : destination ? (
        <Row label="To" value={destination.label} />
      ) : options ? (
        <Banner tone="error">No destination available for this asset.</Banner>
      ) : null}

      <Text style={s.muted}>Amount</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          style={[s.input, { flex: 1 }]}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={colors.muted}
          inputMode="decimal"
          keyboardType="decimal-pad"
          autoCorrect={false}
          editable={!!rules}
        />
        <View style={{ width: 80 }}>
          <Button
            label="Max"
            variant="secondary"
            disabled={!rules}
            onPress={() => rules && setAmount(formatUnits(rules.available, rules.decimals))}
          />
        </View>
      </View>
      {result && !result.ok ? <Text style={{ color: colors.danger }}>{result.error}</Text> : null}
      {rejected?.field === 'amount' ? <Text style={{ color: colors.danger }}>{rejected.message}</Text> : null}

      {result?.ok && rules && asset ? (
        <Card>
          <Row label="Fee" value={`− ${formatUnits(result.fee, rules.decimals)} ${asset}`} />
          <Row label="You receive" value={`${formatUnits(result.receive, rules.decimals)} ${asset}`} strong />
        </Card>
      ) : null}

      <Button
        label="Review"
        disabled={!canReview}
        onPress={() => {
          dismiss();
          setStep('review');
        }}
      />
    </>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? '#13261d' : 'transparent',
      }}
    >
      <Text style={{ color: selected ? colors.accent : colors.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}
