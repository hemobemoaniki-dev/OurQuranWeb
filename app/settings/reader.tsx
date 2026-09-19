import { Text } from "@/src/components/AppText";
import { useFocusEffect } from "expo-router";
import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync, type AudioPlayer } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, ScrollView, Pressable, Switch, View } from "react-native";

import { Icon } from "@/src/components/Icon";
import { RecitationSpeedControl, type RecitationSpeed } from "@/src/components/RecitationSpeedControl";
import { SubHeader } from "@/src/components/SubHeader";
import { useAccount } from "@/src/context/AppState";
import { RECITER_PREVIEW_AYAH, RECITER_PREVIEW_SURAH, recitationUrl, RECITERS } from "@/src/data/reciters";
import { getCachedAyahUri } from "@/src/lib/audio-cache";
import { makeStyles, useTheme } from "@/src/theme";


export default function ReaderSettings({ section = "reciter" }: { section?: "reciter" | "speed" | "autoplay" }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { account, updateSettings } = useAccount();
  const s = account.settings;

  // Previews own their player and explicitly enable audio after the route guard.
  const playerRef = useRef<AudioPlayer | null>(null);
  const subRef = useRef<{ remove: () => void } | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const previewRequest = useRef(0);
  const selectedPreview = useRef<string | null>(null);

  const stopPreview = useCallback(() => {
    previewRequest.current += 1;
    const p = playerRef.current;
    const sub = subRef.current;
    playerRef.current = null;
    subRef.current = null;
    selectedPreview.current = null;
    try { p?.pause(); } catch {}
    try { sub?.remove(); } catch {}
    try { p?.remove(); } catch {}
    setPreviewId(null);
    setPreviewLoading(false);
  }, []);

  const previewReciter = async (reciterId: string) => {
    const wasSelected = selectedPreview.current === reciterId;
    stopPreview();
    setPreviewError(false);
    if (wasSelected) return;
    const request = previewRequest.current;
    selectedPreview.current = reciterId;
    setPreviewId(reciterId);
    setPreviewLoading(true);
    // Ayat al-Kursi (2:255): a mid-surah verse that is unmistakably the chosen
    // reciter (the 1:1 basmala track is a shared intro for some reciters).
    try {
      const url =
        (await getCachedAyahUri(reciterId, RECITER_PREVIEW_SURAH, RECITER_PREVIEW_AYAH)) ??
        recitationUrl(reciterId, RECITER_PREVIEW_SURAH, RECITER_PREVIEW_AYAH);
      if (request !== previewRequest.current) return;
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
      if (request !== previewRequest.current) return;
      await setIsAudioActiveAsync(true);
      if (request !== previewRequest.current) return;
      const p = createAudioPlayer({ uri: url }, { updateInterval: 100 });
      p.setPlaybackRate(s.speed, "high");
      playerRef.current = p;
      subRef.current = p.addListener("playbackStatusUpdate", (st) => {
        if (request !== previewRequest.current || playerRef.current !== p) return;
        setPreviewLoading(!st.isLoaded || st.isBuffering);
        if (st.error) { stopPreview(); setPreviewError(true); }
        else if (st.didJustFinish) stopPreview();
      });
      p.play();
    } catch {
      if (request !== previewRequest.current) return;
      stopPreview();
      setPreviewError(true);
    }
  };

  // Stop any preview audio as soon as the user leaves the Reader Settings screen.
  useFocusEffect(
    useCallback(() => {
      return stopPreview;
    }, [stopPreview])
  );
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") stopPreview();
    });
    return () => sub.remove();
  }, [stopPreview]);

  return (
    <View style={styles.root}>
      <SubHeader title={{ reciter: "Reciter Selection", speed: "Recitation Speed", autoplay: "Autoplay" }[section]} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {section === "reciter" && <Group title="RECITER">
          {previewError ? <Text style={styles.switchHint}>Preview unavailable. Tap play to try again.</Text> : null}
          {RECITERS.map((r, i) => (
            <View key={r.id} style={[styles.reciterRow, i !== RECITERS.length - 1 && styles.rowBorder]}>
              <Pressable
                style={styles.previewBtn}
                onPress={() => previewReciter(r.id)}
                testID={`reciter-preview-${r.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${previewId === r.id ? "Stop" : "Preview"} ${r.name}`}
              >
                {previewId === r.id && previewLoading
                  ? <ActivityIndicator size="small" color={colors.onBrandPrimary} />
                  : <Icon name={previewId === r.id ? "pause" : "play"} size={18} color={colors.onBrandPrimary} />}
              </Pressable>
              <Pressable style={styles.reciterSelect} onPress={() => updateSettings({ reciter: r.id })} testID={`reader-reciter-${r.id}`}>
                <Text style={[styles.rowLabel, { flex: 1, marginRight: 10 }, s.reciter === r.id && { color: colors.gold, fontWeight: "700" }]}>{r.name}</Text>
                {s.reciter === r.id ? <Icon name="check-circle" size={20} color={colors.gold} /> : <View style={styles.emptyDot} />}
              </Pressable>
            </View>
          ))}
        </Group>}

        {section === "speed" && <Group title="RECITATION SPEED">
          <View style={styles.speedWrap}>
            <RecitationSpeedControl
              value={s.speed}
              onChange={(speed: RecitationSpeed) => updateSettings({ speed })}
              colors={{
                accent: colors.gold,
                text: colors.onSurface,
                muted: colors.muted,
                surface: colors.surfaceSecondary,
                border: colors.border,
                rail: colors.surfaceTertiary,
              }}
              testID="settings-recitation-speed"
            />
          </View>
        </Group>}

        {section === "autoplay" && <Group title="AUTOPLAY">
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Play audio when I change ayah</Text>
              <Text style={styles.switchHint}>Play the new verse automatically after Next.</Text>
            </View>
            <Switch
              value={s.autoplay}
              onValueChange={(v) => updateSettings({ autoplay: v })}
              trackColor={{ true: colors.brandPrimary, false: colors.surfaceTertiary }}
              thumbColor={colors.surface}
              testID="reader-autoplay-switch"
            />
          </View>
        </Group>}
      </ScrollView>
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.groupLabel}>{title}</Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 16, paddingBottom: 28, gap: 18 },
  groupLabel: { color: colors.muted, fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  group: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  speedWrap: { paddingVertical: 14 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 15 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowLabel: { color: colors.onSurface, fontSize: 15 },
  emptyDot: { width: 20, height: 20, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  reciterRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  previewBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  reciterSelect: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switchRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 12 },
  switchLabel: { color: colors.onSurface, fontSize: 15 },
  switchHint: { color: colors.muted, fontSize: 12, marginTop: 2 },
}));
