import { Image } from "expo-image";
import { Pressable, ScrollView, View } from "react-native";

import { Text } from "@/src/components/AppText";
import { Icon } from "@/src/components/Icon";
import { SubHeader } from "@/src/components/SubHeader";
import { WebPageBackdrop } from "@/src/components/WebPageBackdrop";
import { useAccount } from "@/src/context/AppState";
import { SITE_BACKGROUNDS, type SiteBackgroundCategory } from "@/src/data/site-backgrounds";
import { makeStyles, useTheme } from "@/src/theme";
import { serifFont } from "@/src/typography";

const GROUPS: SiteBackgroundCategory[] = ["Islamic", "Nature"];

export default function BackgroundSettings() {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const { account, updateSettings } = useAccount();

  return (
    <View style={styles.root}>
      <WebPageBackdrop intensity="strong" />
      <View style={styles.foreground}>
        <SubHeader title="Website background" />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <View style={styles.introIcon}><Icon name="image-multiple-outline" size={26} color={colors.gold} /></View>
            <View style={styles.introCopy}>
              <Text style={styles.eyebrow}>THEME & APPEARANCE</Text>
              <Text style={styles.title}>Choose your atmosphere</Text>
              <Text style={styles.body}>
                Pick the scenery behind OurQuran. Dark and light themes use different contrast layers so the image stays visible without sacrificing readability.
              </Text>
            </View>
            <View style={styles.modePill}>
              <Icon name={scheme === "dark" ? "weather-night" : "white-balance-sunny"} size={17} color={colors.gold} />
              <Text style={styles.modeText}>{scheme === "dark" ? "Dark preview" : "Light preview"}</Text>
            </View>
          </View>

          {GROUPS.map((group) => {
            const items = SITE_BACKGROUNDS.filter((item) => item.category === group);
            return (
              <View key={group} style={styles.group}>
                <View style={styles.groupHead}>
                  <View>
                    <Text style={styles.groupTitle}>{group}</Text>
                    <Text style={styles.groupSub}>{group === "Islamic" ? "Mosques, arches, courtyards and lantern-lit architecture." : "Landscapes chosen for calm, depth and visual focus."}</Text>
                  </View>
                  <Text style={styles.groupCount}>{items.length} backgrounds</Text>
                </View>

                <View style={styles.grid}>
                  {items.map((item) => {
                    const selected = account.settings.siteBackground === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => updateSettings({ siteBackground: item.id })}
                        style={({ pressed, hovered }: any) => [
                          styles.card,
                          selected && styles.cardSelected,
                          hovered && styles.cardHover,
                          pressed && styles.pressed,
                        ]}
                        testID={`background-${item.id}`}
                      >
                        <Image source={item.source} contentFit="cover" contentPosition={item.position as any} style={styles.preview} />
                        <View pointerEvents="none" style={styles.previewScrim} />
                        <View style={styles.cardTop}>
                          <View style={styles.categoryBadge}><Text style={styles.categoryBadgeText}>{group}</Text></View>
                          {selected ? (
                            <View style={styles.selectedBadge}><Icon name="check" size={16} color={colors.onBrandPrimary} /></View>
                          ) : null}
                        </View>
                        <View style={styles.cardFooter}>
                          <Text style={styles.cardName}>{item.name}</Text>
                          <Text style={styles.cardHint}>{selected ? "Applied now" : "Preview"}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface, position: "relative" },
  foreground: { flex: 1, zIndex: 1 },
  content: {
    width: "100%",
    maxWidth: 1420,
    alignSelf: "center",
    paddingHorizontal: 34,
    paddingTop: 20,
    paddingBottom: 70,
    gap: 24,
  },
  intro: {
    minHeight: 150,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingHorizontal: 24,
    paddingVertical: 22,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.goldBorder,
    backgroundColor: c.surfaceSecondary,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  introIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.goldBorder,
  },
  introCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: c.gold, fontSize: 11, lineHeight: 15, fontWeight: "900", letterSpacing: 1.9, marginBottom: 4 },
  title: { color: c.onSurface, fontFamily: serifFont, fontSize: 34, lineHeight: 40, fontWeight: "700" },
  body: { color: c.muted, fontSize: 15, lineHeight: 23, maxWidth: 820, marginTop: 4, fontWeight: "500" },
  modePill: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: c.goldBorder,
    backgroundColor: c.goldSoft,
  },
  modeText: { color: c.gold, fontSize: 12, fontWeight: "900" },

  group: {
    gap: 14,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
  },
  groupHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 18, paddingHorizontal: 2 },
  groupTitle: { color: c.onSurface, fontFamily: serifFont, fontSize: 25, lineHeight: 31, fontWeight: "700" },
  groupSub: { color: c.muted, fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  groupCount: { color: c.gold, fontSize: 12.5, fontWeight: "900" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },

  card: {
    width: "19%",
    minWidth: 205,
    aspectRatio: 16 / 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceTertiary,
    overflow: "hidden",
    cursor: "pointer",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  cardSelected: {
    borderColor: c.gold,
    borderWidth: 2,
    shadowColor: c.gold,
    shadowOpacity: 0.32,
    shadowRadius: 18,
  },
  cardHover: { transform: [{ translateY: -2 }], borderColor: c.goldBorder },
  preview: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  previewScrim: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.32)" },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", padding: 11 },
  categoryBadge: { minHeight: 25, paddingHorizontal: 9, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.52)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", justifyContent: "center" },
  categoryBadgeText: { color: "#FFFDF7", fontSize: 9.5, fontWeight: "900", letterSpacing: 0.65 },
  selectedBadge: { width: 29, height: 29, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: c.brandPrimary },
  cardFooter: { flex: 1, justifyContent: "flex-end", padding: 12 },
  cardName: { color: "#FFFFFF", fontFamily: serifFont, fontSize: 15.5, lineHeight: 19, fontWeight: "700", textShadowColor: "rgba(0,0,0,0.92)", textShadowRadius: 8 },
  cardHint: { color: "#F3EBD8", fontSize: 10.5, lineHeight: 14, fontWeight: "700", marginTop: 2, textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 7 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
}));
