import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// tsconfig の "@/*" → リポジトリルート のパスエイリアスを vitest でも解決する。
const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: root }],
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "components/**/*.test.ts"],
  },
});
