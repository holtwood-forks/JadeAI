/**
 * Recruit is an interviewer-side module. Personal/self-hosted resume users can
 * turn it off without deleting routes or database tables.
 */
export function resolveRecruitEnabled(env: Record<string, string | undefined>): boolean {
  return env.FEATURE_RECRUIT !== 'false';
}
