import mongoose from "mongoose";
import { Resolver } from "dns/promises";

const DEFAULT_URI = "mongodb://localhost:27017/gctu_navigator";

// A mongodb+srv:// URI needs both an SRV and a TXT DNS lookup. Some networks
// (mobile hotspots, restrictive campus/ISP resolvers) silently drop TXT
// queries, which surfaces as "queryTxt ETIMEOUT" even though the cluster is
// perfectly reachable. Short timeouts so a blocked lookup costs seconds rather
// than the ~30s the default resolver spends before giving up.
const resolver = new Resolver({ timeout: 3000, tries: 2 });

// Phone hotspots (e.g. iPhone's 172.20.10.1) sometimes refuse DNS queries
// outright (ECONNREFUSED). Public resolvers still answer the SRV lookup, so
// fall back to them rather than failing to start.
const publicResolver = new Resolver({ timeout: 3000, tries: 2 });
publicResolver.setServers(["8.8.8.8", "1.1.1.1"]);

async function resolveSrv(name) {
  try {
    return await resolver.resolveSrv(name);
  } catch (err) {
    console.warn(`Local DNS failed for SRV lookup (${err.code}); retrying via public DNS.`);
    return publicResolver.resolveSrv(name);
  }
}

function credentials(url) {
  return url.username ? `${url.username}:${url.password}@` : "";
}

// The TXT record normally supplies authSource and replicaSet. When it is
// unreachable, ask the cluster for its replica set name over a direct
// connection to one of the hosts the SRV lookup gave us.
async function discoverReplicaSet(url, host) {
  const uri = `mongodb://${credentials(url)}${host}/?tls=true&authSource=admin&directConnection=true`;
  const probe = await mongoose
    .createConnection(uri, { serverSelectionTimeoutMS: 10000 })
    .asPromise();
  try {
    const { setName } = await probe.db.admin().command({ hello: 1 });
    return setName;
  } finally {
    await probe.close();
  }
}

// Rebuild the SRV URI as a plain mongodb:// seed list the driver can use
// without any TXT lookup.
async function buildSeedListUri(url) {
  const records = await resolveSrv(`_mongodb._tcp.${url.hostname}`);
  const hosts = records.map((record) => `${record.name}:${record.port}`);

  const params = new URLSearchParams(url.search);
  const replicaSet = await discoverReplicaSet(url, hosts[0]);
  if (replicaSet && !params.has("replicaSet")) params.set("replicaSet", replicaSet);
  // mongodb+srv implies TLS; the plain scheme has to ask for it explicitly.
  params.set("tls", "true");
  if (!params.has("authSource")) params.set("authSource", "admin");

  return `mongodb://${credentials(url)}${hosts.join(",")}${url.pathname}?${params}`;
}

async function resolveUri(uri) {
  if (!uri.startsWith("mongodb+srv://")) return uri;

  const url = new URL(uri);
  try {
    await resolver.resolveTxt(url.hostname);
    return uri;
  } catch (err) {
    console.warn(
      `MongoDB SRV lookup failed (${err.message}) — this network is blocking the DNS records mongodb+srv needs. Falling back to a direct host list.`
    );
    return buildSeedListUri(url);
  }
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI || DEFAULT_URI;
  try {
    await mongoose.connect(await resolveUri(uri));
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
}
