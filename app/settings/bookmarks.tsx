import { Text } from "@/src/components/AppText";
import { useRouter } from "expo-router";
import { FlatList, Pressable, View } from "react-native";

import { Icon } from "@/src/components/Icon";
import { SubHeader } from "@/src/components/SubHeader";
import { useAccount } from "@/src/context/AppState";
import { surahMeta } from "@/src/data/surahs";
import { makeStyles, useTheme } from "@/src/theme";

export default function Bookmarks() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { account, toggleBookmark } = useAccount();

  const items = [...account.appState.bookmarks].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <View style={styles.root}>
      <SubHeader title="Bookmarks" />
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="heart-outline" size={44} color={colors.gold} />
          <Text style={styles.emptyTitle}>No bookmarks yet</Text>
          <Text style={styles.emptyBody}>Tap the heart on any verse in the Reader to save it here.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => `${b.surah}:${b.ayah}`}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const meta = surahMeta(item.surah);
            return (
              <View style={styles.row} testID={`bookmark-${item.surah}-${item.ayah}`}>
                <Pressable
                  style={styles.rowMain}
                  onPress={() => router.push({ pathname: "/reader", params: { surah: item.surah, ayah: item.ayah } })}
                  testID={`bookmark-open-${item.surah}-${item.ayah}`}
                >
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.surah}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{meta.name}</Text>
                    <Text style={styles.sub}>Ayah {item.ayah}</Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => toggleBookmark(item.surah, item.ayah)}
                  hitSlop={10}
                  style={styles.removeBtn}
                  testID={`bookmark-remove-${item.surah}-${item.ayah}`}
                >
                  <Icon name="heart" size={22} color={colors.gold} />
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 16, paddingBottom: 28, gap: 10 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 10 },
  emptyTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "700" },
  emptyBody: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 21 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: colors.gold, fontWeight: "700", fontSize: 14 },
  name: { color: colors.onSurface, fontSize: 16, fontWeight: "600" },
  sub: { color: colors.muted, fontSize: 12 },
  removeBtn: { padding: 6 },
}));
