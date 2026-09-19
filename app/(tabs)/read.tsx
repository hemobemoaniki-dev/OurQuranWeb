import Head from "expo-router/head";
import { Text } from "@/src/components/AppText";
import { useRouter } from "expo-router";
import { FlatList, Pressable, View } from "react-native";

import { SubHeader } from "@/src/components/SubHeader";
import { Icon } from "@/src/components/Icon";
import { useAccount } from "@/src/context/AppState";
import { SURAHS, surahMeta } from "@/src/data/surahs";
import { makeStyles, useTheme } from "@/src/theme";
import { serifFont } from "@/src/typography";

export default function ReadTab() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { account } = useAccount();
  const meta = surahMeta(account.currentSurah);

  return (
    <>
      <Head><title>Read Quran Online — OurQuran</title><meta name="description" content="Read all 114 surahs of the Quran with a modern, focused reading experience, recitation controls, bookmarks and synced progress." /></Head>
      <View style={styles.root}>
      <SubHeader title="Read" showBack={false} />
      <FlatList
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
        data={SURAHS}
        keyExtractor={(s) => String(s.number)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.sectionEyebrow}>PICK UP WHERE YOU LEFT OFF</Text>
            <Pressable
              style={styles.continueCard}
              onPress={() => router.push("/reader")}
              testID="read-continue-card"
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.continueLabel}>Continue Reading</Text>
                <Text style={styles.continueSurah}>{meta.name}</Text>
                <Text style={styles.continueMeta}>
                  Ayah {account.currentAyah} of {meta.ayahs}
                </Text>
              </View>
              <View style={styles.playBtn}>
                <Icon name="play" size={22} color={colors.onBrandPrimary} />
              </View>
            </Pressable>
            <Text style={styles.listTitle}>All Surahs</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push({ pathname: "/reader", params: { surah: item.number, ayah: 1 } })}
            testID={`surah-row-${item.number}`}
          >
            <View style={styles.numBadge}>
              <Text style={styles.numText}>{item.number}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.surahName}>{item.name}</Text>
              <Text style={styles.surahSub}>{item.ayahs} verses</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.muted} />
          </Pressable>
        )}
      />
    </View>
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { width: "100%", maxWidth: 980, alignSelf: "center", paddingHorizontal: 28, paddingBottom: 56 },
  headerWrap: { gap: 14, paddingTop: 12, paddingBottom: 12 },
  sectionEyebrow: { color: colors.gold, fontSize: 11, letterSpacing: 1.5, fontWeight: "700", marginTop: 4 },
  continueCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surfaceSecondary,
    minHeight: 132,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  continueLabel: { color: colors.muted, fontSize: 12 },
  continueSurah: { color: colors.onSurface, fontSize: 24, fontFamily: serifFont },
  continueMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  listTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700", marginTop: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surfaceSecondary,
  },
  numBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: { color: colors.gold, fontWeight: "700", fontSize: 14 },
  surahName: { color: colors.onSurface, fontSize: 16, fontWeight: "600" },
  surahSub: { color: colors.muted, fontSize: 12 },
}));
