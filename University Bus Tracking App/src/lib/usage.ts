import { supabase, type UsageFeature } from "./supabase";

const VISITOR_KEY = "cuhk-bus-visitor-id";

function visitorId() {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const created =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    return null;
  }
}

export function recordUsage(feature: UsageFeature) {
  const client = supabase;
  const id = visitorId();
  if (!client || !id) return;
  void client
    .from("app_usage")
    .insert({ visitor_id: id, feature })
    .then(
      () => undefined,
      () => undefined,
    );
}
