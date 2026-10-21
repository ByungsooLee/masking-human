import { BIZ_UDPMincho, Libre_Franklin, Shippori_Mincho, Zen_Kaku_Gothic_New } from "next/font/google";

export const libreFranklin = Libre_Franklin({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-stage-sans",
  display: "swap",
});

export const bizUdpMincho = BIZ_UDPMincho({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-stage-serif",
  display: "swap",
});

export const shipporiMincho = Shippori_Mincho({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-mag-display",
  display: "swap",
  preload: false,
});

export const zenKakuGothicNew = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-mag-body",
  display: "swap",
  preload: false,
});

export const magazineFontClassName = `${libreFranklin.variable} ${bizUdpMincho.variable}`;

/** Exported pages: mincho for the guest's words, gothic for everything else. */
export const editorialFontClassName = `${shipporiMincho.variable} ${zenKakuGothicNew.variable}`;
