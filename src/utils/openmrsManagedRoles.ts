function normalizeRoleKey(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function isPeerEducatorRole(role: { name?: string | null; identifier?: string | null }) {
  const keys = [normalizeRoleKey(role?.name), normalizeRoleKey(role?.identifier)];
  return keys.some((key) => key === "peer educator" || key === "pe");
}

export function isIcchwRole(role: { name?: string | null; identifier?: string | null }) {
  const keys = [normalizeRoleKey(role?.name), normalizeRoleKey(role?.identifier)];
  return keys.some((key) => key === "icchw" || key === "waja");
}

/** iCCHW comes from HRHIS. Peer Educators come from the peers app. */
export function isExternallyManagedOpenMrsRole(role: {
  name?: string | null;
  identifier?: string | null;
}) {
  return isIcchwRole(role) || isPeerEducatorRole(role);
}
