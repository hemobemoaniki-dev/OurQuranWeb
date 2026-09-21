import { Text, TextInput } from "@/src/components/AppText";
import { Icon } from "@/src/components/Icon";
import { useAuth } from "@/src/context/AppState";
import { auth } from "@/src/lib/firebase";
import { makeStyles, useTheme } from "@/src/theme";
import { serifFont } from "@/src/typography";
import { useRouter } from "expo-router";
import Head from "expo-router/head";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { sendPasswordResetEmail } from "firebase/auth";
import { useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  View,
  useWindowDimensions,
  type TextInputProps,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRIVACY_URL = "https://ourquran.web.app/privacy";
const DELETE_ACCOUNT_URL = "https://ourquran.web.app/delete-account";

type AuthMode = "login" | "register" | "reset";
type BusyAction = "email" | "google" | null;
type IconName = ComponentProps<typeof Icon>["name"];

const benefits: { icon: IconName; title: string; detail: string }[] = [
  {
    icon: "book-open-page-variant-outline",
    title: "Resume from the exact ayah",
    detail: "Your reading position and bookmarks stay ready on every device.",
  },
  {
    icon: "fire",
    title: "Keep your streak and Hasanaat",
    detail: "Daily progress, reading time, and rewards move with your account.",
  },
  {
    icon: "tune-variant",
    title: "Carry your recitation setup",
    detail: "Your goal, reciter, speed, theme, and preferences remain in sync.",
  },
  {
    icon: "shield-check",
    title: "Stay in control of your data",
    detail: "Sign out, reset local data, or delete your account whenever you choose.",
  },
];

export default function AuthScreen() {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { signIn, signInWithGoogle, signUp } = useAuth();

  const [stage, setStage] = useState<"options" | "email">("options");
  const [mode, setMode] = useState<AuthMode>("login");
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);

  const viewportWidth = Platform.OS === "web" && typeof window !== "undefined" ? window.innerWidth : width;
  const isWide = viewportWidth >= 1080;
  const showGoogle = Platform.OS === "web";
  const background = scheme === "dark"
    ? (["#020202", "#080704", "#120D03"] as const)
    : (["#FFFDF8", "#F8F2E4", "#EFE1BE"] as const);

  const clearMessages = () => {
    setError(null);
    setNotice(null);
  };

  const openEmail = () => {
    clearMessages();
    setMode("login");
    setStage("email");
  };

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)" as any);
  };

  const finishAuth = () => router.replace("/(tabs)" as any);

  const submit = async () => {
    if (busy) return;
    clearMessages();

    if (mode === "reset") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError("Enter your account email address.");
        return;
      }
      setBusy("email");
      try {
        await sendPasswordResetEmail(auth, email.trim());
        setNotice("If an account exists for this email, a secure reset link is on its way. Check your inbox and spam folder.");
      } catch (e: any) {
        if (e?.code === "auth/user-not-found") {
          setNotice("If an account exists for this email, a secure reset link is on its way. Check your inbox and spam folder.");
        } else {
          setError(
            e?.code === "auth/too-many-requests"
              ? "Too many requests. Wait a moment before trying again."
              : "We could not send the reset email. Check your connection and try again.",
          );
        }
      } finally {
        setBusy(null);
      }
      return;
    }

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    if (mode === "register" && !username.trim()) {
      setError("Choose a username for your profile.");
      return;
    }

    setBusy("email");
    try {
      if (mode === "login") await signIn(email, password);
      else await signUp(email, password, username, username);
      finishAuth();
    } catch (e: any) {
      const code = e?.code ?? "";
      if (e?.message === "username-taken") setError("That username is already taken.");
      else if (e?.message === "invalid-username") setError("Use 3–24 letters, numbers, or underscores for your username.");
      else if (code.includes("email-already-in-use")) setError("An account with this email already exists.");
      else if (code.includes("invalid-credential") || code.includes("wrong-password")) setError("Incorrect email or password.");
      else if (code.includes("invalid-email")) setError("Enter a valid email address.");
      else if (code.includes("weak-password")) setError("Use a password with at least 6 characters.");
      else if (code.includes("user-not-found")) setError("No account was found with this email.");
      else if (code.includes("network-request-failed")) setError("You appear to be offline. Reconnect and try again.");
      else setError("Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const submitGoogle = async () => {
    if (busy) return;
    clearMessages();
    setBusy("google");
    try {
      await signInWithGoogle();
      finishAuth();
    } catch (e: any) {
      const code = e?.code ?? "";
      if (code.includes("popup-closed-by-user") || code.includes("cancelled-popup-request")) return;
      if (code.includes("popup-blocked")) setError("Your browser blocked the Google sign-in window. Allow pop-ups and try again.");
      else if (code.includes("unauthorized-domain")) setError("Google sign-in is not authorized on this web address yet. Use email for now.");
      else if (code.includes("operation-not-allowed")) setError("Google sign-in still needs to be enabled in Firebase. Use email for now.");
      else if (code.includes("account-exists-with-different-credential")) setError("This email already uses password sign-in. Sign in with email first.");
      else if (code.includes("network-request-failed")) setError("You appear to be offline. Reconnect and try again.");
      else setError("Google sign-in could not finish. Please try again or continue with email.");
    } finally {
      setBusy(null);
    }
  };

  const switchMode = (next: AuthMode) => {
    clearMessages();
    setMode(next);
  };

  return (
    <>
      <Head>
        <title>Sign in — OurQuran</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <LinearGradient colors={background} style={styles.root}>
        <View pointerEvents="none" style={[styles.ambientGlow, styles.ambientGlowTop]} />
        <View pointerEvents="none" style={[styles.ambientGlow, styles.ambientGlowBottom]} />

        <KeyboardAwareScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          bottomOffset={24}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              minHeight: Math.max(height, 680),
              paddingTop: Math.max(insets.top + 16, 24),
              paddingBottom: Math.max(insets.bottom + 20, 28),
            },
          ]}
        >
          <View style={styles.page}>
            <View style={styles.topBar}>
              <AuthBrand />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close sign in"
                hitSlop={10}
                onPress={close}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
                testID="auth-close"
              >
                <Icon name="close" size={21} color={colors.onSurface} />
              </Pressable>
            </View>

            <View style={[styles.layout, isWide && styles.layoutWide]}>
              {(isWide || stage === "options") && (
                <Animated.View
                  entering={FadeInDown.duration(220)}
                  exiting={FadeOut.duration(120)}
                  layout={LinearTransition.duration(180)}
                  style={[styles.storyColumn, isWide && styles.storyColumnWide]}
                >
                  <View style={styles.eyebrowRow}>
                    <View style={styles.eyebrowLine} />
                    <Text style={styles.eyebrow}>ONE ACCOUNT · EVERY AYAH</Text>
                  </View>
                  <Text style={[styles.heroTitle, isWide && styles.heroTitleWide]}>
                    Keep your Qur’an journey with you.
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    Move between phone and web without losing the place, rhythm, or progress you worked for.
                  </Text>

                  <View style={styles.benefitPanel}>
                    {benefits.map((benefit, index) => (
                      <Benefit key={benefit.title} {...benefit} last={index === benefits.length - 1} />
                    ))}
                  </View>
                </Animated.View>
              )}

              <Animated.View
                key={stage}
                entering={stage === "email" ? FadeInRight.duration(200) : FadeIn.duration(180)}
                exiting={FadeOut.duration(110)}
                layout={LinearTransition.duration(180)}
                style={[styles.accessColumn, isWide && styles.accessColumnWide]}
              >
                {stage === "options" ? (
                  <View style={styles.accessCard}>
                    <View style={styles.cardAccent} />
                    <View style={styles.securePill}>
                      <Icon name="cloud-check" size={15} color={colors.gold} />
                      <Text style={styles.securePillText}>SECURE CLOUD SYNC</Text>
                    </View>
                    <Text style={styles.cardTitle}>Continue your journey</Text>
                    <Text style={styles.cardSubtitle}>
                      Sign in once to protect your progress, or keep reading without an account.
                    </Text>

                    <View style={styles.actionStack}>
                      {showGoogle && (
                        <Pressable
                          accessibilityRole="button"
                          disabled={!!busy}
                          onPress={submitGoogle}
                          style={({ pressed }) => [styles.googleButton, pressed && styles.buttonPressed, !!busy && styles.disabled]}
                          testID="auth-google-button"
                        >
                          {busy === "google" ? (
                            <ActivityIndicator color="#1A1814" />
                          ) : (
                            <>
                              <Image source="/google-g.svg" style={styles.googleMark} contentFit="contain" accessibilityLabel="Google" />
                              <Text style={styles.googleButtonText}>Continue with Google</Text>
                            </>
                          )}
                        </Pressable>
                      )}

                      {showGoogle && (
                        <View style={styles.dividerRow}>
                          <View style={styles.divider} />
                          <Text style={styles.dividerText}>OR</Text>
                          <View style={styles.divider} />
                        </View>
                      )}

                      <Pressable
                        accessibilityRole="button"
                        disabled={!!busy}
                        onPress={openEmail}
                        style={({ pressed }) => [styles.emailButton, pressed && styles.buttonPressed, !!busy && styles.disabled]}
                        testID="auth-email-option"
                      >
                        <Icon name="email-outline" size={21} color={colors.onBrandPrimary} />
                        <Text style={styles.emailButtonText}>Continue with email</Text>
                        <Icon name="arrow-right" size={19} color={colors.onBrandPrimary} />
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        disabled={!!busy}
                        onPress={finishAuth}
                        style={({ pressed }) => [styles.guestButton, pressed && styles.pressed]}
                        testID="auth-continue-guest"
                      >
                        <Text style={styles.guestText}>Continue without an account</Text>
                      </Pressable>
                    </View>

                    {error && (
                      <Animated.View entering={FadeIn.duration(160)} style={styles.errorBox}>
                        <Icon name="alert-circle-outline" size={18} color={colors.error} />
                        <Text style={styles.errorText} accessibilityLiveRegion="polite" testID="auth-error">{error}</Text>
                      </Animated.View>
                    )}

                    <View style={styles.trustNote}>
                      <Icon name="lock-outline" size={15} color={colors.muted} />
                      <Text style={styles.trustText}>Your reading data is never public.</Text>
                    </View>
                    <LegalLinks />
                  </View>
                ) : (
                  <EmailCard
                    busy={busy}
                    email={email}
                    error={error}
                    mode={mode}
                    notice={notice}
                    password={password}
                    username={username}
                    onBack={() => {
                      if (mode === "reset") switchMode("login");
                      else {
                        clearMessages();
                        setStage("options");
                      }
                    }}
                    onEmailChange={setEmail}
                    onModeChange={switchMode}
                    onPasswordChange={setPassword}
                    onSubmit={submit}
                    onUsernameChange={setUsername}
                  />
                )}
              </Animated.View>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </LinearGradient>
    </>
  );
}

function AuthBrand() {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.brandRow}>
      <View style={styles.brandMark}>
        <View style={styles.brandMarkInner}>
          <Icon name="mosque" size={23} color={colors.gold} />
        </View>
        <View style={styles.brandSpark} />
      </View>
      <View>
        <Text style={styles.brandName}>OurQuran</Text>
        <Text style={styles.brandTag}>READ AND ASCEND</Text>
      </View>
    </View>
  );
}

function Benefit({ detail, icon, last, title }: { detail: string; icon: IconName; last: boolean; title: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.benefit, !last && styles.benefitBorder]}>
      <View style={styles.benefitIcon}>
        <Icon name={icon} size={21} color={colors.gold} />
      </View>
      <View style={styles.benefitCopy}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitDetail}>{detail}</Text>
      </View>
      <Icon name="check" size={17} color={colors.success} />
    </View>
  );
}

function EmailCard({
  busy,
  email,
  error,
  mode,
  notice,
  password,
  username,
  onBack,
  onEmailChange,
  onModeChange,
  onPasswordChange,
  onSubmit,
  onUsernameChange,
}: {
  busy: BusyAction;
  email: string;
  error: string | null;
  mode: AuthMode;
  notice: string | null;
  password: string;
  username: string;
  onBack: () => void;
  onEmailChange: (value: string) => void;
  onModeChange: (mode: AuthMode) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onUsernameChange: (value: string) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const title = mode === "reset" ? "Reset your password" : mode === "login" ? "Welcome back" : "Create your account";
  const subtitle = mode === "reset"
    ? "We’ll send a secure reset link to your inbox."
    : mode === "login"
      ? "Your saved Qur’an journey is waiting."
      : "Save today’s reading and carry it everywhere.";

  return (
    <View style={styles.accessCard}>
      <View style={styles.cardAccent} />
      <Pressable
        accessibilityRole="button"
        disabled={!!busy}
        onPress={onBack}
        style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}
        testID="auth-back-to-options"
      >
        <Icon name="arrow-left" size={18} color={colors.gold} />
        <Text style={styles.backText}>{mode === "reset" ? "Back to sign in" : "All sign-in options"}</Text>
      </Pressable>

      <Text style={styles.formTitle}>{title}</Text>
      <Text style={styles.formSubtitle}>{subtitle}</Text>

      {mode !== "reset" && (
        <View style={styles.modeTabs}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === "login" }}
            disabled={!!busy}
            onPress={() => onModeChange("login")}
            style={[styles.modeTab, mode === "login" && styles.modeTabActive]}
            testID="auth-login-tab"
          >
            <Text style={[styles.modeTabText, mode === "login" && styles.modeTabTextActive]}>Sign in</Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === "register" }}
            disabled={!!busy}
            onPress={() => onModeChange("register")}
            style={[styles.modeTab, mode === "register" && styles.modeTabActive]}
            testID="auth-switch-mode"
          >
            <Text style={[styles.modeTabText, mode === "register" && styles.modeTabTextActive]}>Create account</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.formFields}>
        {mode === "register" && (
          <AuthField
            autoCapitalize="none"
            autoComplete="username"
            icon="account-outline"
            label="Username"
            onChangeText={onUsernameChange}
            placeholder="your_username"
            testID="auth-username-input"
            value={username}
          />
        )}
        <AuthField
          autoCapitalize="none"
          autoComplete="email"
          icon="email-outline"
          keyboardType="email-address"
          label="Email"
          onChangeText={onEmailChange}
          placeholder="you@email.com"
          testID="auth-email-input"
          value={email}
        />
        {mode !== "reset" && (
          <AuthField
            autoCapitalize="none"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            icon="lock-outline"
            label="Password"
            onChangeText={onPasswordChange}
            placeholder="At least 6 characters"
            secret
            testID="auth-password-input"
            value={password}
          />
        )}
      </View>

      {notice && (
        <Animated.View entering={FadeIn.duration(160)} style={styles.noticeBox}>
          <Icon name="check-circle" size={18} color={colors.success} />
          <Text style={styles.noticeText} accessibilityLiveRegion="polite">{notice}</Text>
        </Animated.View>
      )}
      {error && (
        <Animated.View entering={FadeIn.duration(160)} style={styles.errorBox}>
          <Icon name="alert-circle-outline" size={18} color={colors.error} />
          <Text style={styles.errorText} accessibilityLiveRegion="polite" testID="auth-error">{error}</Text>
        </Animated.View>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={!!busy}
        onPress={onSubmit}
        style={({ pressed }) => [styles.submitButton, pressed && styles.buttonPressed, !!busy && styles.disabled]}
        testID="auth-submit-button"
      >
        {busy === "email" ? (
          <ActivityIndicator color={colors.onBrandPrimary} />
        ) : (
          <>
            <Text style={styles.submitText}>
              {mode === "reset" ? "Send reset link" : mode === "login" ? "Sign in" : "Create account"}
            </Text>
            <Icon name="arrow-right" size={19} color={colors.onBrandPrimary} />
          </>
        )}
      </Pressable>

      {mode === "login" && (
        <Pressable
          accessibilityRole="button"
          disabled={!!busy}
          onPress={() => onModeChange("reset")}
          style={({ pressed }) => [styles.forgotButton, pressed && styles.pressed]}
          testID="auth-forgot-password"
        >
          <Text style={styles.forgotText}>Forgot your password?</Text>
        </Pressable>
      )}

      <LegalLinks />
    </View>
  );
}

function AuthField({ icon, label, secret = false, ...inputProps }: TextInputProps & {
  icon: IconName;
  label: string;
  secret?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secret);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputShell, focused && styles.inputShellFocused]}>
        <Icon name={icon} size={19} color={focused ? colors.gold : colors.muted} />
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          onBlur={(event) => {
            setFocused(false);
            inputProps.onBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            inputProps.onFocus?.(event);
          }}
          placeholderTextColor={colors.muted}
          secureTextEntry={secret && hidden}
          style={styles.input}
        />
        {secret && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            hitSlop={8}
            onPress={() => setHidden((value) => !value)}
            style={({ pressed }) => [styles.passwordToggle, pressed && styles.pressed]}
          >
            <Text style={styles.passwordToggleText}>{hidden ? "Show" : "Hide"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function LegalLinks() {
  const styles = useStyles();
  return (
    <View style={styles.legalRow}>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(PRIVACY_URL)} hitSlop={8}>
        <Text style={styles.legalText}>Privacy policy</Text>
      </Pressable>
      <View style={styles.legalDot} />
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(DELETE_ACCOUNT_URL)} hitSlop={8}>
        <Text style={styles.legalText}>Account deletion</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20 },
  ambientGlow: { position: "absolute", borderRadius: 999, backgroundColor: colors.goldSoft, opacity: 0.7 },
  ambientGlowTop: { width: 420, height: 420, top: -220, right: -145 },
  ambientGlowBottom: { width: 310, height: 310, bottom: -185, left: -120, opacity: 0.45 },
  page: { width: "100%", maxWidth: 1240, alignSelf: "center", flex: 1 },
  topBar: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: {
    width: 46, height: 46, borderRadius: 16, borderCurve: "continuous", alignItems: "center", justifyContent: "center",
    backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.goldBorder, position: "relative",
  },
  brandMarkInner: {
    width: 34, height: 34, borderRadius: 12, borderCurve: "continuous", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.goldBorder,
  },
  brandSpark: { position: "absolute", right: -2, top: -2, width: 8, height: 8, backgroundColor: colors.gold, transform: [{ rotate: "45deg" }] },
  brandName: { color: colors.onSurface, fontFamily: serifFont, fontSize: 23, lineHeight: 26, fontWeight: "700", letterSpacing: -0.45 },
  brandTag: { color: colors.gold, fontSize: 7, lineHeight: 10, fontWeight: "900", letterSpacing: 1.5, marginTop: 1 },
  closeButton: {
    width: 44, height: 44, borderRadius: 15, borderCurve: "continuous", alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
  },
  layout: { flex: 1, gap: 26, justifyContent: "center" },
  layoutWide: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 44, paddingTop: 12, paddingBottom: 42 },
  storyColumn: { width: "100%", maxWidth: 620, alignSelf: "center", gap: 16 },
  storyColumnWide: { flex: 1, maxWidth: 650, alignSelf: "auto" },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  eyebrowLine: { width: 28, height: 2, borderRadius: 2, backgroundColor: colors.gold },
  eyebrow: { color: colors.gold, fontSize: 11, lineHeight: 16, fontWeight: "900", letterSpacing: 1.4 },
  heroTitle: { color: colors.onSurface, fontFamily: serifFont, fontSize: 36, lineHeight: 43, fontWeight: "700", letterSpacing: -1.15, maxWidth: 560 },
  heroTitleWide: { fontSize: 52, lineHeight: 57, letterSpacing: -1.9 },
  heroSubtitle: { color: colors.muted, fontSize: 16, lineHeight: 25, maxWidth: 545 },
  benefitPanel: {
    marginTop: 8, backgroundColor: colors.surfaceSecondary, borderRadius: 24, borderCurve: "continuous", borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 18, boxShadow: "0 18px 55px rgba(0,0,0,0.13)",
  },
  benefit: { minHeight: 86, flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16 },
  benefitBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  benefitIcon: {
    width: 42, height: 42, borderRadius: 14, borderCurve: "continuous", alignItems: "center", justifyContent: "center",
    backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.goldBorder,
  },
  benefitCopy: { flex: 1, gap: 4 },
  benefitTitle: { color: colors.onSurface, fontSize: 15, lineHeight: 20, fontWeight: "800" },
  benefitDetail: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  accessColumn: { width: "100%", maxWidth: 460, alignSelf: "center" },
  accessColumnWide: { width: 420, flexShrink: 0, alignSelf: "auto" },
  accessCard: {
    width: "100%", overflow: "hidden", backgroundColor: colors.surfaceSecondary, borderRadius: 28, borderCurve: "continuous",
    borderWidth: 1, borderColor: colors.borderStrong, padding: 24, gap: 15, boxShadow: "0 24px 70px rgba(0,0,0,0.20)",
  },
  cardAccent: { position: "absolute", top: 0, left: 28, right: 28, height: 2, borderRadius: 2, backgroundColor: colors.gold },
  securePill: {
    alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 10, minHeight: 30,
    borderRadius: 999, backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.goldBorder,
  },
  securePillText: { color: colors.gold, fontSize: 9, lineHeight: 12, fontWeight: "900", letterSpacing: 1.15 },
  cardTitle: { color: colors.onSurface, fontFamily: serifFont, fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.75, marginTop: 2 },
  cardSubtitle: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  actionStack: { gap: 12, marginTop: 6 },
  googleButton: {
    minHeight: 56, borderRadius: 18, borderCurve: "continuous", backgroundColor: "#FFFFFF", borderWidth: 1,
    borderColor: "rgba(168,126,20,0.28)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 11,
    boxShadow: "0 8px 24px rgba(95,68,10,0.08)",
  },
  googleMark: { width: 21, height: 21 },
  googleButtonText: { color: "#1A1814", fontSize: 15, lineHeight: 20, fontWeight: "800" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 1 },
  divider: { flex: 1, height: 1, backgroundColor: colors.divider },
  dividerText: { color: colors.muted, fontSize: 9, fontWeight: "900", letterSpacing: 1.3 },
  emailButton: {
    minHeight: 56, borderRadius: 18, borderCurve: "continuous", backgroundColor: colors.brandPrimary, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 18,
    boxShadow: "0 10px 28px rgba(212,175,55,0.20)",
  },
  emailButtonText: { flex: 1, color: colors.onBrandPrimary, fontSize: 15, lineHeight: 20, fontWeight: "900", textAlign: "center" },
  guestButton: { minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  guestText: { color: colors.onSurface, fontSize: 14, lineHeight: 20, fontWeight: "700", textAlign: "center" },
  trustNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingTop: 2 },
  trustText: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  legalRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 9, paddingTop: 2 },
  legalText: { color: colors.muted, fontSize: 12, lineHeight: 18, textDecorationLine: "underline" },
  legalDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.muted, opacity: 0.7 },
  backRow: { alignSelf: "flex-start", minHeight: 36, flexDirection: "row", alignItems: "center", gap: 7, paddingRight: 10 },
  backText: { color: colors.gold, fontSize: 13, lineHeight: 18, fontWeight: "800" },
  formTitle: { color: colors.onSurface, fontFamily: serifFont, fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.75 },
  formSubtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: -7 },
  modeTabs: {
    minHeight: 48, flexDirection: "row", padding: 4, borderRadius: 16, borderCurve: "continuous",
    backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border,
  },
  modeTab: { flex: 1, minHeight: 38, borderRadius: 12, borderCurve: "continuous", alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  modeTabActive: { backgroundColor: colors.onSurface },
  modeTabText: { color: colors.muted, fontSize: 13, lineHeight: 18, fontWeight: "800" },
  modeTabTextActive: { color: colors.surface },
  formFields: { gap: 13, marginTop: 1 },
  field: { gap: 7 },
  fieldLabel: { color: colors.onSurface, fontSize: 12, lineHeight: 17, fontWeight: "800" },
  inputShell: {
    minHeight: 54, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 15, backgroundColor: colors.surfaceTertiary,
    borderRadius: 16, borderCurve: "continuous", borderWidth: 1, borderColor: colors.border,
  },
  inputShellFocused: { borderColor: colors.goldBorder, backgroundColor: colors.goldSoft },
  input: { flex: 1, minWidth: 0, paddingVertical: 13, color: colors.onSurface, fontSize: 16, lineHeight: 21 },
  passwordToggle: { minHeight: 40, justifyContent: "center", paddingLeft: 6 },
  passwordToggleText: { color: colors.gold, fontSize: 12, lineHeight: 17, fontWeight: "800" },
  noticeBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 12, borderRadius: 14, borderCurve: "continuous",
    backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.success,
  },
  noticeText: { flex: 1, color: colors.onSurface, fontSize: 12, lineHeight: 18 },
  errorBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 12, borderRadius: 14, borderCurve: "continuous",
    backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.error,
  },
  errorText: { flex: 1, color: colors.error, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  submitButton: {
    minHeight: 56, borderRadius: 18, borderCurve: "continuous", backgroundColor: colors.brandPrimary, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 18, marginTop: 2,
    boxShadow: "0 10px 28px rgba(212,175,55,0.20)",
  },
  submitText: { color: colors.onBrandPrimary, fontSize: 15, lineHeight: 20, fontWeight: "900" },
  forgotButton: { minHeight: 42, alignItems: "center", justifyContent: "center" },
  forgotText: { color: colors.gold, fontSize: 13, lineHeight: 18, fontWeight: "800" },
  pressed: { opacity: 0.66 },
  buttonPressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.55 },
}));
