import fs from "node:fs";
import path from "node:path";

const roots = ["src", "prisma"];
const relativeImportPattern = /((?:from\s+|import\s*\(\s*)["'])(\.{1,2}\/[^"']+)(["'])/g;

const hasRuntimeExtension = (specifier) =>
  [".js", ".json", ".node"].includes(path.posix.extname(specifier));

const updateFile = (filePath) => {
  const source = fs.readFileSync(filePath, "utf8");
  const updated = source.replace(
    relativeImportPattern,
    (match, prefix, specifier, suffix) => {
      if (hasRuntimeExtension(specifier)) return match;
      return `${prefix}${specifier}.js${suffix}`;
    },
  );

  if (updated !== source) {
    fs.writeFileSync(filePath, updated);
  }
};

const visit = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      visit(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      updateFile(fullPath);
    }
  }
};

for (const root of roots) {
  if (fs.existsSync(root)) visit(root);
}

if (fs.existsSync("prisma.config.js")) {
  updateFile("prisma.config.js");
}
