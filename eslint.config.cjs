// eslint.config.cjs
export default [
  {
    files: ["**/*.js"],
    ignores: ["node_modules/**", "dist/**"],

    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
    },

    linterOptions: {
      reportUnusedDisableDirectives: true,
    },

    env: {
      node: true,
      jest: true,
    },

    rules: {
      indent: ["error", 2],
      "linebreak-style": ["error", "unix"],
      quotes: ["error", "single"],
      semi: ["error", "always"],
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      "prefer-const": "error",
      "no-var": "error",
    },
  },
];
