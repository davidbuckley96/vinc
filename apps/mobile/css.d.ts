// Ambient declarations for CSS imports used by the Expo template.
// `expo-env.d.ts` is generated (and gitignored), so these live here to keep
// `tsc --noEmit` green in CI without a prior `expo start`.
declare module "*.module.css" {
  const styles: { [className: string]: string };
  export default styles;
}

declare module "*.css";
