const dns = require("dns");
const mongoose = require("mongoose");

const PUBLIC_DNS_SERVERS = ["8.8.8.8", "1.1.1.1"];
const RETRY_DELAY_MS = 5000;

const publicResolver = new dns.Resolver();
publicResolver.setServers(PUBLIC_DNS_SERVERS);

let reconnectTimer = null;

function getMongoUri() {
  return process.env.MONGO_DIRECT_URI || process.env.MONGO_URI;
}

function mongoLookup(hostname, options, callback) {
  const family = typeof options === "object" && options?.family ? options.family : 4;
  const wantsAll = typeof options === "object" && options?.all;
  const primaryResolve = family === 6 ? publicResolver.resolve6.bind(publicResolver) : publicResolver.resolve4.bind(publicResolver);
  const fallbackResolve = family === 6 ? publicResolver.resolve4.bind(publicResolver) : publicResolver.resolve6.bind(publicResolver);

  primaryResolve(hostname, (primaryErr, primaryAddresses = []) => {
    if (!primaryErr && primaryAddresses.length > 0) {
      if (wantsAll) {
        callback(
          null,
          primaryAddresses.map((address) => ({ address, family }))
        );
        return;
      }

      callback(null, primaryAddresses[0], family);
      return;
    }

    fallbackResolve(hostname, (fallbackErr, fallbackAddresses = []) => {
      if (fallbackErr || fallbackAddresses.length === 0) {
        callback(primaryErr || fallbackErr);
        return;
      }

      const fallbackFamily = family === 6 ? 4 : 6;

      if (wantsAll) {
        callback(
          null,
          fallbackAddresses.map((address) => ({ address, family: fallbackFamily }))
        );
        return;
      }

      callback(null, fallbackAddresses[0], fallbackFamily);
    });
  });
}

function scheduleReconnect() {
  if (reconnectTimer || mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectToDB();
  }, RETRY_DELAY_MS);
}

async function connectToDB() {
  const mongoUri = getMongoUri();

  if (!mongoUri) {
    console.warn("MONGO_URI not set - skipping database connection.");
    return;
  }

  try {
    await mongoose.connect(mongoUri, {
      family: 4,
      lookup: mongoLookup,
      serverSelectionTimeoutMS: 10000,
    });
    console.log("Connected to DB");
  } catch (err) {
    console.error("Database connection failed:", err.message);

    if (!process.env.MONGO_DIRECT_URI && process.env.MONGO_URI?.startsWith("mongodb+srv://")) {
      console.error("Add MONGO_DIRECT_URI to Backend/src/.env if your DNS blocks MongoDB SRV lookups.");
    }

    console.error("Retrying database connection in 5 seconds...");
    scheduleReconnect();
  }
}

module.exports = connectToDB;
