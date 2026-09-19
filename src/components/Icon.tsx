import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons/static";

import { useTheme } from "@/src/theme";

type IconName = React.ComponentProps<typeof MaterialDesignIcons>["name"];

const TAB_ICON_NAMES = [
  "home-variant-outline",
  "book-open-page-variant-outline",
  "hands-pray",
  "star-crescent",
  "tune-variant",
] as const satisfies readonly IconName[];

let iconFontPromise: Promise<void> | null = null;

export function preloadIconFont() {
  iconFontPromise ??= Promise.all(
    TAB_ICON_NAMES.map((name) =>
      (MaterialDesignIcons as any).getImageSource(name, { size: 30, color: "#FFFFFF" }),
    ),
  ).then(() => undefined).catch(() => undefined);
  return iconFontPromise;
}

export function getTabIconSource(name: IconName, size: number, color: string) {
  try {
    return (MaterialDesignIcons as any).getImageSourceSync(name, { size, color });
  } catch {
    return null;
  }
}

export function Icon({
  name,
  size = 22,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const { colors } = useTheme();
  return <MaterialDesignIcons name={name} size={size} color={color ?? colors.onSurface} />;
}

export type { IconName };
