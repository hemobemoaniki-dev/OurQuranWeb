import { Text } from "@/src/components/AppText";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { AppState, FlatList, Pressable, View } from "react-native";
import { useEffect, useState } from "react";

import { SubHeader } from "@/src/components/SubHeader";
import { Icon } from "@/src/components/Icon";
import { NAMES_99, nameOfDay } from "@/src/data/names99";
import { localDayNumber } from "@/src/lib/dates";
import { makeStyles, useTheme } from "@/src/theme";
import { arabicFont, serifFont } from "@/src/typography";

const ARCH_BG =
  "https://images.unsplash.com/photo-1763641699573-cf2c656b325e?crop=entropy&cs=srgb&fm=jpg&w=940&q=85";

export default function Names() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const [day, setDay] = useState(() => localDayNumber());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      setDay(localDayNumber());
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(refresh, Math.min(midnight.getTime() - now.getTime() + 50, 60000));
    };
    refresh();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => { clearTimeout(timer); sub.remove(); };
  }, []);
  const featured = nameOfDay(day);
  const rest = NAMES_99.filter((n) => n.number !== featured.number);

  return (
    <View style={styles.root}>
      <SubHeader title="99 Names" showBack={false} />
      <FlatList
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
        data={rest}
        keyExtractor={(n) => String(n.number)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.eyebrow}>ALLAH&apos;S BEAUTIFUL NAMES</Text>
            <Text style={styles.title}>99 Names of Allah</Text>
            <Text style={styles.subtitle}>Reflect and remember</Text>

            <Pressable
              style={styles.hero}
              onPress={() => router.push({ pathname: "/name/[id]", params: { id: featured.number } })}
              testID="name-of-day-card"
            >
              <Image source={{ uri: ARCH_BG }} style={styles.heroBg} contentFit="cover" />
              <LinearGradient colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.85)"]} style={styles.heroScrim} />
              <View style={styles.heroInner}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroLabel}>Name of the Day</Text>
                  <Text style={styles.heroName}>{featured.transliteration}</Text>
                  <Text style={styles.heroMeaning}>{featured.meaning}</Text>
                  <View style={styles.heroDivider} />
                  <Text style={styles.heroDesc}>{featured.description}</Text>
                </View>
                <View style={styles.heroArabicWrap}>
                  <Text style={styles.heroArabic} maxFontSizeMultiplier={1.1}>
                    {featured.arabic}
                  </Text>
                </View>
              </View>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push({ pathname: "/name/[id]", params: { id: item.number } })}
            testID={`name-row-${item.number}`}
          >
            <View style={styles.numBadge}>
              <Text style={styles.numText}>{item.number}</Text>
            </View>
            <View style={styles.nameInfo}>
              <Text style={styles.nameEn}>{item.transliteration}</Text>
              <Text style={styles.nameMeaning}>{item.meaning}</Text>
            </View>
            <View style={styles.nameArWrap}>
              <Text style={styles.nameAr} maxFontSizeMultiplier={1.1}>
                {item.arabic}
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.muted} />
          </Pressable>
        )}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { width: "100%", maxWidth: 980, alignSelf: "center", paddingHorizontal: 28, paddingBottom: 56, gap: 12 },
  headerWrap: { gap: 4, paddingBottom: 8 },
  eyebrow: { color: colors.gold, fontSize: 11, letterSpacing: 2, fontWeight: "700", marginTop: 4 },
  title: { color: colors.onSurface, fontSize: 30, fontFamily: serifFont },
  subtitle: { color: colors.muted, fontSize: 14, marginBottom: 12 },
  hero: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.goldBorder,
    minHeight: 220,
  },
  heroBg: { ...({ position: "absolute" } as const), top: 0, left: 0, right: 0, bottom: 0 },
  heroScrim: { ...({ position: "absolute" } as const), top: 0, left: 0, right: 0, bottom: 0 },
  heroInner: { flexDirection: "row", alignItems: "center", padding: 18, gap: 12 },
  heroLabel: { color: colors.gold, fontSize: 13, fontWeight: "700" },
  heroName: { color: "#FFF7E6", fontSize: 30, fontFamily: serifFont, marginTop: 4 },
  heroMeaning: { color: "#E8E2D2", fontSize: 15 },
  heroDivider: { height: 1, backgroundColor: "rgba(212,175,55,0.5)", marginVertical: 10, width: 120 },
  heroDesc: { color: "#E8E2D2", fontSize: 13, lineHeight: 19 },
  heroArabicWrap: {
    width: 126,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  heroArabic: {
    color: colors.gold,
    fontSize: 36,
    lineHeight: 54,
    fontFamily: arabicFont,
    writingDirection: "rtl",
    textAlign: "center",
    includeFontPadding: true,
    width: "100%",
    paddingHorizontal: 12,
    overflow: "visible",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  numBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: { color: colors.gold, fontWeight: "700", fontSize: 13 },
  nameInfo: { flex: 1, minWidth: 0 },
  nameEn: { color: colors.onSurface, fontSize: 17, fontFamily: serifFont },
  nameMeaning: { color: colors.muted, fontSize: 12 },
  nameArWrap: {
    width: 112,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  nameAr: {
    color: colors.gold,
    fontSize: 20,
    lineHeight: 32,
    fontFamily: arabicFont,
    writingDirection: "rtl",
    textAlign: "center",
    includeFontPadding: true,
    width: "100%",
    paddingHorizontal: 10,
    overflow: "visible",
  },
}));
