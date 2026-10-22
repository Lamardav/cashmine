import React, { useState } from 'react';
import { Text, TextInput } from 'react-native';
import { useSessionStore } from '@/entities/session';
import { Button, Card, colors, s } from '@/shared/ui';

// Cached per-user state is reset by the app layer when the token changes.
const changeToken = (token: string | null) => useSessionStore.getState().setToken(token);

export function TokenForm({ onSaved }: { onSaved?: () => void }) {
  const token = useSessionStore((st) => st.token);
  const [value, setValue] = useState('');
  const trimmed = value.trim();
  const save = () => {
    if (!trimmed) return;
    changeToken(trimmed);
    setValue('');
    onSaved?.();
  };

  return (
    <>
      <Card>
        <Text style={s.h2}>{token ? 'Change API token' : 'Connect your account'}</Text>
        <Text style={s.muted}>
          Paste your CashMine API token. It is stored only in this browser and sent only to the CashMine API.
        </Text>
        <TextInput
          style={[s.input, { fontSize: 15 }]}
          value={value}
          onChangeText={setValue}
          placeholder="Token"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          onSubmitEditing={save}
        />
        <Button label="Save token" disabled={!trimmed} onPress={save} />
      </Card>
      {token ? <Button label="Forget token" variant="danger" onPress={() => changeToken(null)} /> : null}
    </>
  );
}
