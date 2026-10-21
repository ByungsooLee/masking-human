import { Zen_Maru_Gothic } from "next/font/google";
import { editorialFontClassName } from "@/themes/magazine/fonts";

export const zenMaruGothic = Zen_Maru_Gothic({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-bloom",
  display: "swap",
});

/** Interview shell font, plus the editorial fonts so exported magazine pages render inside the flow. */
export const bloomFontClassName = `${zenMaruGothic.variable} ${editorialFontClassName}`;
