import { Source_Serif_4, Zen_Old_Mincho } from "next/font/google";

export const zenOldMincho = Zen_Old_Mincho({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-cosme-body",
  display: "swap",
});

export const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-cosme-label",
  display: "swap",
});

export const cosmeFontClassName = `${zenOldMincho.variable} ${sourceSerif.variable}`;
