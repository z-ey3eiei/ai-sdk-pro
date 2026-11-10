import { cpSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const source = resolve(root, "public");
const destination = resolve(root, "dist");

if (!existsSync(source)) throw new Error("public directory is missing");
rmSync(destination, { force: true, recursive: true });
cpSync(source, destination, { recursive: true });
console.log("Static files copied from public/ to dist/.");
