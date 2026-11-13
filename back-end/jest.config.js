/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/**/*.test.ts"],
  setupFiles: ["<rootDir>/test/setupEnv.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.jest.json" }],
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/index.ts", "!src/app.ts", "!src/shared/database/**"],
  coverageDirectory: "coverage",
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
};
