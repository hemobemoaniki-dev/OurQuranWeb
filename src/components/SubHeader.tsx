import { Text } from "@/src/components/AppText";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/Icon";
import { makeStyles, useTheme } from "@/src/theme";

// Header for pushed stack screens: back arrow + centered title (SafeArea aware).
export function SubHeader({ title, showBack = true }: { title: string; showBack?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      {showBack ? <Pressable onPress={goBack} hitSlop={10} style={styles.side} testID="subheader-back">
        <Icon name="arrow-left" size={24} color={colors.onSurface} />
      </Pressable> : <View style={styles.side} />}
      <Text style={styles.title}>{title}</Text>
      <View style={styles.side} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.surface,
  },
  side: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { color: colors.onSurface, fontSize: 23, lineHeight: 28, fontWeight: "900", letterSpacing: -0.35 },
}));
