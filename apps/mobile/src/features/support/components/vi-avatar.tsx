import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * The "Vi" mark (D-045): the same A5 logo geometry (docs/design/logo),
 * used as the assistant's avatar in the Central de Ajuda and the chat.
 */
export function ViAvatar({
  size = 30,
  variant = 'primary',
}: {
  size?: number;
  /** primary = roxo box / light = transparent box on a colored surface. */
  variant?: 'primary' | 'light';
}) {
  const box = variant === 'primary' ? '#6D28D9' : 'transparent';
  const stroke = variant === 'primary' ? '#FFFFFF' : '#6D28D9';
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72">
      {variant === 'primary' && <Rect width={72} height={72} rx={18} fill={box} />}
      <Path d="M 21 22 L 36 52" stroke={stroke} strokeWidth={8} strokeLinecap="round" fill="none" />
      <Path d="M 51 22 L 36 52" stroke={stroke} strokeWidth={8} strokeLinecap="round" fill="none" />
      <Circle cx={36} cy={25} r={8} fill="#A78BFA" />
    </Svg>
  );
}
