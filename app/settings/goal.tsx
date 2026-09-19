import { Text, TextInput } from "@/src/components/AppText";
import { useEffect, useRef, useState } from "react";
import { Pressable, View, ScrollView } from "react-native";
import { SubHeader } from "@/src/components/SubHeader";
import { useAccount } from "@/src/context/AppState";
import { makeStyles, useTheme } from "@/src/theme";

export default function GoalSettings() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { account, hydrated, updateSettings } = useAccount();
  const [draft, setDraft] = useState(String(account.settings.dailyGoal));
  const [width, setWidth] = useState(1);
  const [saved, setSaved] = useState(false);
  const dirty = useRef(false);
  useEffect(() => { if (!dirty.current) setDraft(String(account.settings.dailyGoal)); }, [account.settings.dailyGoal]);
  const value = Math.max(1, Math.min(6236, Number(draft) || 1));
  const change = (next: string) => { dirty.current = true; setSaved(false); setDraft(next); };
  const drag = (x: number) => change(String(1 + Math.round(Math.max(0, Math.min(1, x / width)) * 299)));
  return <View style={styles.root}>
    <SubHeader title="Daily Quran Goal" />
    <ScrollView keyboardShouldPersistTaps="handled"><View style={styles.card}>
      <Text style={styles.title}>Make time for your Quran</Text>
      <TextInput style={styles.number} value={draft} keyboardType="number-pad" maxLength={4} accessibilityLabel="Daily goal in ayahs" onChangeText={(s) => change(s.replace(/[^0-9]/g, ""))} />
      <Text style={styles.hint}>ayahs per day</Text>
      <View style={styles.slider} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => drag(e.nativeEvent.locationX)} onResponderMove={(e) => drag(e.nativeEvent.locationX)}
        accessibilityRole="adjustable" accessibilityLabel="Daily goal" accessibilityValue={{ min: 1, max: 6236, now: value }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => change(String(Math.max(1, Math.min(6236, value + (e.nativeEvent.actionName === "increment" ? 1 : -1)))))}>
        <View pointerEvents="none" style={styles.track}><View style={{ backgroundColor: colors.gold, height: 5, borderRadius: 3, width: `${Math.min(1, (value - 1) / 299) * 100}%` }} /></View>
        <View pointerEvents="none" style={[styles.thumb, { left: Math.min(Math.max(0, width - 24), Math.max(0, (value - 1) / 299 * (width - 24))) }]} />
      </View>
      <Text style={styles.hint}>Drag for 1–300, or type any number up to 6,236.</Text>
      <Pressable disabled={!hydrated} style={({ pressed }) => [styles.button, { opacity: pressed ? 0.65 : 1 }]} onPress={() => { updateSettings({ dailyGoal: value }); dirty.current = false; setDraft(String(value)); setSaved(true); }}><Text style={styles.buttonText}>Save goal</Text></Pressable>
      {saved && <Text style={styles.hint}>Goal saved. It will sync when you’re signed in and connected.</Text>}
    </View></ScrollView>
  </View>;
}
const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface }, card: { margin: 20, padding: 22, gap: 16, borderRadius: 24, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary },
  title: { color: c.onSurface, fontSize: 21, fontWeight: "600" }, number: { color: c.gold, fontSize: 48, textAlign: "center", fontWeight: "700", padding: 6 }, hint: { color: c.muted, fontSize: 13, lineHeight: 20, textAlign: "center" },
  slider: { height: 48, justifyContent: "center" }, track: { height: 5, borderRadius: 3, backgroundColor: c.border }, thumb: { position: "absolute", width: 24, height: 24, borderRadius: 12, backgroundColor: c.gold },
  button: { padding: 16, alignItems: "center", borderRadius: 16, backgroundColor: c.brandPrimary }, buttonText: { color: c.onBrandPrimary, fontSize: 15, fontWeight: "700" },
}));
