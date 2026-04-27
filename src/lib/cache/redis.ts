import "server-only";

import { createClient } from "redis";

type CacheEnvelope<T> = {
  value: T;
};

type AppRedisClient = ReturnType<typeof createClient>;

declare global {
  var __dotadataRedisClient: AppRedisClient | null | undefined;
  var __dotadataRedisConnectPromise: Promise<AppRedisClient | null> | undefined;
}

const REDIS_URL = process.env.REDIS_URL;
const REDIS_KEY_PREFIX = process.env.REDIS_KEY_PREFIX ?? "dotadata:v1";

const buildKey = (key: string) => `${REDIS_KEY_PREFIX}:${key}`;

const getRedisClient = async (): Promise<AppRedisClient | null> => {
  if (!REDIS_URL) {
    return null;
  }

  if (globalThis.__dotadataRedisClient?.isOpen) {
    return globalThis.__dotadataRedisClient;
  }

  if (!globalThis.__dotadataRedisConnectPromise) {
    globalThis.__dotadataRedisConnectPromise = (async () => {
      try {
        const client = createClient({ url: REDIS_URL });
        client.on("error", (error) => {
          console.error("Redis client error", error);
        });
        await client.connect();
        globalThis.__dotadataRedisClient = client;
        return client;
      } catch (error) {
        console.error("Failed to connect to Redis", error);
        globalThis.__dotadataRedisClient = null;
        globalThis.__dotadataRedisConnectPromise = undefined;
        return null;
      }
    })();
  }

  return globalThis.__dotadataRedisConnectPromise ?? null;
};

export async function getRedisJson<T>(key: string): Promise<{ found: true; value: T } | { found: false }> {
  const client = await getRedisClient();

  if (!client) {
    return { found: false };
  }

  try {
    const payload = await client.get(buildKey(key));
    if (!payload) {
      return { found: false };
    }

    const parsed = JSON.parse(payload) as CacheEnvelope<T>;
    return { found: true, value: parsed.value };
  } catch (error) {
    console.error(`Failed to read Redis cache for key "${key}"`, error);
    return { found: false };
  }
}

export async function setRedisJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const client = await getRedisClient();

  if (!client) {
    return;
  }

  try {
    const payload = JSON.stringify({ value } as CacheEnvelope<T>);
    if (ttlSeconds > 0) {
      await client.set(buildKey(key), payload, { EX: ttlSeconds });
      return;
    }

    await client.set(buildKey(key), payload);
  } catch (error) {
    console.error(`Failed to write Redis cache for key "${key}"`, error);
  }
}

export async function withRedisCache<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const cached = await getRedisJson<T>(key);
  if (cached.found) {
    return cached.value;
  }

  const value = await loader();
  await setRedisJson(key, value, ttlSeconds);
  return value;
}
