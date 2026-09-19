import { Text } from "@/src/components/AppText";
// App level error boundary, mounted once in app/_layout.tsx. A render crash
// shows a reload screen instead of a blank app; the error is also logged so
// it shows up in the Metro output. Do not mount additional boundaries.

import { reloadAppAsync } from "expo";
import { useRouter } from "expo-router";
import { Component, type ErrorInfo, type PropsWithChildren, useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";

import { makeStyles } from "@/src/theme";

type ErrorBoundaryState = { error: Error | null };
type ErrorBoundaryProps = PropsWithChildren<{ resetKey?: string }>;

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary] render crash:", error, info.componentStack ?? "");
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Recover after navigation without keying/remounting the entire provider
    // tree on every normal route change.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} resetError={this.resetError} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  const styles = useStyles();
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);

  const handleReload = async () => {
    try {
      await reloadAppAsync();
    } catch {
      // Reload is unavailable in some environments; retry the render instead.
      resetError();
    }
  };

  return (
    <View style={styles.container} testID="error-fallback">
      <View style={styles.content}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>Please reload the app to continue.</Text>
        {__DEV__ ? <Text style={styles.devMessage}>{error.message}</Text> : null}
        <View style={styles.actions}>
          <Pressable
            onPress={() => {
              resetError();
              router.replace("/");
            }}
            testID="error-fallback-home"
            accessibilityRole="button"
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.secondaryButtonText}>Return to dashboard</Text>
          </Pressable>
          <Pressable
            onPress={handleReload}
            testID="error-fallback-reload"
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>Reload app</Text>
          </Pressable>
        </View>
        {__DEV__ ? (
          <Pressable onPress={() => setShowDetails((v) => !v)} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.detailsToggle}>{showDetails ? "Hide details" : "Show details"}</Text>
          </Pressable>
        ) : null}
      </View>
      {__DEV__ && showDetails ? (
        <ScrollView style={styles.details} contentContainerStyle={styles.detailsContent}>
          <Text selectable style={styles.detailsText}>
            {error.stack ?? error.message}
          </Text>
        </ScrollView>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: "center",
    padding: 24,
  },
  content: {
    alignItems: "center",
    gap: 12,
  },
  title: {
    color: colors.onSurface,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    color: colors.muted,
    fontSize: 15,
    textAlign: "center",
  },
  devMessage: {
    color: colors.error,
    fontSize: 13,
    textAlign: "center",
  },
  actions: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  button: {
    backgroundColor: colors.brandPrimary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    minWidth: 160,
  },
  secondaryButton: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    minWidth: 180,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.goldSoft,
  },
  secondaryButtonText: {
    color: colors.onSurface,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: colors.onBrandPrimary,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  detailsToggle: {
    color: colors.muted,
    fontSize: 13,
    textDecorationLine: "underline",
    paddingVertical: 8,
  },
  details: {
    marginTop: 16,
    maxHeight: 260,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  detailsContent: {
    padding: 12,
  },
  detailsText: {
    color: colors.onSurfaceSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
  },
}));
