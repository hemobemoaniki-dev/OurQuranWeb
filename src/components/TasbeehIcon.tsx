import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// A loop of individually shaded prayer beads with an imam bead and tassel.
export function TasbeehIcon({ color, size = 28 }: { color: string; size?: number }) {
  return <View accessible={false} style={{ width: size, height: size }}>
    {Array.from({ length: 11 }, (_, i) => {
      const angle = (i * 28 + 115) * Math.PI / 180;
      return <LinearGradient key={i} colors={['#FFFFFF', color, color]} locations={[0, 0.4, 1]} style={{ position: 'absolute', width: size * 0.17, height: size * 0.17, borderRadius: size, left: size * (0.40 + Math.cos(angle) * 0.31), top: size * (0.34 + Math.sin(angle) * 0.29) }} />;
    })}
    <View style={{ position: 'absolute', width: size * 0.12, height: size * 0.25, borderRadius: 3, backgroundColor: color, left: size * 0.42, top: size * 0.66, transform: [{ rotate: '-16deg' }] }} />
    <View style={{ position: 'absolute', width: size * 0.23, height: size * 0.06, borderRadius: 2, backgroundColor: color, left: size * 0.43, top: size * 0.91 }} />
  </View>;
}
