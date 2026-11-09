import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = join(process.cwd(), "dist-pages");
const built = join(out, "index.pages.html");
const index = join(out, "index.html");
if (!existsSync(built)) {
  console.error("pages build did not emit index.pages.html");
  process.exit(1);
}
copyFileSync(built, index);
copyFileSync(index, join(out, "404.html"));
writeFileSync(join(out, ".nojekyll"), "");
console.log("pages site ready in dist-pages");
