import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "fs";
import path from "path";

const githubPages404Plugin = () => ({
  name: "github-pages-404",
  closeBundle() {
    const indexPath = path.resolve(__dirname, "../docs/index.html");
    const notFoundPath = path.resolve(__dirname, "../docs/404.html");
    try {
      const indexContent = readFileSync(indexPath, "utf-8");
      writeFileSync(notFoundPath, indexContent, "utf-8");
      console.log("Generated docs/404.html");
    } catch (error) {
      console.error("Error generating docs/404.html:", error);
    }
  },
});

export default defineConfig({
  plugins: [react(), githubPages404Plugin()],
  base: "./",
  build: {
    outDir: "../docs",
    emptyOutDir: true,
  },
});
