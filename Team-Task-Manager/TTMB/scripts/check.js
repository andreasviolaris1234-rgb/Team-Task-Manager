import { readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { spawnSync } from "node:child_process";

function javascriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? javascriptFiles(path) : extname(path) === ".js" ? [path] : [];
  });
}

const files = [...javascriptFiles("src"), ...javascriptFiles("public")];
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Syntax passed: ${files.length} files`);

const tests = spawnSync(process.execPath, ["--test"], { stdio: "inherit" });
process.exit(tests.status ?? 1);
