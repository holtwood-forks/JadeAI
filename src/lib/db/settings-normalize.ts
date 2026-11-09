export type UserSettings = Record<string, unknown>;

/**
 * Normalize the `users.settings` column.
 *
 * The column default was written as the JS string `'{}'`, which drizzle
 * serialized again — historical rows contain `'"{}"'`. Merging that string into
 * an object produced character-index keys (`{"0":"{","1":"}"}`), which then got
 * persisted. Accept both shapes and drop that specific corruption.
 */
export function normalizeUserSettings(value: unknown): UserSettings {
  let parsed: unknown = value;

  for (let depth = 0; depth < 2 && typeof parsed === 'string'; depth++) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  const settings = { ...(parsed as UserSettings) };
  for (const [key, entry] of Object.entries(settings)) {
    if (/^\d+$/.test(key) && typeof entry === 'string' && entry.length === 1) {
      delete settings[key];
    }
  }
  return settings;
}
