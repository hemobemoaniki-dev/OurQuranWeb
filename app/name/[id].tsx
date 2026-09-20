import { Text } from "@/src/components/AppText";
import { useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/Icon";
import { useAccount } from "@/src/context/AppState";
import { NAMES_99 } from "@/src/data/names99";
import { makeStyles, useTheme } from "@/src/theme";
import { arabicFont, serifFont } from "@/src/typography";

export function generateStaticParams() {
  return NAMES_99.map((name) => ({ id: String(name.number) }));
}

export default function NameDetail() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isNameBookmarked, toggleNameBookmark } = useAccount();
  const name = NAMES_99.find((n) => n.number === parseInt(String(id), 10)) ?? NAMES_99[0];
  const saved = isNameBookmarked(name.number);

  return (
    <>
      <Head>
        <title>{`${name.transliteration} — Name ${name.number} of Allah | OurQuran`}</title>
        <meta name="description" content={`${name.transliteration}: ${name.meaning}. Learn the meaning and explanation of this Name of Allah on OurQuran.`} />
      </Head>
      <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/names"); }} hitSlop={10} style={styles.backBtn} testID="name-detail-back">
          <Icon name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>{name.number} of 99</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={saved ? "Remove from favorites" : "Add to favorites"} onPress={() => toggleNameBookmark(name.number)} hitSlop={10} style={styles.backBtn}>
          <Icon name={saved ? "heart" : "heart-outline"} size={24} color={colors.gold} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.arabic} maxFontSizeMultiplier={1.1}>
          {name.arabic}
        </Text>
        <Text style={styles.translit}>{name.transliteration}</Text>
        <View style={styles.divider} />
        <Text style={styles.meaning}>{name.meaning}</Text>
        <Text style={styles.description}>{name.description}</Text>
      </View>
    </View>
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 10 },
  arabic: {
    color: colors.gold,
    fontSize: 48,
    lineHeight: 72,
    fontFamily: arabicFont,
    writingDirection: "rtl",
    textAlign: "center",
    includeFontPadding: true,
    paddingHorizontal: 10,
    width: "100%",
  },
  translit: { color: colors.onSurface, fontSize: 32, fontFamily: serifFont, textAlign: "center" },
  divider: { height: 1, width: 80, backgroundColor: colors.goldBorder, marginVertical: 12 },
  meaning: { color: colors.onSurface, fontSize: 20, fontWeight: "600", textAlign: "center" },
  description: { color: colors.muted, fontSize: 15, lineHeight: 24, textAlign: "center", marginTop: 6 },
}));
