import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { router } from 'expo-router';
import { toApiError, type ApiError } from '@/shared/api';
import { Button, Screen, colors, s } from '@/shared/ui';
import { ActivityRow, getActivity, type ActivityItem } from '@/entities/activity';

export function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const loadingRef = useRef(false);

  const load = useCallback(
    async (from: string | null, replace: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const page = await getActivity(from);
        setItems((prev) => {
          // De-duplicate by id in case a page shifted between requests.
          const base = replace ? [] : prev;
          const seen = new Set(base.map((i) => i.id));
          return [...base, ...page.items.filter((i) => !seen.has(i.id))];
        });
        setCursor(page.nextCursor);
        setDone(page.nextCursor === null);
      } catch (e) {
        setError(toApiError(e));
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(null, true);
  }, [load]);

  const loadMore = () => {
    if (!done && !error && cursor) load(cursor, false);
  };

  return (
    <Screen
      title="Activity"
      scroll={false}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    >
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <ActivityRow
            item={item}
            onPress={item.type === 'claim' && item.relatedId ? () => router.push(`/claims/${item.relatedId}`) : undefined}
          />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshing={false}
        ListEmptyComponent={!loading && !error ? <Text style={s.muted}>No activity yet.</Text> : undefined}
        ListFooterComponent={
          <View style={{ paddingVertical: 16, gap: 10 }}>
            {loading ? <ActivityIndicator color={colors.accent} /> : null}
            {error ? (
              <>
                <Text style={{ color: colors.danger }}>{`Couldn't load activity: ${error.message}`}</Text>
                <Button label="Retry" variant="secondary" onPress={() => load(items.length ? cursor : null, !items.length)} />
              </>
            ) : null}
            {!loading && !error && !done && items.length > 0 ? (
              <Button label="Load more" variant="secondary" onPress={loadMore} />
            ) : null}
            {done && items.length > 0 ? <Text style={[s.muted, { textAlign: 'center' }]}>That's everything.</Text> : null}
            {!loading ? (
              <Button label="Reload from top" variant="secondary" onPress={() => load(null, true)} />
            ) : null}
          </View>
        }
      />
    </Screen>
  );
}
