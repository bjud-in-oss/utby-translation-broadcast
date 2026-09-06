export interface SecureCredentials {
  sfuKey1: string | null;
  sfuKey2: string | null;
}

export async function fetchSecureCredentials(_orgId: string): Promise<SecureCredentials> {
  const env = (import.meta as any).env || {};
  return {
    sfuKey1: env.VITE_CLOUDFLARE_CALLS_APP_ID || env.CLOUDFLARE_CALLS_APP_ID || null,
    sfuKey2: env.VITE_CLOUDFLARE_CALLS_APP_TOKEN || env.CLOUDFLARE_CALLS_APP_TOKEN || null,
  };
}
