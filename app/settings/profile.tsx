import { Text, TextInput } from "@/src/components/AppText";
import { Redirect } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Icon } from "@/src/components/Icon";
import { SubHeader } from "@/src/components/SubHeader";
import { useAccount, useAuth } from "@/src/context/AppState";
import { AVATARS, getAvatar } from "@/src/lib/avatars";
import { ProfileAvatar } from "@/src/components/ProfileAvatar";
import { makeStyles, useTheme } from "@/src/theme";

export default function ProfileEditor() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { account, updateProfile } = useAccount();
  const { user } = useAuth();

  const [username, setUsername] = useState(account.username);
  const [photoURL, setPhotoURL] = useState(getAvatar(account.photoURL).id);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "ok"; text: string } | null>(null);
  const dirty = useRef(false);

  // Mirror account values into the form until the user starts editing (account
  // may hydrate from cloud after this screen mounts).
  useEffect(() => {
    if (dirty.current) return;
    setUsername(account.username);
    setPhotoURL(getAvatar(account.photoURL).id);
  }, [account.username, account.photoURL]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setMessage(null);
    const result = await updateProfile({ username, photoURL });
    setSaving(false);
    if (result.ok) {
      dirty.current = false;
      setMessage({ type: "ok", text: "Profile saved on this device. Account sync will save it online when connected." });
    } else setMessage({ type: "error", text: result.error ?? "Could not save." });
  };

  if (!user) return <Redirect href="/auth" />;
  return (
    <View style={styles.root}>
      <SubHeader title="Profile" />
      <KeyboardAwareScrollView contentContainerStyle={styles.content} bottomOffset={24} showsVerticalScrollIndicator={false}>
        <Field label="Username">
          <TextInput value={username} onChangeText={(t) => { dirty.current = true; setUsername(t); }} autoCapitalize="none" style={styles.input} placeholderTextColor={colors.muted} testID="profile-username-input" />
        </Field>

        <View style={styles.avatarWrap}>
          <ProfileAvatar value={photoURL} size={112} />
          <Text style={styles.avatarName}>{getAvatar(photoURL).name}</Text>
        </View>
        <Text style={styles.fieldLabel}>Choose your avatar</Text>
        <View style={styles.avatarGrid}>
          {AVATARS.map((avatar) => {
            const selected = photoURL === avatar.id;
            return (
              <Pressable key={avatar.id} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: saving }} accessibilityLabel={avatar.name} disabled={saving}
                testID={`profile-avatar-${avatar.id.split(":")[1]}`}
                onPress={() => { dirty.current = true; setPhotoURL(avatar.id); setMessage(null); }}
                style={({ pressed }) => [styles.avatarOption, selected && styles.avatarSelected, { opacity: pressed ? 0.7 : 1 }]}>
                <ProfileAvatar value={avatar.id} size={88} />
                <Text style={styles.optionName}>{avatar.name}</Text>
                {selected && <View style={styles.selectedBadge}><Icon name="check" size={12} color={colors.onBrandPrimary} /></View>}
              </Pressable>
            );
          })}
        </View>



        {message && (
          <Text style={[styles.msg, { color: message.type === "error" ? colors.error : colors.success }]} testID="profile-message">
            {message.text}
          </Text>
        )}
        <Pressable style={styles.saveBtn} onPress={save} disabled={saving} testID="profile-save">
          {saving ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.saveText}>Save Profile</Text>}
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
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
  content: { paddingHorizontal: 20, paddingBottom: 28, gap: 16 },
  avatarWrap: { alignItems: "center", marginVertical: 8, gap: 10 },
  avatarName: { color: colors.onSurface, fontSize: 16, fontWeight: "600" },
  avatarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  avatarOption: { width: "48%", flexGrow: 1, flexDirection: "column", alignItems: "center", gap: 8, padding: 14, borderRadius: 18, backgroundColor: colors.surfaceTertiary, borderWidth: 2, borderColor: "transparent" },
  avatarSelected: { borderColor: colors.gold },
  optionName: { textAlign: "center", color: colors.onSurface, fontSize: 12, fontWeight: "600" },
  selectedBadge: { position: "absolute", right: 4, top: 4, backgroundColor: colors.brandPrimary, borderRadius: 9, width: 18, height: 18, alignItems: "center", justifyContent: "center" },
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
  multiline: { minHeight: 90, textAlignVertical: "top" },
  msg: { fontSize: 13 },
  saveBtn: { backgroundColor: colors.brandPrimary, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  saveText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "700" },
}));
