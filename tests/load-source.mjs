import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import ts from "typescript";
const cache = new Map();
export function loadSource(path) {
  const full = resolve(path.endsWith(".ts") ? path : `${path}.ts`);
  if (cache.has(full)) return cache.get(full).exports;
  const module = { exports: {} };
  cache.set(full, module);
  const source = ts.transpileModule(readFileSync(full, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  new Function("require", "module", "exports", source)(
    (name) => loadSource(resolve(dirname(full), name)),
    module,
    module.exports,
  );
  return module.exports;
}
