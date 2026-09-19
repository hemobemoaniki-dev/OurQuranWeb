import { Text } from "@/src/components/AppText";
import { AVATARS } from "@/src/lib/avatars";
import Constants from "expo-constants";
import { Linking, Pressable, ScrollView, View } from "react-native";

import { Icon } from "@/src/components/Icon";
import { SubHeader } from "@/src/components/SubHeader";
import { makeStyles, useTheme } from "@/src/theme";
import { serifFont } from "@/src/typography";

const PRIVACY_URL = "https://ourquran.web.app/privacy";
const DELETE_URL = "https://ourquran.web.app/delete-account";

export default function About() {
  const styles = useStyles();
  const { colors } = useTheme();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <View style={styles.root}>
      <SubHeader title="About" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.logoWrap}>
          <Icon name="mosque" size={40} color={colors.gold} />
          <Text style={styles.logo}>OurQuran</Text>
          <Text style={styles.version}>Version {version}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.body}>
            OurQuran helps you read the Qur&apos;an daily, track your Hasanaat, remember Allah through
            authentic adhkar and reflect on His beautiful names — a smaller step today, a greater tomorrow.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Content &amp; sources</Text>
          <Text style={styles.body}>• Qur&apos;an text &amp; Sahih International translation: Al Quran Cloud</Text>
          <Text style={styles.body}>• Recitations: EveryAyah.com</Text>
          <Text style={styles.body}>• Adhkar authenticated in Hisn al-Muslim</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Avatar photography</Text>
          <Text style={styles.body}>Real photographs from Wikimedia Commons. Cropped to a circle for display.</Text>
          {AVATARS.map(a => <View key={a.id} style={{ gap: 3 }}>
            <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(a.source); }}><Text style={styles.body}>{a.name} — {a.author}</Text></Pressable>
            <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(a.licenseUrl); }}><Text style={{ color: colors.gold, fontSize: 12 }}>{a.license} · View license</Text></Pressable>
          </View>)}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Privacy & account controls</Text>
          <Text style={styles.body}>
            Review how OurQuran handles account and reading data, or use the external deletion page if you no longer have the app installed.
          </Text>
          <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(PRIVACY_URL); }}>
            <Text style={{ color: colors.gold, fontSize: 14, fontWeight: "700" }}>Privacy Policy</Text>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(DELETE_URL); }}>
            <Text style={{ color: colors.gold, fontSize: 14, fontWeight: "700" }}>Delete account on the web</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 16, paddingBottom: 28, gap: 16 },
  logoWrap: { alignItems: "center", gap: 6, paddingVertical: 16 },
  logo: { color: colors.onSurface, fontSize: 28, fontFamily: serifFont },
  version: { color: colors.muted, fontSize: 13 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8 },
  sectionTitle: { color: colors.gold, fontSize: 14, fontWeight: "700" },
  body: { color: colors.onSurfaceSecondary, fontSize: 14, lineHeight: 22 },
}));
