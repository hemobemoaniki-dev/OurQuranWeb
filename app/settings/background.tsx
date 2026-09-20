import { Image } from "expo-image";
import { Pressable, ScrollView, View } from "react-native";

import { Text } from "@/src/components/AppText";
import { Icon } from "@/src/components/Icon";
import { SubHeader } from "@/src/components/SubHeader";
import { useAccount } from "@/src/context/AppState";
import { SITE_BACKGROUNDS, type SiteBackgroundCategory } from "@/src/data/site-backgrounds";
import { makeStyles, useTheme } from "@/src/theme";

const GROUPS: SiteBackgroundCategory[] = ["Islamic", "Nature"];

export default function BackgroundSettings() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { account, updateSettings } = useAccount();

  return (
    <View style={styles.root}>
      <SubHeader title="Website background" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.title}>Choose your atmosphere</Text>
          <Text style={styles.body}>Twenty local cinematic presets are available. Every preset uses a protected contrast layer so navigation, cards and text remain readable.</Text>
        </View>

        {GROUPS.map((group) => (
          <View key={group} style={styles.group}>
            <View style={styles.groupHead}>
              <Text style={styles.groupTitle}>{group}</Text>
              <Text style={styles.groupCount}>10 backgrounds</Text>
            </View>
            <View style={styles.grid}>
              {SITE_BACKGROUNDS.filter((item) => item.category === group).map((item) => {
                const selected = account.settings.siteBackground === item.id;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => updateSettings({ siteBackground: item.id })}
                    style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && styles.pressed]}
                    testID={`background-${item.id}`}
                  >
                    <Image source={item.source} contentFit="cover" contentPosition={item.position as any} style={styles.preview} />
                    <View pointerEvents="none" style={styles.previewScrim} />
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardName}>{item.name}</Text>
                      {selected ? <View style={styles.selectedBadge}><Icon name="check" size={15} color={colors.onBrandPrimary} /></View> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  content: { width: "100%", maxWidth: 1320, alignSelf: "center", paddingHorizontal: 28, paddingBottom: 60, gap: 28 },
  intro: { paddingTop: 8, gap: 7 },
  title: { color: c.onSurface, fontSize: 28, lineHeight: 34, fontWeight: "900" },
  body: { color: c.muted, fontSize: 14.5, lineHeight: 22, maxWidth: 760 },
  group: { gap: 13 },
  groupHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  groupTitle: { color: c.onSurface, fontSize: 20, fontWeight: "900" },
  groupCount: { color: c.gold, fontSize: 12.5, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 13 },
  card: { width: "18.9%", minWidth: 180, height: 150, borderRadius: 17, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, overflow: "hidden", cursor: "pointer" },
  cardSelected: { borderColor: c.gold, borderWidth: 2, shadowColor: c.gold, shadowOpacity: 0.24, shadowRadius: 15 },
  preview: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  previewScrim: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.38)" },
  cardFooter: { flex: 1, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8, padding: 13 },
  cardName: { flex: 1, color: "#FFFFFF", fontSize: 13.5, lineHeight: 18, fontWeight: "900", textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 7 },
  selectedBadge: { width: 25, height: 25, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: c.brandPrimary },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
}));
