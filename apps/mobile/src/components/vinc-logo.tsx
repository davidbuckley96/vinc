import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * Vinc logo (D-042 — round 16b, option A5 "a pessoa no centro"): the V
 * closing at a single vertex with the lilac dot at the opening — a
 * person with open arms; the bond with a person at its center.
 * Master SVGs live in docs/design/logo/.
 */
export function VincLogo({
  size = 56,
  variant = 'primary',
}: {
  size?: number;
  /** primary = roxo box / light = white box (for dark backgrounds). */
  variant?: 'primary' | 'light';
}) {
  const box = variant === 'primary' ? '#6D28D9' : '#FFFFFF';
  const stroke = variant === 'primary' ? '#FFFFFF' : '#6D28D9';

  return (
    <Svg width={size} height={size} viewBox="0 0 72 72">
      <Rect width={72} height={72} rx={18} fill={box} />
      <Path
        d="M 21 22 L 36 52"
        stroke={stroke}
        strokeWidth={7}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M 51 22 L 36 52"
        stroke={stroke}
        strokeWidth={7}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={36} cy={25} r={7} fill="#A78BFA" />
    </Svg>
  );
}
