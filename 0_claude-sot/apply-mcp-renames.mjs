#!/usr/bin/env node
// Apply mcp-policy.json `renames.map` to an mcp.json-shaped file ({mcpServers}).
// For every new name whose `from` server is present, the new entry is a copy of
// the old one with the `rewrite` pairs applied to every string (url, args) and
// the optional `mesh` url replacing the --mesh arg (stdio bridge) or the url
// (http). The old entry stays (alias for one release). Idempotent.
// usage: apply-mcp-renames.mjs <mcp-policy.json> <file.json> [<out.json>]
import { readFileSync, writeFileSync } from "node:fs";

export function applyRenames(doc, map) {
  const servers = doc.mcpServers || {};
  for (const [name, spec] of Object.entries(map || {})) {
    if (name.startsWith("_")) continue;
    const old = servers[spec.from];
    if (!old) continue;
    const rw = (v) => {
      if (typeof v === "string") return (spec.rewrite || []).reduce((s, [a, b]) => s.split(a).join(b), v);
      if (Array.isArray(v)) return v.map(rw);
      if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, rw(x)]));
      return v;
    };
    const entry = rw(old);
    if (spec.mesh) {
      if (Array.isArray(entry.args) && entry.args.includes("--mesh")) entry.args[entry.args.indexOf("--mesh") + 1] = spec.mesh;
      else if (entry.url) entry.url = spec.mesh;
    }
    servers[name] = entry;
  }
  doc.mcpServers = Object.fromEntries(Object.entries(servers).sort(([a], [b]) => (a < b ? -1 : 1)));
  return doc;
}

if (process.argv[1] && process.argv[1].endsWith("apply-mcp-renames.mjs")) {
  const [pol, file, out] = process.argv.slice(2);
  const map = JSON.parse(readFileSync(pol, "utf8")).renames?.map || {};
  const doc = applyRenames(JSON.parse(readFileSync(file, "utf8")), map);
  writeFileSync(out || file, JSON.stringify(doc, null, 2) + "\n");
}
