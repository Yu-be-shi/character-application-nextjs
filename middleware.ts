import { NextRequest, NextResponse } from "next/server";

// (dashboard) 配下への楽観的な認証ガード（defense-in-depth の1層目）。
//
// セッションは DB ストラテジ（Prisma adapter）のため、Edge で動くこの層では
// DB 照会による「本物の」検証はできない。ここではセッション cookie の有無だけを見て
// 未ログインを早期に /login へ逃がす。真の認証・認可（auth() と UserCharacter の
// 所有権検証）は従来どおり各ページ / Server Action 内で必ず行う。
// 参考: https://authjs.dev/getting-started/session-management/protecting

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function middleware(req: NextRequest) {
  const hasSessionCookie = SESSION_COOKIES.some((name) => req.cookies.has(name));
  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  // (dashboard) ルートグループは URL に現れないため、保護対象のパスを列挙する。
  // 新しい保護ページを追加したらここにも足すこと（ページ側の auth() は引き続き必須）。
  matcher: ["/characters/:path*", "/gallery/:path*"],
};
