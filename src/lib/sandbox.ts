// Production cannot enable this mode. The launcher supplies isolated paths and
// ephemeral credentials; no real directory or patient service is contacted.
export function sandboxEnabled() {
  return process.env.NODE_ENV === 'development' && process.env.SANDBOX_MODE === 'true';
}
