// vitest 用の server-only スタブ。
// 本物の server-only は React Server 環境以外で import すると throw するため、
// テストでは無害な空モジュールに差し替える（vitest.config.ts の alias 参照）。
export {};
