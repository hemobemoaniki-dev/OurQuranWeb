import { Text, TextInput } from "@/src/components/AppText";
import { useRouter } from "expo-router";
import Head from "expo-router/head";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/src/lib/firebase";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/Icon";
import { useAuth } from "@/src/context/AppState";
import { makeStyles, useTheme } from "@/src/theme";
import { serifFont } from "@/src/typography";

export default function AuthScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setError(null);
    setNotice(null);
    if (mode === "reset") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError("Enter your account email address.");
        return;
      }
      setBusy(true);
      try {
        await sendPasswordResetEmail(auth, email.trim());
        setNotice("If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.");
      } catch (e: any) {
        if (e?.code === "auth/user-not-found") setNotice("If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.");
        else setError(e?.code === "auth/too-many-requests" ? "Too many requests. Please wait before trying again." : "Could not send the reset email. Check your connection and try again.");
      } finally { setBusy(false); }
      return;
    }
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    if (mode === "register" && !username.trim()) {
      setError("Please enter your username.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") await signIn(email, password);
      else await signUp(email, password, username, username);
      router.replace("/(tabs)");
    } catch (e: any) {
      const code = e?.code ?? "";
      if (e?.message === "username-taken") setError("That username is already taken.");
      else if (e?.message === "invalid-username") setError("Use 3–24 letters, numbers, or underscores for your username.");
      else if (code.includes("email-already-in-use")) setError("An account with this email already exists.");
      else if (code.includes("invalid-credential") || code.includes("wrong-password"))
        setError("Incorrect email or password.");
      else if (code.includes("invalid-email")) setError("Please enter a valid email address.");
      else if (code.includes("weak-password")) setError("Password should be at least 6 characters.");
      else if (code.includes("user-not-found")) setError("No account found with this email.");
      else setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head><title>Sign in — OurQuran</title><meta name="robots" content="noindex,nofollow" /></Head>
      <View style={styles.root}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
        bottomOffset={24}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoRow}>
          <Icon name="mosque" size={30} color={colors.gold} />
          <Text style={styles.logo}>OurQuran</Text>
        </View>
        <Text style={styles.title}>{mode === "reset" ? "Reset your password" : mode === "login" ? "Welcome back" : "Create your account"}</Text>
        <Text style={styles.subtitle}>
          {mode === "reset" ? "Enter your email to receive a secure reset link." : mode === "login" ? "Sign in to sync your progress across devices." : "Track your Hasanaat everywhere you read."}
        </Text>

        {mode === "register" && (
          <>
            <Field label="Username">
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="ibrahim"
                autoCapitalize="none"
                placeholderTextColor={colors.muted}
                style={styles.input}
                testID="auth-username-input"
              />
            </Field>
          </>
        )}

        <Field label="Email">
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholderTextColor={colors.muted}
            style={styles.input}
            testID="auth-email-input"
          />
        </Field>
        {mode !== "reset" && <Field label="Password">
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            placeholderTextColor={colors.muted}
            style={styles.input}
            testID="auth-password-input"
          />
        </Field>}

        {notice && <Text style={{ color: colors.onSurface, lineHeight: 22 }} accessibilityLiveRegion="polite">{notice}</Text>}
        {error && (
          <Text style={styles.error} testID="auth-error">
            {error}
          </Text>
        )}

        <Pressable style={styles.submit} onPress={submit} disabled={busy} testID="auth-submit-button">
          {busy ? (
            <ActivityIndicator color={colors.onBrandPrimary} />
          ) : (
            <Text style={styles.submitText}>{mode === "reset" ? "Send reset link" : mode === "login" ? "Sign In" : "Create Account"}</Text>
          )}
        </Pressable>

        {mode === "login" && <Pressable disabled={busy} accessibilityRole="button" style={styles.switch} onPress={() => { setMode("reset"); setError(null); setNotice(null); }} testID="auth-forgot-password">
          <Text style={styles.switchText}>Forgot password?</Text>
        </Pressable>}

        <Pressable
          onPress={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
            setNotice(null);
          }}
          disabled={busy}
          style={styles.switch}
          testID="auth-switch-mode"
        >
          <Text style={styles.switchText}>
            {mode === "reset" ? "Back to sign in" : mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.replace("/(tabs)")} style={styles.guest} testID="auth-continue-guest">
          <Text style={styles.guestText}>Continue as guest</Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 24, gap: 14 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  logo: { color: colors.onSurface, fontSize: 26, fontFamily: serifFont },
  title: { color: colors.onSurface, fontSize: 26, fontFamily: serifFont },
  subtitle: { color: colors.muted, fontSize: 14, marginBottom: 8 },
  field: { gap: 6 },
  fieldLabel: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.onSurface,
    fontSize: 16,
  },
  error: { color: colors.error, fontSize: 13 },
  submit: {
    backgroundColor: colors.brandPrimary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 6,
  },
  submitText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "700" },
  switch: { width: "100%", justifyContent: "center", minHeight: 48, paddingVertical: 10 },
  switchText: { width: "100%", textAlign: "center", color: colors.gold, fontSize: 14, lineHeight: 22, fontWeight: "600" },
  guest: { width: "100%", justifyContent: "center", minHeight: 48, paddingVertical: 10 },
  guestText: { width: "100%", textAlign: "center", color: colors.muted, fontSize: 14, lineHeight: 22 },
}));
