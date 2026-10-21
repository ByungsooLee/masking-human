import { cinemaFontClassName } from "./fonts";

export function CinemaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="cinema" className={`${cinemaFontClassName} theme-ground theme-body min-h-screen`}>
      <div className="flex h-full min-h-0 flex-1 flex-col bg-black">{children}</div>
    </div>
  );
}
