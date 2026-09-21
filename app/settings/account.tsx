import { Text, TextInput } from "@/src/components/AppText";
import { Redirect, useRouter } from "expo-router";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword,
} from "firebase/auth";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Icon } from "@/src/components/Icon";
import { SubHeader } from "@/src/components/SubHeader";
import { useAccount, useAuth } from "@/src/context/AppState";
import { auth } from "@/src/lib/firebase";
import { makeStyles, useTheme } from "@/src/theme";

export default function AccountSettings() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { account, resetLocalData, deleteAccount } = useAccount();
  const { user, signOut } = useAuth();

  const isPasswordAccount = user?.providerData.some((p) => p.providerId === "password") ?? false;
  const isGoogle = user?.providerData.some((p) => p.providerId === "google.com") ?? false;

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "ok"; text: string } | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const changePassword = async () => {
    setMsg(null);
    if (!user?.email || !currentPw || newPw.length < 6) {
      setMsg({ type: "error", text: "Enter your current password and a new one (6+ chars)." });
      return;
    }
    setBusy(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPw);
      setCurrentPw("");
      setNewPw("");
      setMsg({ type: "ok", text: "Password updated." });
    } catch (e: any) {
      const code = e?.code ?? "";
      if (code.includes("wrong-password") || code.includes("invalid-credential"))
        setMsg({ type: "error", text: "Current password is incorrect." });
      else setMsg({ type: "error", text: "Couldn't update password. Try again." });
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    setMsg(null);
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setMsg({ type: "ok", text: "Password reset email sent." });
    } catch {
      setMsg({ type: "error", text: "Couldn't send reset email." });
    }
  };

  const doReset = async () => {
    setResetConfirm(false);
    try { await resetLocalData(); router.replace("/(tabs)" as any); }
    catch { setMsg({ type: "error", text: "Could not reset local data. Please try again." }); }
  };

  const doDeleteAccount = async () => {
    if (deleteBusy) return;
    setDeleteBusy(true);
    setMsg(null);
    const result = await deleteAccount(deletePassword);
    setDeleteBusy(false);
    if (!result.ok) {
      setMsg({ type: "error", text: result.error ?? "Could not delete account." });
      return;
    }
    setDeletePassword("");
    setDeleteConfirm(false);
    router.replace("/(tabs)" as any);
  };

  const doSignOut = async () => {
    try { await signOut(); router.replace("/(tabs)" as any); }
    catch { setMsg({ type: "error", text: "Could not sign out. Please try again." }); }
  };

  if (!user) return <Redirect href="/auth" />;
  return (
    <View style={styles.root}>
      <SubHeader title="Account" />
      <KeyboardAwareScrollView contentContainerStyle={styles.content} bottomOffset={24} showsVerticalScrollIndicator={false}>
        {/* Email */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>EMAIL</Text>
          <View style={styles.emailRow}>
            <Icon name="email-outline" size={20} color={colors.gold} />
            <Text style={styles.emailText}>{account.email || user?.email}</Text>
            {isGoogle && (
              <View style={styles.googleTag}>
                <Icon name="google" size={13} color={colors.onSurface} />
                <Text style={styles.googleText}>Google</Text>
              </View>
            )}
          </View>
        </View>

        {/* Security */}
        {isPasswordAccount ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>SECURITY</Text>
            <TextInput
              value={currentPw}
              onChangeText={setCurrentPw}
              placeholder="Current password"
              secureTextEntry
              placeholderTextColor={colors.muted}
              style={styles.input}
              testID="account-current-password"
            />
            <TextInput
              value={newPw}
              onChangeText={setNewPw}
              placeholder="New password"
              secureTextEntry
              placeholderTextColor={colors.muted}
              style={styles.input}
              testID="account-new-password"
            />
            <Pressable style={styles.primaryBtn} onPress={changePassword} disabled={busy} testID="account-change-password">
              {busy ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.primaryText}>Change Password</Text>}
            </Pressable>
            <Pressable onPress={sendReset} style={styles.linkBtn} testID="account-reset-password">
              <Text style={styles.linkText}>Send password reset email</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>SECURITY</Text>
            <Text style={styles.helperText}>This account signs in with Google. Manage your password in your Google account.</Text>
          </View>
        )}

        {msg && (
          <Text style={[styles.msg, { color: msg.type === "error" ? colors.error : colors.success }]} testID="account-message">
            {msg.text}
          </Text>
        )}

        {/* Danger zone */}
        <Pressable style={styles.dangerRow} onPress={() => setResetConfirm(true)} testID="account-reset-local">
          <Icon name="delete-sweep-outline" size={20} color={colors.error} />
          <Text style={styles.dangerText}>Reset local data</Text>
        </Pressable>

        <Pressable style={styles.deleteAccountRow} onPress={() => { setDeletePassword(""); setDeleteConfirm(true); }} testID="account-delete-account">
          <Icon name="account-remove-outline" size={20} color={colors.error} />
          <View style={{ flex: 1 }}>
            <Text style={styles.deleteAccountTitle}>Delete account & data</Text>
            <Text style={styles.deleteAccountHint}>Permanently removes your OurQuran account, progress, bookmarks, profile and synced settings.</Text>
          </View>
        </Pressable>

        <Pressable style={styles.signOutRow} onPress={doSignOut} testID="account-sign-out">
          <Icon name="logout" size={20} color={colors.gold} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </KeyboardAwareScrollView>

      <Modal visible={resetConfirm} transparent animationType="fade" onRequestClose={() => setResetConfirm(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmSheet}>
            <Text style={styles.confirmTitle}>Reset local data?</Text>
            <Text style={styles.confirmBody}>
              This removes OurQuran data stored on this device. Your cloud account data remains intact. You&apos;ll be signed out afterward.
            </Text>
            <View style={styles.confirmRow}>
              <Pressable style={styles.cancelBtn} onPress={() => setResetConfirm(false)} testID="reset-cancel">
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmBtn} onPress={doReset} testID="reset-confirm">
                <Text style={styles.confirmBtnText}>Reset</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteConfirm} transparent animationType="fade" onRequestClose={() => !deleteBusy && setDeleteConfirm(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmSheet}>
            <Text style={styles.confirmTitle}>Permanently delete account?</Text>
            <Text style={styles.confirmBody}>
              This permanently deletes your OurQuran account and synced data. This cannot be undone.
            </Text>
            {isPasswordAccount ? (
              <TextInput
                value={deletePassword}
                onChangeText={setDeletePassword}
                placeholder="Current password"
                secureTextEntry
                autoCapitalize="none"
                placeholderTextColor={colors.muted}
                style={styles.input}
                editable={!deleteBusy}
                testID="delete-account-password"
              />
            ) : (
              <Text style={styles.helperText}>You may be asked to sign in again before deletion can finish.</Text>
            )}
            <View style={styles.confirmRow}>
              <Pressable
                disabled={deleteBusy}
                style={styles.cancelBtn}
                onPress={() => { setDeletePassword(""); setDeleteConfirm(false); }}
                testID="delete-account-cancel"
              >
                <Text style={styles.cancelText}>Keep account</Text>
              </Pressable>
              <Pressable
                disabled={deleteBusy || (isPasswordAccount && !deletePassword)}
                style={({ pressed }) => [styles.confirmBtn, { opacity: pressed || deleteBusy || (isPasswordAccount && !deletePassword) ? 0.6 : 1 }]}
                onPress={doDeleteAccount}
                testID="delete-account-confirm"
              >
                {deleteBusy ? <ActivityIndicator color={colors.onError} /> : <Text style={styles.confirmBtnText}>Delete forever</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 16, paddingBottom: 28, gap: 16 },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  cardLabel: { color: colors.muted, fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  emailRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  emailText: { color: colors.onSurface, fontSize: 15, flex: 1 },
  googleTag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.surfaceTertiary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  googleText: { color: colors.onSurface, fontSize: 11 },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.onSurface,
    fontSize: 15,
  },
  helperText: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  primaryBtn: { backgroundColor: colors.brandPrimary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  primaryText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: 15 },
  linkBtn: { alignItems: "center", paddingVertical: 4 },
  linkText: { color: colors.gold, fontSize: 14, fontWeight: "600" },
  msg: { fontSize: 13, paddingHorizontal: 4 },
  dangerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.error,
  },
  dangerText: { color: colors.error, fontSize: 15, fontWeight: "600" },
  deleteAccountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.surfaceSecondary,
  },
  deleteAccountTitle: { color: colors.error, fontSize: 15, fontWeight: "700" },
  deleteAccountHint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 2 },
  signOutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.surfaceSecondary,
  },
  signOutText: { color: colors.gold, fontSize: 15, fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 },
  confirmSheet: { backgroundColor: colors.surfaceSecondary, borderRadius: 20, borderWidth: 1, borderColor: colors.goldBorder, padding: 20, gap: 12 },
  confirmTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "700" },
  confirmBody: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  confirmRow: { flexDirection: "row", gap: 12, marginTop: 6 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  cancelText: { color: colors.onSurface, fontWeight: "600" },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.error, alignItems: "center" },
  confirmBtnText: { color: colors.onError, fontWeight: "700" },
}));
