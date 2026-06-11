import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// tsconfig の "@/*" → リポジトリルート のパスエイリアスを vitest でも解決する。
const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@\//, replacement: root },
      // server-only は React Server 以外の環境では import 時に throw するため、
      // vitest（node 環境）では空モジュールへ差し替える。
      {
        find: /^server-only$/,
        replacement: fileURLToPath(new URL("./vitest.server-only-stub.ts", import.meta.url)),
      },
    ],
  },
  test: {
    // 既定は node。コンポーネントテストはファイル先頭の `// @vitest-environment jsdom` で切り替える。
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["lib/**/*.test.ts", "components/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**/*.ts", "components/**/*.tsx"],
      exclude: ["**/*.test.*", "lib/**/*.gen.ts"],
    },
  },
});
