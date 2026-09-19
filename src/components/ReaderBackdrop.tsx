import { memo } from 'react';
import { Image, StyleSheet } from "react-native";
import type { ReaderThemeId } from '@/src/lib/reader-themes';
const images = {
  'moonlit-orchid': require('../../assets/reader/moonlit-orchid.jpg'),
  'solar-ember': require('../../assets/reader/solar-ember.jpg'),
  'sapphire-tide': require('../../assets/reader/sapphire-tide.jpg'),
  'emerald-dusk': require('../../assets/reader/emerald-dusk.jpg'),
  'sakura-mist': require('../../assets/reader/sakura-mist.jpg'),
};
export const ReaderBackdrop = memo(function ReaderBackdrop({ id }: { id: ReaderThemeId }) {
  return <Image accessible={false} source={images[id]} resizeMode="cover" fadeDuration={0} style={StyleSheet.absoluteFill} />;
});
