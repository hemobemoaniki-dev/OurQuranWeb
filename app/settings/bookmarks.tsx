import { Text } from "@/src/components/AppText";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";

import { Icon } from "@/src/components/Icon";
import { SubHeader } from "@/src/components/SubHeader";
import { useAccount } from "@/src/context/AppState";
import { NAMES_99 } from "@/src/data/names99";
import { surahMeta } from "@/src/data/surahs";
import { makeStyles, useTheme } from "@/src/theme";

export default function Bookmarks() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { account, toggleBookmark, toggleNameBookmark } = useAccount();

  const ayahs = [...account.appState.bookmarks].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const names = [...account.appState.nameBookmarks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((saved) => ({ saved, name: NAMES_99.find((item) => item.number === saved.nameNumber) }))
    .filter((item) => !!item.name);

  const empty = ayahs.length === 0 && names.length === 0;

  return (
    <View style={styles.root}>
      <SubHeader title="Bookmarks" />
      {empty ? (
        <View style={styles.empty}>
          <Icon name="heart-outline" size={44} color={colors.gold} />
          <Text style={styles.emptyTitle}>No bookmarks yet</Text>
          <Text style={styles.emptyBody}>Save an ayah in the Reader or heart one of the 99 Names of Allah. Both folders sync with your account.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.folderHeader}>
            <View style={styles.folderIcon}><Icon name="book-open-page-variant-outline" size={21} color={colors.gold} /></View>
            <View style={styles.folderCopy}>
              <Text style={styles.folderTitle}>Quran ayahs</Text>
              <Text style={styles.folderSub}>{ayahs.length} saved {ayahs.length === 1 ? "ayah" : "ayahs"}</Text>
            </View>
          </View>

          {ayahs.length ? ayahs.map((item) => {
            const meta = surahMeta(item.surah);
            return (
              <View key={`${item.surah}:${item.ayah}`} style={styles.row} testID={`bookmark-${item.surah}-${item.ayah}`}>
                <Pressable style={styles.rowMain} onPress={() => router.push({ pathname: "/reader", params: { surah: item.surah, ayah: item.ayah } })}>
                  <View style={styles.badge}><Text style={styles.badgeText}>{item.surah}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{meta.name}</Text>
                    <Text style={styles.sub}>Ayah {item.ayah}</Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => toggleBookmark(item.surah, item.ayah)} hitSlop={10} style={styles.removeBtn}>
                  <Icon name="heart" size={22} color={colors.gold} />
                </Pressable>
              </View>
            );
          }) : <Text style={styles.folderEmpty}>No saved ayahs yet.</Text>}

          <View style={[styles.folderHeader, styles.secondFolder]}>
            <View style={styles.folderIcon}><Icon name="heart-multiple-outline" size={21} color={colors.gold} /></View>
            <View style={styles.folderCopy}>
              <Text style={styles.folderTitle}>99 Names favorites</Text>
              <Text style={styles.folderSub}>{names.length} saved {names.length === 1 ? "name" : "names"}</Text>
            </View>
          </View>

          {names.length ? names.map(({ saved, name }) => name ? (
            <View key={saved.nameNumber} style={styles.row} testID={`name-bookmark-${saved.nameNumber}`}>
              <Pressable style={styles.rowMain} onPress={() => router.push(`/name/${saved.nameNumber}` as any)}>
                <View style={styles.badge}><Text style={styles.badgeText}>{saved.nameNumber}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{name.transliteration}</Text>
                  <Text style={styles.sub}>{name.arabic} · {name.meaning}</Text>
                </View>
              </Pressable>
              <Pressable onPress={() => toggleNameBookmark(saved.nameNumber)} hitSlop={10} style={styles.removeBtn}>
                <Icon name="heart" size={22} color={colors.gold} />
              </Pressable>
            </View>
          ) : null) : <Text style={styles.folderEmpty}>No favorite Names yet.</Text>}
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { width: "100%", maxWidth: 860, alignSelf: "center", paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 10 },
  emptyTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
  emptyBody: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 21, maxWidth: 460 },
  folderHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, marginTop: 6 },
  secondFolder: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.divider },
  folderIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.goldBorder },
  folderCopy: { flex: 1 },
  folderTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "900" },
  folderSub: { color: colors.muted, fontSize: 12.5, marginTop: 2 },
  folderEmpty: { color: colors.muted, fontSize: 13.5, paddingHorizontal: 8, paddingVertical: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  badge: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.goldBorder, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center" },
  badgeText: { color: colors.gold, fontWeight: "900", fontSize: 14 },
  name: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  sub: { color: colors.muted, fontSize: 12.5, marginTop: 2 },
  removeBtn: { padding: 8 },
}));
