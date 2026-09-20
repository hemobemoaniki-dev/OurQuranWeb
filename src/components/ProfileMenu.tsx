import { usePathname, useRouter } from "expo-router";
import { memo, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/src/components/AppText";
import { Icon } from "@/src/components/Icon";
import { ProfileAvatar } from "@/src/components/ProfileAvatar";
import { useAccount, useAuth } from "@/src/context/AppState";

export const ProfileMenu = memo(function ProfileMenu({
  accent = "#ECCA69",
  compact = false,
}: {
  accent?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { account } = useAccount();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const name = user ? account.username || account.fullName || "Reader" : "Guest";

  if (!user) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign in"
        onPress={() => router.push("/auth")}
        style={({ pressed, hovered }: any) => [
          styles.trigger,
          compact && styles.triggerCompact,
          hovered && styles.triggerHover,
          pressed && styles.pressed,
        ]}
      >
        <ProfileAvatar value={undefined} size={compact ? 34 : 40} />
        {!compact ? <Text style={styles.triggerName}>Guest</Text> : null}
        <Icon name="chevron-down" size={17} color="#D8D1C2" />
      </Pressable>
    );
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? "Close account menu" : "Open account menu"}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed, hovered }: any) => [
          styles.trigger,
          compact && styles.triggerCompact,
          open && styles.triggerOpen,
          hovered && styles.triggerHover,
          pressed && styles.pressed,
        ]}
        testID="profile-menu-trigger"
      >
        <ProfileAvatar value={account.photoURL} size={compact ? 34 : 40} />
        {!compact ? <Text style={styles.triggerName} numberOfLines={1}>{name}</Text> : null}
        <Icon name={open ? "chevron-up" : "chevron-down"} size={17} color="#D8D1C2" />
      </Pressable>

      {open ? (
        <View style={[styles.menu, { borderColor: `${accent}66` }]} testID="profile-dropdown">
          <View style={[styles.menuGlow, { backgroundColor: `${accent}12` }]} pointerEvents="none" />

          <Pressable
            onPress={() => {
              setOpen(false);
              router.push("/settings/profile");
            }}
            style={({ pressed, hovered }: any) => [
              styles.accountHead,
              hovered && styles.rowHover,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.accountName} numberOfLines={1}>{name}</Text>
            <Text style={styles.accountHint}>Manage your account</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            onPress={() => {
              setOpen(false);
              router.push("/preferences");
            }}
            style={({ pressed, hovered }: any) => [
              styles.row,
              hovered && styles.rowHover,
              pressed && styles.pressed,
            ]}
          >
            <Icon name="cog-outline" size={20} color="#F3EDE2" />
            <Text style={styles.rowText}>Settings</Text>
          </Pressable>

          <Pressable
            disabled={signingOut}
            onPress={async () => {
              if (signingOut) return;
              setSigningOut(true);
              try {
                await signOut();
                setOpen(false);
                router.replace("/");
              } finally {
                setSigningOut(false);
              }
            }}
            style={({ pressed, hovered }: any) => [
              styles.row,
              hovered && styles.rowHover,
              pressed && styles.pressed,
              signingOut && styles.disabled,
            ]}
          >
            <Icon name="logout" size={20} color="#F3EDE2" />
            <Text style={styles.rowText}>{signingOut ? "Signing out…" : "Sign out"}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    zIndex: 1000,
    alignItems: "flex-end",
  },
  trigger: {
    maxWidth: 210,
    minHeight: 54,
    paddingHorizontal: 9,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    cursor: "pointer",
    borderWidth: 1,
    borderColor: "transparent",
  },
  triggerCompact: {
    minHeight: 48,
    paddingHorizontal: 7,
  },
  triggerOpen: {
    backgroundColor: "rgba(236,202,105,0.10)",
    borderColor: "rgba(236,202,105,0.28)",
  },
  triggerHover: {
    backgroundColor: "rgba(236,202,105,0.08)",
    borderColor: "rgba(236,202,105,0.22)",
  },
  triggerName: {
    maxWidth: 125,
    flexShrink: 1,
    color: "#FFFDF7",
    fontSize: 15.5,
    lineHeight: 20,
    fontWeight: "800",
  },
  menu: {
    position: "absolute",
    right: 0,
    top: 58,
    width: 252,
    padding: 8,
    borderRadius: 17,
    borderWidth: 1,
    backgroundColor: "rgba(14,13,11,0.985)",
    shadowColor: "#000000",
    shadowOpacity: 0.46,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    overflow: "hidden",
    zIndex: 1100,
  },
  menuGlow: {
    position: "absolute",
    top: -45,
    right: -35,
    width: 150,
    height: 130,
    borderRadius: 100,
  },
  accountHead: {
    minHeight: 66,
    justifyContent: "center",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
    cursor: "pointer",
  },
  accountName: {
    color: "#FFFDF7",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
  },
  accountHint: {
    color: "#C9BDAA",
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "600",
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 5,
    marginHorizontal: 6,
    backgroundColor: "rgba(236,202,105,0.16)",
  },
  row: {
    minHeight: 46,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 13,
    cursor: "pointer",
  },
  rowHover: {
    backgroundColor: "rgba(236,202,105,0.085)",
  },
  rowText: {
    color: "#FFFDF7",
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.55,
  },
});
