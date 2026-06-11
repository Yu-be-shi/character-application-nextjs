import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// 全レスポンスに付与するセキュリティヘッダ。
// CSP は OAuth(Google) のリダイレクトや next/image を阻害しないよう最小限から開始する。
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HSTS（HTTPS 提供時に有効。HTTP のみのうちはブラウザ側で無視される）
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js のインラインスタイル/ハイドレーション用。strict 化は段階的に。
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://*.googleusercontent.com",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com",
    ].join("; "),
  },
];

// Server Actions の CSRF 対策: 許可するオリジンを NEXTAUTH_URL から導出する。
// Next.js は同一オリジン以外からの Server Action 呼び出しをデフォルトで拒否するが、
// allowedOrigins を明示することで reverse proxy 経由やカスタムドメインにも対応できる。
// https://nextjs.org/docs/app/api-reference/next-config-js/serverActions
const serverActionAllowedOrigins: string[] = (() => {
  const raw = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  try {
    return [new URL(raw).host]; // "localhost:3000" / "app.example.com" 形式に変換
  } catch {
    return ["localhost:3000"];
  }
})();

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      allowedOrigins: serverActionAllowedOrigins,
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
