import { Zen_Kaku_Gothic_New } from "next/font/google";

export const zenKaku = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-cinema-body",
  display: "swap",
});

export const cinemaFontClassName = zenKaku.variable;
