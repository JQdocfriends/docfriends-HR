import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    );
  }
  cached = createClient(url, anonKey, {
    realtime: {
      params: { eventsPerSecond: 20 },
      logger: (kind: string, msg: string, data?: unknown) => {
        console.log("[realtime]", kind, msg, data);
      },
    },
  });
  return cached;
}

export const ROOM_CHANNEL = "forest";
