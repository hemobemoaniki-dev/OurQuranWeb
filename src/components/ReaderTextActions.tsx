import { Text } from "@/src/components/AppText";
import { useEffect, useState } from 'react';
import { Alert, Pressable, Share, View } from "react-native";
import * as Clipboard from 'expo-clipboard';
import { Icon } from '@/src/components/Icon';
import type { ReaderTheme } from '@/src/lib/reader-themes';
export function ReaderTextActions({ text, reference, theme, label }: { text: string; reference: string; theme: ReaderTheme; label: string }) {
  const [copyResult, setCopyResult] = useState<{ text: string } | null>(null);
  const copied = copyResult?.text === text;
  useEffect(() => { if (!copyResult) return; const timer = setTimeout(() => setCopyResult(null), 1800); return () => clearTimeout(timer); }, [copyResult]);
  const copy = async () => { try { await Clipboard.setStringAsync(text); setCopyResult({ text }); } catch { Alert.alert('Could not copy', 'Please try again.'); } };
  const share = async () => { try { await Share.share({ message: `${text}\n\n${reference} · OurQuran` }); } catch { Alert.alert('Could not share', 'Please try again.'); } };
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 8 }}>
    {copied && <Text accessibilityLiveRegion="polite" style={{ color: "#FFFFFF", fontSize: 13, lineHeight: 20, fontWeight: "700", minWidth: 60, flexShrink: 0, textAlign: "center", paddingHorizontal: 4 }}>Copied</Text>}
    {(['copy', 'share'] as const).map(action => <Pressable key={action} accessibilityRole="button" accessibilityLabel={`${action === 'copy' ? 'Copy' : 'Share'} ${label}`} onPress={action === 'copy' ? copy : share} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.glass, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}><Icon name={action === 'copy' ? 'content-copy' : 'share-variant-outline'} color="#FFFFFF" size={20} /></Pressable>)}
  </View>;
}
