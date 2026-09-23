import "dotenv/config";
import { Resolver } from "dns/promises";
import net from "net";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import mongoose from "mongoose";
import { connectDB } from "../db.js";
import Building from "../models/Building.js";
import GraphNode from "../models/GraphNode.js";
import GraphEdge from "../models/GraphEdge.js";
import Faq from "../models/Faq.js";
import Contact from "../models/Contact.js";

const C = { r:"\x1b[0m", b:"\x1b[1m", dim:"\x1b[2m", cy:"\x1b[36m", gr:"\x1b[32m", rd:"\x1b[31m", yl:"\x1b[33m" };
const PASS = `${C.gr}PASS${C.r}`, FAIL = `${C.rd}FAIL${C.r}`;
const line = (s="") => console.log(s);
const rule = (ch="─") => line(`${C.dim}${ch.repeat(66)}${C.r}`);
const head = (n, t) => { line(); line(`${C.cy}${C.b}[${n}] ${t}${C.r}`); rule(); };
const row = (k, v) => line(`  ${k.padEnd(34)} ${v}`);
const results = [];
const check = (name, ok) => { results.push(ok); return ok ? PASS : FAIL; };

const resolver = new Resolver({ timeout: 3000, tries: 2 });
const uri = process.env.MONGODB_URI;
const url = new URL(uri);

line();
line(`${C.b}${C.cy}╔════════════════════════════════════════════════════════════════╗${C.r}`);
line(`${C.b}${C.cy}║   GCTU CAMPUS NAVIGATOR — MONGODB CONNECTION TEST              ║${C.r}`);
line(`${C.b}${C.cy}╚════════════════════════════════════════════════════════════════╝${C.r}`);
line(`  ${C.dim}Date    : ${new Date().toISOString().slice(0,10)}${C.r}`);
line(`  ${C.dim}Cluster : ${url.hostname}${C.r}`);
line(`  ${C.dim}Database: ${url.pathname.slice(1)}${C.r}`);
line(`  ${C.dim}URI     : mongodb+srv://${url.username}:${"*".repeat(8)}@${url.hostname}${C.r}`);

// Boot the API server in the background while diagnostics run.
const serverEntry = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "index.js");
const server = spawn(process.execPath, [serverEntry], { stdio: "ignore" });

head(1, "DNS RESOLUTION (what mongodb+srv requires)");
let srvHosts = [];
try {
  const recs = await resolver.resolveSrv(`_mongodb._tcp.${url.hostname}`);
  srvHosts = recs.map(r => `${r.name}:${r.port}`);
  row("SRV  _mongodb._tcp", `${check("srv", true)}  ${C.dim}${srvHosts.length} shard hosts${C.r}`);
} catch (e) { row("SRV  _mongodb._tcp", `${check("srv", false)}  ${e.code}`); }

let txtOk = true;
try { await resolver.resolveTxt(url.hostname); row("TXT  cluster options", `${PASS}  ${C.dim}resolved${C.r}`); }
catch (e) { txtOk = false; row("TXT  cluster options", `${C.yl}BLOCKED${C.r} ${C.dim}${e.code} — network drops TXT${C.r}`); }

head(2, "NETWORK REACHABILITY");
const tcp = await new Promise(res => {
  const s = net.createConnection({ host: srvHosts[0]?.split(":")[0], port: 27017, timeout: 10000 });
  s.on("connect", () => { s.destroy(); res(true); });
  s.on("timeout", () => { s.destroy(); res(false); });
  s.on("error", () => res(false));
});
row("TCP  shard-00-00:27017", `${check("tcp", tcp)}  ${C.dim}${tcp ? "open" : "unreachable"}${C.r}`);

head(3, "DATABASE CONNECTION" + (txtOk ? "" : `  ${C.dim}(via SRV-bypass fallback)${C.r}`));
const t0 = Date.now();
await connectDB();
row("Handshake", `${check("db", mongoose.connection.readyState === 1)}  ${C.dim}${Date.now()-t0} ms${C.r}`);
row("Replica set", `${C.dim}${mongoose.connection.client.options.replicaSet ?? "n/a"}${C.r}`);
row("TLS", `${C.dim}${mongoose.connection.client.options.tls ? "enabled" : "disabled"}${C.r}`);

head(4, "COLLECTION READS");
for (const [name, model] of [["buildings", Building], ["graph nodes", GraphNode], ["graph edges", GraphEdge], ["faqs", Faq], ["contacts", Contact]]) {
  const n = await model.countDocuments();
  row(`db.${name}`, `${check(name, n > 0)}  ${C.dim}${n} documents${C.r}`);
}

function describe(body) {
  if (Array.isArray(body)) return `${body.length} records`;
  if (body && typeof body === "object") {
    const raw = JSON.stringify(body);
    if (raw.length <= 40) return raw;
    return Object.entries(body)
      .map(([k, v]) => `${Array.isArray(v) ? v.length : Object.keys(v).length} ${k}`)
      .join(", ");
  }
  return String(body);
}

head(5, "LIVE API ENDPOINTS");
const get = async (path) => {
  for (let i = 0; i < 30; i++) {
    try { const r = await fetch(`http://localhost:${process.env.PORT || 5000}${path}`); return [r.status, await r.json()]; }
    catch { await new Promise(r => setTimeout(r, 1000)); }
  }
  return [0, null];
};
for (const path of ["/api/health", "/api/buildings", "/api/graph", "/api/faqs", "/api/contacts"]) {
  const [status, body] = await get(path);
  const n = describe(body);
  row(`GET ${path}`, `${check(path, status === 200)}  ${C.dim}${status}  ${n}${C.r}`);
}

line();
rule("═");
const ok = results.every(Boolean);
line(`  ${C.b}RESULT: ${ok ? `${C.gr}ALL ${results.length} CHECKS PASSED` : `${C.rd}FAILURES DETECTED`}${C.r}`);
if (!txtOk) line(`  ${C.dim}Note: network blocks DNS TXT; db.js fallback resolved the cluster directly.${C.r}`);
rule("═");
line();

server.kill();
await mongoose.disconnect();
process.exit(ok ? 0 : 1);
