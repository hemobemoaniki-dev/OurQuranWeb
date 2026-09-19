import { Text } from "@/src/components/AppText";
import { Pressable, ScrollView, View } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { SubHeader } from '@/src/components/SubHeader';
import { ReaderBackdrop } from '@/src/components/ReaderBackdrop';
import { Icon } from '@/src/components/Icon';
import { useAccount } from '@/src/context/AppState';
import { READER_THEMES } from '@/src/lib/reader-themes';
import { useTheme } from '@/src/theme';
export default function ReaderThemeSettings() {
  const { account, updateSettings } = useAccount();
  const { colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.surface }}>
    <SubHeader title="Reader Theme" />
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
      <Text style={{ color: colors.muted, lineHeight: 21 }}>Choose your reading atmosphere. Your app&apos;s light or dark theme stays the same.</Text>
      {READER_THEMES.map(t => {
        const selected = account.settings.readerTheme === t.id;
        return <Pressable key={t.id} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={t.name} testID={`reader-theme-${t.id}`} onPress={() => updateSettings({ readerTheme: t.id })} style={({ pressed }) => ({ height: 150, borderRadius: 24, overflow: 'hidden', borderWidth: selected ? 2 : 1, borderColor: selected ? t.accent : colors.border, opacity: pressed ? 0.8 : 1 })}>
          <ReaderBackdrop id={t.id} />
          <LinearGradient colors={['transparent', t.base]} style={{ flex: 1, padding: 18, justifyContent: 'flex-end', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: '#FFFFFF', fontSize: 21, fontWeight: '600' }}>{t.name}</Text><Icon name={selected ? 'check-circle' : 'circle-outline'} color={t.accent} size={24} /></View>
            <Text style={{ color: t.accent, fontSize: 12 }}>{selected ? 'Selected · Reader only' : 'Tap to select'}</Text>
          </LinearGradient>
        </Pressable>;
      })}
    </ScrollView>
  </View>;
}
