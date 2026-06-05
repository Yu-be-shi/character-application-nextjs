import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "キャラクター管理",
  description: "キャラクターデータ管理ダッシュボード",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
