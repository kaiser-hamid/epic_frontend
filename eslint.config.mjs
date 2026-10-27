import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import boundaries from "eslint-plugin-boundaries"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "import/resolver": { typescript: { alwaysTryTypes: true } },
      // Patterns match from the project root (partialMatch: false); first match wins.
      "boundaries/elements": [
        { type: "app", pattern: "app", partialMatch: false },
        { type: "shared", pattern: "modules/shared", partialMatch: false },
        {
          type: "module",
          pattern: "modules/*",
          partialMatch: false,
          capture: ["name"],
        },
        { type: "components", pattern: "components", partialMatch: false },
        { type: "hooks", pattern: "hooks", partialMatch: false },
        { type: "lib", pattern: "lib", partialMatch: false },
      ],
    },
    rules: {
      // Mirrors the backend boundary rules: business modules never import each other.
      "boundaries/dependencies": [
        2,
        {
          default: "disallow",
          policies: [
            {
              from: { element: { type: "app" } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: ["shared", "module", "components", "hooks", "lib"],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: "module" } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ["shared", "components", "hooks", "lib"] },
                  },
                },
              },
            },
            {
              from: { element: { type: "shared" } },
              allow: {
                to: {
                  element: { types: { anyOf: ["components", "hooks", "lib"] } },
                },
              },
            },
            {
              from: { element: { type: "components" } },
              allow: {
                to: { element: { types: { anyOf: ["hooks", "lib"] } } },
              },
            },
            {
              from: { element: { type: "hooks" } },
              allow: { to: { element: { type: "lib" } } },
            },
          ],
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
    },
  },
  {
    // Components must go through module query hooks, never the HTTP client.
    files: ["**/components/**/*.tsx", "app/**/*.tsx"],
    // Providers registers the 401 handler on the client; nothing else may.
    ignores: ["components/providers.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "axios", message: "Use the module's queries.ts hooks." },
            {
              name: "@/lib/api-client",
              message: "Use the module's queries.ts hooks.",
            },
          ],
        },
      ],
    },
  },
  {
    // Every form needs Enter-to-next-field navigation (see components/form.tsx).
    files: ["**/*.tsx"],
    ignores: ["components/form.tsx", "components/ui/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='form']",
          message: 'Use <Form> from "@/components/form" instead of <form>.',
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "temp/**",
    "playwright-report/**",
    "test-results/**",
  ]),
])

export default eslintConfig
