import { cosmeFontClassName } from "./fonts";

export function CosmeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="cosme" className={`${cosmeFontClassName} theme-ground theme-body flex h-full min-h-0 flex-1 flex-col`}>
      {children}
    </div>
  );
}
