import { magazineFontClassName } from "./fonts";

export function MagazineLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-theme="magazine"
      className={`${magazineFontClassName} theme-ground theme-body flex h-full min-h-0 flex-1 flex-col`}
    >
      {children}
    </div>
  );
}
