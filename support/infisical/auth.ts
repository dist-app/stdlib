export interface OidcAuthCredential {
  "accessToken": string;
  "expiresIn": number;
  "accessTokenMaxTTL": number;
  "tokenType": 'Bearer';
}

export async function oidcAuth(
  serverUrl: string,
  identityId: string,
  jwt: string,
): Promise<OidcAuthCredential> {
  const url = new URL('v1/auth/oidc-auth/login', serverUrl);
  const resp = await fetch(url, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({ identityId, jwt }),
  });
  if (!resp.ok) throw new Error(
    `Infisical returned HTTP ${resp.status}: ${await resp.text()}`);
  return await resp.json() as {
    "accessToken": string;
    "expiresIn": number;
    "accessTokenMaxTTL": number;
    "tokenType": 'Bearer';
  };
}
