import React from "react";

import { useTheme } from "@/src/theme";

export type IconName = string;

type Props = {
  name: IconName;
  size?: number;
  color?: string;
};

type SvgNode =
  | ["path", Record<string, any>]
  | ["circle", Record<string, any>]
  | ["rect", Record<string, any>]
  | ["line", Record<string, any>]
  | ["polyline", Record<string, any>];

const aliases: Record<string, string> = {
  "home-variant-outline": "home",
  "book-open-page-variant-outline": "book",
  "book-open-page-variant": "book",
  "hands-pray": "pray",
  "star-crescent": "crescent",
  "tune-variant": "settings",
  "crown": "crown",
  "check": "check",
  "check-circle": "checkCircle",
  "progress-check": "checkCircle",
  "minus": "minus",
  "arrow-right": "arrowRight",
  "arrow-left": "arrowLeft",
  "chevron-right": "chevronRight",
  "chevron-left": "chevronLeft",
  "chevron-down": "chevronDown",
  "pencil-outline": "pencil",
  "heart": "heartFill",
  "heart-outline": "heart",
  "clock-outline": "clock",
  "calendar-check-outline": "calendar",
  "calendar-check": "calendar",
  "calendar-outline": "calendar",
  "calendar-star": "calendar",
  "target": "target",
  "trophy-outline": "trophy",
  "account": "account",
  "account-outline": "account",
  "account-remove-outline": "accountRemove",
  "cloud-check": "cloudCheck",
  "cloud-sync": "cloudSync",
  "cloud-sync-outline": "cloudSync",
  "cloud-off-outline": "cloudOff",
  "cloud-alert": "cloudAlert",
  "lock-outline": "lock",
  "chart-line": "chart",
  "chart-box-outline": "chartBox",
  "chart-bar": "chartBox",
  "palette-outline": "palette",
  "microphone-outline": "microphone",
  "speedometer": "speed",
  "play-circle-outline": "playCircle",
  "play": "play",
  "pause": "pause",
  "pause-circle": "pauseCircle",
  "stop": "stop",
  "close": "close",
  "bookmark": "bookmarkFill",
  "bookmark-outline": "bookmark",
  "bookmark-multiple-outline": "bookmarks",
  "arrow-top-right": "arrowTopRight",
  "account-circle-outline": "account",
  "bell-outline": "bell",
  "web": "globe",
  "hand-heart-outline": "handHeart",
  "information-outline": "info",
  "logout": "logout",
  "email-outline": "mail",
  "google": "google",
  "delete-sweep-outline": "trash",
  "shield-check": "shieldCheck",
  "restore": "restore",
  "white-balance-sunny": "sun",
  "weather-night": "moon",
  "cellphone": "phone",
  "counter": "counter",
  "circle-outline": "circleOutline",
  "star-four-points": "sparkle",
  "volume-high": "volume",
  "menu": "menu",
  "mosque": "mosque",
  "fire": "fire",
  "content-copy": "copy",
  "share-variant-outline": "share",
  "share-variant": "share",
  "alert-circle-outline": "alert",
  "view-grid-outline": "grid",
  "image-multiple-outline": "grid",
  "bed-outline": "bed",
  "shield-star-outline": "shieldCheck",
  "hand-back-right-outline": "hand",
  "compass-outline": "compass",
  "heart-pulse": "heartPulse",
  "account-group": "accountGroup",
  "magnify": "search",
  "magnify-close": "searchClose",
  "plus": "plus",
  "star-four-points-outline": "sparkle",
  "format-size": "formatSize",
  "account-voice": "microphone",
  "login": "login",
};

const nodes: Record<string, SvgNode[]> = {
  home: [["path",{d:"M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5H15v-6H9v6H3.5a.5.5 0 0 1-.5-.5Z"}]],
  book: [["path",{d:"M4 5.5c2.7-.7 5.1-.2 8 1.4v12c-2.9-1.6-5.3-2.1-8-1.4Z"}],["path",{d:"M20 5.5c-2.7-.7-5.1-.2-8 1.4v12c2.9-1.6 5.3-2.1 8-1.4Z"}]],
  pray: [["path",{d:"M8.5 13.5 5.8 10.8a1.7 1.7 0 0 0-2.4 2.4L8 17.8V21"}],["path",{d:"m15.5 13.5 2.7-2.7a1.7 1.7 0 0 1 2.4 2.4L16 17.8V21"}],["path",{d:"M9.2 12.8 7.4 8.6a1.6 1.6 0 0 1 2.9-1.3L12 11l1.7-3.7a1.6 1.6 0 0 1 2.9 1.3l-1.8 4.2"}]],
  crescent: [["path",{d:"M15.8 3.8a8.8 8.8 0 1 0 4.4 14.8A7.2 7.2 0 0 1 15.8 3.8Z"}],["path",{d:"m18.3 5.4.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5Z"}]],
  settings: [["path",{d:"M4 7h10"}],["circle",{cx:17,cy:7,r:2}],["path",{d:"M20 7h0M4 17h3"}],["circle",{cx:10,cy:17,r:2}],["path",{d:"M13 17h7M4 12h5"}],["circle",{cx:12,cy:12,r:2}],["path",{d:"M15 12h5"}]],
  crown: [["path",{d:"m3 8 4 4 5-7 5 7 4-4-2 10H5Z"}]],
  check: [["polyline",{points:"5 12.5 10 17 19 7"}]],
  checkCircle: [["circle",{cx:12,cy:12,r:9}],["polyline",{points:"7.5 12.5 10.5 15.5 16.5 9"}]],
  minus: [["line",{x1:5,y1:12,x2:19,y2:12}]],
  arrowRight: [["line",{x1:5,y1:12,x2:19,y2:12}],["polyline",{points:"13 6 19 12 13 18"}]],
  arrowLeft: [["line",{x1:19,y1:12,x2:5,y2:12}],["polyline",{points:"11 6 5 12 11 18"}]],
  chevronRight: [["polyline",{points:"9 6 15 12 9 18"}]],
  chevronLeft: [["polyline",{points:"15 6 9 12 15 18"}]],
  chevronDown: [["polyline",{points:"6 9 12 15 18 9"}]],
  pencil: [["path",{d:"m4 20 4.2-1 10.4-10.4-3.2-3.2L5 15.8Z"}],["path",{d:"m14.6 6.2 3.2 3.2"}]],
  heart: [["path",{d:"M12 20s-7-4.3-9-8.4C1.4 8.2 3.5 5 7 5c2 0 3.5 1 5 2.7C13.5 6 15 5 17 5c3.5 0 5.6 3.2 4 6.6C19 15.7 12 20 12 20Z"}]],
  heartFill: [["path",{d:"M12 20s-7-4.3-9-8.4C1.4 8.2 3.5 5 7 5c2 0 3.5 1 5 2.7C13.5 6 15 5 17 5c3.5 0 5.6 3.2 4 6.6C19 15.7 12 20 12 20Z",fill:"currentColor"}]],
  clock: [["circle",{cx:12,cy:12,r:9}],["path",{d:"M12 7v5l3.5 2"}]],
  calendar: [["rect",{x:4,y:5,width:16,height:15,rx:2}],["line",{x1:8,y1:3,x2:8,y2:7}],["line",{x1:16,y1:3,x2:16,y2:7}],["line",{x1:4,y1:9,x2:20,y2:9}],["polyline",{points:"8 14 10.5 16.5 16 12"}]],
  target: [["circle",{cx:12,cy:12,r:9}],["circle",{cx:12,cy:12,r:5}],["circle",{cx:12,cy:12,r:1.5,fill:"currentColor"}]],
  trophy: [["path",{d:"M8 4h8v5a4 4 0 0 1-8 0Z"}],["path",{d:"M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v4M8 21h8M10 17h4"}]],
  account: [["circle",{cx:12,cy:8,r:4}],["path",{d:"M4.5 21a7.5 7.5 0 0 1 15 0"}]],
  accountRemove: [["circle",{cx:9,cy:8,r:3}],["path",{d:"M3 20a6 6 0 0 1 12 0M16 12h6"}]],
  cloudCheck: [["path",{d:"M6 18h11a4 4 0 0 0 .7-7.9A6 6 0 0 0 6.2 9 4.5 4.5 0 0 0 6 18Z"}],["polyline",{points:"9 14 11 16 15 12"}]],
  cloudSync: [["path",{d:"M6 18h11a4 4 0 0 0 .7-7.9A6 6 0 0 0 6.2 9 4.5 4.5 0 0 0 6 18Z"}],["path",{d:"M9 13a3.5 3.5 0 0 1 5-1l1 1M15 15a3.5 3.5 0 0 1-5 1l-1-1"}]],
  cloudOff: [["path",{d:"M5 5 19 19M7.5 8.2A4.5 4.5 0 0 0 6 17h8.8M10 6.4A6 6 0 0 1 17.7 11 4 4 0 0 1 19 17"}]],
  cloudAlert: [["path",{d:"M6 18h11a4 4 0 0 0 .7-7.9A6 6 0 0 0 6.2 9 4.5 4.5 0 0 0 6 18Z"}],["line",{x1:12,y1:11,x2:12,y2:14}],["circle",{cx:12,cy:16.5,r:.6,fill:"currentColor"}]],
  lock: [["rect",{x:5,y:10,width:14,height:11,rx:2}],["path",{d:"M8 10V7a4 4 0 0 1 8 0v3"}]],
  chart: [["polyline",{points:"4 17 9 12 13 15 20 7"}],["polyline",{points:"16 7 20 7 20 11"}]],
  chartBox: [["rect",{x:4,y:4,width:16,height:16,rx:3}],["path",{d:"M7.5 16V12M12 16V8M16.5 16v-5"}]],
  palette: [["path",{d:"M12 3a9 9 0 1 0 0 18h1.2a2 2 0 0 0 1.4-3.4l-.4-.4a1.4 1.4 0 0 1 1-2.4H18A3 3 0 0 0 21 12 9 9 0 0 0 12 3Z"}],["circle",{cx:7.5,cy:11,r:1}],["circle",{cx:10,cy:7.5,r:1}],["circle",{cx:14,cy:7.5,r:1}]],
  microphone: [["rect",{x:9,y:3,width:6,height:11,rx:3}],["path",{d:"M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"}]],
  speed: [["path",{d:"M5 17a8 8 0 1 1 14 0"}],["line",{x1:12,y1:13,x2:16,y2:9}],["circle",{cx:12,cy:13,r:1.2,fill:"currentColor"}]],
  playCircle: [["circle",{cx:12,cy:12,r:9}],["path",{d:"m10 8 6 4-6 4Z",fill:"currentColor"}]],
  play: [["path",{d:"m8 5 11 7-11 7Z",fill:"currentColor"}]],
  pause: [["rect",{x:7,y:5,width:3.6,height:14,rx:1,fill:"currentColor",stroke:"none"}],["rect",{x:13.4,y:5,width:3.6,height:14,rx:1,fill:"currentColor",stroke:"none"}]],
  pauseCircle: [["circle",{cx:12,cy:12,r:9}],["line",{x1:10,y1:9,x2:10,y2:15}],["line",{x1:14,y1:9,x2:14,y2:15}]],
  stop: [["rect",{x:7,y:7,width:10,height:10,rx:1,fill:"currentColor"}]],
  close: [["line",{x1:6,y1:6,x2:18,y2:18}],["line",{x1:18,y1:6,x2:6,y2:18}]],
  bookmark: [["path",{d:"M7 4h10v16l-5-3-5 3Z"}]],
  bookmarkFill: [["path",{d:"M7 4h10v16l-5-3-5 3Z",fill:"currentColor"}]],
  bookmarks: [["path",{d:"M8 5h9v15l-4.5-2.7L8 20Z"}],["path",{d:"M5 4h9v2H7v12H5Z"}]],
  arrowTopRight: [["line",{x1:7,y1:17,x2:17,y2:7}],["polyline",{points:"10 7 17 7 17 14"}]],
  bell: [["path",{d:"M6 17h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v5ZM10 20h4"}]],
  globe: [["circle",{cx:12,cy:12,r:9}],["path",{d:"M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"}]],
  handHeart: [["path",{d:"M3 14h4l3 3h4l5-4a1.6 1.6 0 0 0-2-2l-3 2h-3"}],["path",{d:"M9 8c0-2.8 3.5-3.6 5-1.2C15.5 4.4 19 5.2 19 8c0 2.1-5 5-5 5s-5-2.9-5-5Z"}]],
  info: [["circle",{cx:12,cy:12,r:9}],["line",{x1:12,y1:10,x2:12,y2:16}],["circle",{cx:12,cy:7,r:.7,fill:"currentColor"}]],
  logout: [["path",{d:"M10 5H5v14h5M14 8l4 4-4 4M8 12h10"}]],
  mail: [["rect",{x:3,y:5,width:18,height:14,rx:2}],["polyline",{points:"4 7 12 13 20 7"}]],
  google: [["path",{d:"M20 12h-8v3h4.6A5 5 0 1 1 15 7.2"}]],
  trash: [["path",{d:"M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"}]],
  shieldCheck: [["path",{d:"M12 3 19 6v5c0 5-3 8-7 10-4-2-7-5-7-10V6Z"}],["polyline",{points:"8.5 12.5 11 15 15.5 10.5"}]],
  restore: [["path",{d:"M5 9V5H1M4 6a8 8 0 1 1-1 8"}]],
  sun: [["circle",{cx:12,cy:12,r:4}],["path",{d:"M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"}]],
  moon: [["path",{d:"M18 16.5A7.5 7.5 0 0 1 8 6a8 8 0 1 0 10 10.5Z"}]],
  phone: [["rect",{x:7,y:2.5,width:10,height:19,rx:2}],["line",{x1:10,y1:5,x2:14,y2:5}],["circle",{cx:12,cy:18.5,r:.7,fill:"currentColor"}]],
  circleOutline: [["circle",{cx:12,cy:12,r:8}]],
  sparkle: [["path",{d:"M12 3c.8 4.2 2.8 6.2 7 7-4.2.8-6.2 2.8-7 7-.8-4.2-2.8-6.2-7-7 4.2-.8 6.2-2.8 7-7Z"}]],
  counter: [["rect",{x:4,y:5,width:16,height:14,rx:3}],["line",{x1:8,y1:9,x2:16,y2:9}],["line",{x1:8,y1:13,x2:10,y2:13}],["line",{x1:14,y1:13,x2:16,y2:13}],["line",{x1:8,y1:17,x2:10,y2:17}],["line",{x1:14,y1:17,x2:16,y2:17}]],
  volume: [["path",{d:"M4 10h4l5-4v12l-5-4H4Z"}],["path",{d:"M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"}]],
  menu: [["line",{x1:4,y1:7,x2:20,y2:7}],["line",{x1:4,y1:12,x2:20,y2:12}],["line",{x1:4,y1:17,x2:20,y2:17}]],
  mosque: [["path",{d:"M5 21V11h14v10M8 11V8a4 4 0 0 1 8 0v3M3 21h18M12 3v2"}]],
  fire: [["path",{d:"M13 3c1 4-2 5-1 8 1-2 3-2 4-4 3 4 4 7 2 11a7 7 0 0 1-12-1c-1-3 0-6 3-9 0 3 2 4 3 5"}]],
  copy: [["rect",{x:8,y:8,width:11,height:11,rx:2}],["path",{d:"M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"}]],
  share: [["circle",{cx:18,cy:5,r:2}],["circle",{cx:6,cy:12,r:2}],["circle",{cx:18,cy:19,r:2}],["line",{x1:7.8,y1:11,x2:16.2,y2:6}],["line",{x1:7.8,y1:13,x2:16.2,y2:18}]],
  alert: [["circle",{cx:12,cy:12,r:9}],["line",{x1:12,y1:7,x2:12,y2:13}],["circle",{cx:12,cy:16.5,r:.7,fill:"currentColor"}]],
  grid: [["rect",{x:4,y:4,width:6,height:6,rx:1}],["rect",{x:14,y:4,width:6,height:6,rx:1}],["rect",{x:4,y:14,width:6,height:6,rx:1}],["rect",{x:14,y:14,width:6,height:6,rx:1}]],
  bed: [["path",{d:"M4 18V8M4 14h16v4M7 14v-3h4a3 3 0 0 1 3 3M20 18v2M4 18v2"}]],
  hand: [["path",{d:"M6 12V8a1.5 1.5 0 0 1 3 0v3-5a1.5 1.5 0 0 1 3 0v5-4a1.5 1.5 0 0 1 3 0v4-2a1.5 1.5 0 0 1 3 0v5c0 4-2.5 7-6 7h-1c-2 0-3.4-1-4.6-2.8L3.5 14a1.6 1.6 0 0 1 2.5-2Z"}]],
  compass: [["circle",{cx:12,cy:12,r:9}],["path",{d:"m15.5 8.5-2 5-5 2 2-5Z"}]],
  heartPulse: [["path",{d:"M3 12h4l2-4 3 8 2-4h7"}],["path",{d:"M5.2 8C5.5 5.8 7.2 4.5 9 4.5c1.3 0 2.3.6 3 1.7 1-1.1 2-1.7 3.3-1.7 2.2 0 3.8 1.8 3.6 4.2M18 15c-2 2.5-6 5-6 5s-3.2-2-5.3-4"}]],
  accountGroup: [["circle",{cx:9,cy:8,r:3}],["circle",{cx:17,cy:9,r:2.3}],["path",{d:"M3 20a6 6 0 0 1 12 0M14 15a5 5 0 0 1 7 4.5"}]],
  search: [["circle",{cx:10.5,cy:10.5,r:6.5}],["line",{x1:15.2,y1:15.2,x2:21,y2:21}]],
  searchClose: [["circle",{cx:10.5,cy:10.5,r:6.5}],["line",{x1:15.2,y1:15.2,x2:21,y2:21}],["line",{x1:8,y1:8,x2:13,y2:13}],["line",{x1:13,y1:8,x2:8,y2:13}]],
  plus: [["line",{x1:5,y1:12,x2:19,y2:12}],["line",{x1:12,y1:5,x2:12,y2:19}]],
  formatSize: [["path",{d:"M4 6h10M9 6v13M6 19h6M14 11h7M17.5 11v8M15 19h5"}]],
  login: [["path",{d:"M14 5h5v14h-5M10 8l4 4-4 4M3 12h11"}]],
};

function fallback(): SvgNode[] {
  // Unknown glyphs should never masquerade as an "add" action. A quiet
  // neutral ring is safer while regression checks catch the missing mapping.
  return [["circle",{cx:12,cy:12,r:7}],["circle",{cx:12,cy:12,r:1.2,fill:"currentColor"}]];
}

export function Icon({ name, size = 22, color }: Props) {
  const { colors } = useTheme();
  const tone = color ?? colors.onSurface;
  const key = aliases[name] ?? name;
  const shape = nodes[key] ?? fallback();

  return React.createElement(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: tone,
      strokeWidth: 1.9,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
      focusable: false,
      style: { display: "block", flexShrink: 0 },
    },
    ...shape.map(([tag, props], index) =>
      React.createElement(tag, { key: index, ...props }),
    ),
  );
}

export function preloadIconFont() {
  return Promise.resolve();
}

export function getTabIconSource() {
  return null;
}
