import { Image, View } from "react-native";
import { memo } from "react";
import { getAvatar } from "@/src/lib/avatars";
import { AVATAR_PHOTOS } from "@/src/data/avatar-photos";
import { useTheme } from "@/src/theme";

export const ProfileAvatar = memo(function ProfileAvatar({ value, size = 56 }: { value?: string; size?: number }) {
  const avatar = getAvatar(value);
  const { colors } = useTheme();
  const frame = Math.max(3, Math.round(size * 0.075));
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        padding: frame,
        borderWidth: 1,
        borderColor: colors.goldBorder,
        backgroundColor: colors.goldSoft,
        shadowColor: colors.gold,
        shadowOpacity: 0.18,
        shadowRadius: Math.max(7, Math.round(size * 0.2)),
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <Image
        source={AVATAR_PHOTOS[avatar.id]}
        style={{ width: "100%", height: "100%", borderRadius: size / 2 }}
        resizeMode="cover"
        accessibilityLabel={avatar.name}
        fadeDuration={0}
      />
    </View>
  );
});
