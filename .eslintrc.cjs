// ESLint (flat config 없이 legacy 포맷 사용 — 툴 호환성 높음).
// 설치 후 실행: npx eslint "src/**/*.{js,jsx,ts,tsx}"
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  plugins: ["react", "react-hooks", "react-refresh"],
  settings: { react: { version: "18.3" } },
  rules: {
    "react/react-in-jsx-scope": "off",       // Vite + React 17+ JSX transform
    "react/prop-types": "off",               // 점진 TS 전환 중
    "react/no-unescaped-entities": "off",
    "react/jsx-key": "warn",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "no-unused-vars": ["warn", {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      destructuredArrayIgnorePattern: "^_",
    }],
    "no-empty": ["warn", { allowEmptyCatch: true }],
    "no-console": "off",
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
  },
  ignorePatterns: ["dist", "node_modules", "public/sw.js", "supabase/functions/**"],
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      parser: "@typescript-eslint/parser",
      parserOptions: { project: "./tsconfig.json" },
    },
  ],
};
