// eslint.config.cjs
module.exports = [
  {
    files: ["**/*.js"],
    ignores: ["node_modules/**", "dist/**", "build/**"],

    // Language options (replace "env" from .eslintrc)
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",

      // Add global variables that 'env' would have provided.
      // Mark them readonly unless they should be writable.
      globals: {
        // Node globals
        global: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",

        // ES2021 globals (a few commonly used ones)
        Atomics: "readonly",
        SharedArrayBuffer: "readonly",
        BigInt: "readonly",

        // Jest globals
        describe: "readonly",
        test: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        jest: "readonly"
      }
    },

    linterOptions: {
      reportUnusedDisableDirectives: true
    },

    // keep behavior equivalent to your .eslintrc.json
    rules: {
      indent: ["error", 2],
      "linebreak-style": ["error", "unix"],
      quotes: ["error", "single"],
      semi: ["error", "always"],
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      "prefer-const": "error",
      "no-var": "error"
    }
  }
];
