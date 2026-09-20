import { Platform, Text as NativeText, TextInput as NativeTextInput, StyleSheet, type TextProps, type TextInputProps } from 'react-native';

const WEB_UI_FONT = '"Segoe UI", Inter, "Helvetica Neue", Arial, sans-serif';

// Keep Arabic shaping and explicit display faces; use bundled fonts for Latin UI.
function face(style: TextProps['style'], children?: React.ReactNode) {
  const flat = StyleSheet.flatten(style) ?? {};
  const arabic = typeof children === 'string' && /[\u0600-\u06ff]/.test(children);
  if (flat.fontFamily || arabic) return {};
  const weight = flat.fontWeight === 'bold' ? 700 : Number(flat.fontWeight ?? 500);
  if (Platform.OS === 'web') return { fontFamily: WEB_UI_FONT, fontWeight: weight as any };
  const fontFamily = weight >= 800 ? 'LatoBlack' : weight >= 600 ? 'LatoBold' : 'LatoRegular';
  return { fontFamily, fontWeight: 'normal' as const };
}
export function Text({ style, children, ...props }: TextProps) {
  return <NativeText {...props} style={[style, face(style, children)]}>{children}</NativeText>;
}
export function TextInput({ style, ...props }: TextInputProps) {
  return <NativeTextInput {...props} style={[style, face(style)]} />;
}
