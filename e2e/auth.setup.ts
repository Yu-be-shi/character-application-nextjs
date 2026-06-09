import { test as setup } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";

// 認証あり E2E 用に、DB セッションを直接 seed して storageState(cookie) を作る。
// auth.ts（本番の認証経路）には一切手を入れない安全な方式。
// 前提: DATABASE_URL が seed 先 MySQL を指し、prisma migrate deploy 済みであること。
const AUTH_STATE = "e2e/.auth/user.json";
const SESSION_TOKEN = "e2e-session-token";
const TEST_EMAIL = "e2e@example.com";

setup("authenticate", async () => {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.upsert({
      where: { email: TEST_EMAIL },
      update: {},
      create: { email: TEST_EMAIL, name: "E2E User" },
    });
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.session.create({
      data: { sessionToken: SESSION_TOKEN, userId: user.id, expires },
    });

    // Auth.js v5（HTTP）の DB セッション cookie 名は authjs.session-token。
    const state = {
      cookies: [
        {
          name: "authjs.session-token",
          value: SESSION_TOKEN,
          domain: "localhost",
          path: "/",
          expires: Math.floor(expires.getTime() / 1000),
          httpOnly: true,
          secure: false,
          sameSite: "Lax" as const,
        },
      ],
      origins: [],
    };
    mkdirSync("e2e/.auth", { recursive: true });
    writeFileSync(AUTH_STATE, JSON.stringify(state));
  } finally {
    await prisma.$disconnect();
  }
});
