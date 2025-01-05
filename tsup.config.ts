import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/**/*.ts"],
  format: ["esm", "cjs"],
  dts: true,
  shims: true,
  skipNodeModulesBundle: true,
  clean: true,
  treeshake: true,
  outDir: "dist",
  minify: true,
});