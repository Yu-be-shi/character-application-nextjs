import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import prettier from "eslint-config-prettier";

// ESLint Flat Config（`next lint` は Next.js 16 で廃止予定のため移行）。
// eslint-config-next を FlatCompat で読み込む。実行は `eslint .`。
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "e2e/**",
      "playwright.config.ts",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // フォーマット系ルールは Prettier に委ねる（競合を無効化。必ず最後に置く）。
  prettier,
];

export default eslintConfig;
