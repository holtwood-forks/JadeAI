import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      // New in eslint-config-next 16.4 (React Compiler rules). The existing
      // dialogs/chat panels intentionally reset state from effects, and two
      // components keep a "latest value" ref during render to avoid stale
      // closures. Adopting these rules is a separate refactor with real
      // behavioural risk; keep them off so a dependency bump cannot silently
      // change app behaviour.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
  {
    files: ["src/app/api/resume/[[]id[]]/export/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["src/components/preview/templates/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Test fixtures intentionally poke malformed shapes through public APIs;
  // `any` there documents "arbitrary input", not a missing type.
  {
    files: ["**/*.test.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".worktrees/**",
    // gitignored AI 工具目录（AGENTS.md：AI 工具本地状态不入库）
    ".agents/**",
    ".claude/**",
    ".commandcode/**",
    ".codex/**",
    ".superpowers/**",
    "agent/**",
    "data/**",
  ]),
]);

export default eslintConfig;
