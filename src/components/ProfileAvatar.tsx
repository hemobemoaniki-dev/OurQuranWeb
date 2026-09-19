import { Image } from "react-native";
import { memo } from "react";
import { getAvatar } from "@/src/lib/avatars";
import { AVATAR_PHOTOS } from "@/src/data/avatar-photos";

export const ProfileAvatar = memo(function ProfileAvatar({ value, size = 56 }: { value?: string; size?: number }) {
  const avatar = getAvatar(value);
  return <Image source={AVATAR_PHOTOS[avatar.id]} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" accessibilityLabel={avatar.name} fadeDuration={0} />;
});
