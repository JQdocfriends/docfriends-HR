export interface AvatarColor {
  label: string;
  body: string;
  shadow: string;
}

export const VISOR_COLOR = "#A8D5E8";
export const VISOR_SHINE = "#D9EEF5";
export const VISOR_SHADOW = "#6FA8BF";

export const AVATARS: AvatarColor[] = [
  { label: "Red", body: "#C51111", shadow: "#7A0838" },
  { label: "Blue", body: "#132ED1", shadow: "#09158E" },
  { label: "Green", body: "#117F2D", shadow: "#0A4D1C" },
  { label: "Pink", body: "#ED54BA", shadow: "#AC2BAD" },
  { label: "Orange", body: "#EF7D0E", shadow: "#B33E15" },
  { label: "Yellow", body: "#F5F557", shadow: "#C38823" },
  { label: "Black", body: "#3F474E", shadow: "#1E1F26" },
  { label: "White", body: "#D6E0F0", shadow: "#8495B5" },
  { label: "Purple", body: "#6B2FBC", shadow: "#3B177C" },
  { label: "Brown", body: "#71491E", shadow: "#5E2F11" },
  { label: "Cyan", body: "#38FEDC", shadow: "#24A69A" },
  { label: "Lime", body: "#50EF39", shadow: "#15A742" },
];

export function getAvatar(i: number): AvatarColor {
  const len = AVATARS.length;
  return AVATARS[((i % len) + len) % len];
}
