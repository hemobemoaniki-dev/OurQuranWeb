import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/src/context/AppState";
import { makeStyles, useTheme } from "@/src/theme";

// App launch gate: wait for Firebase auth to initialize, then enter the app.
// Guests are allowed in (they can browse and read; syncing prompts to sign in).
export default function Index() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.center} testID="launch-loader">
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return <Redirect href="/(tabs)" />;
}

const useStyles = makeStyles((colors) => ({
  center: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
}));
