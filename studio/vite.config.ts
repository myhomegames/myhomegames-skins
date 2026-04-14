import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "fs";
import path from "path";

const githubPages404Plugin = () => ({
  name: "github-pages-404",
  closeBundle() {
    const indexPath = path.resolve(__dirname, "../docs/skins/index.html");
    const notFoundPath = path.resolve(__dirname, "../docs/404.html");
    try {
      let indexContent = readFileSync(indexPath, "utf-8");
      const redirectScript = `
  <script>
    (function() {
      var path = window.location.pathname;
      if (!path.startsWith('/skins/')) {
        var redirectPath = '/skins/' + path.replace(/^\\//, '').replace(/^skins\\//, '');
        var query = window.location.search;
        var hash = window.location.hash;
        window.location.replace(redirectPath + query + hash);
      }
    })();
  </script>`;
      indexContent = indexContent.replace("</body>", redirectScript + "\n</body>");
      writeFileSync(notFoundPath, indexContent, "utf-8");
      console.log("✓ Generated docs/404.html for /skins SPA routing");
    } catch (error) {
      console.error("Error generating docs/404.html:", error);
    }
  },
});

export default defineConfig({
  plugins: [react(), githubPages404Plugin()],
  base: "/skins/",
  build: {
    outDir: "../docs/skins",
    emptyOutDir: true,
  },
});
