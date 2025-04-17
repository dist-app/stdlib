import {
  verify as verifyJwt,
  // type Payload,
} from "jsr:@zaubrik/djwt@3.0.2";

export type JwtPayload = {
  "iss": string;
  "sub": string;
  "aud": string[];

  "exp"?: number;
  "iat"?: number;
  "nbf"?: number;

  "kubernetes.io"?: {
    namespace: string;
    pod?:           { name: string; uid: string };
    secret?:        { name: string; uid: string };
    serviceaccount: { name: string; uid: string };
  };
};

export async function validateOidcJwt(jwt: string): Promise<JwtPayload> {
  const parts = jwt.split('.');
  const headPart = JSON.parse(atob(parts[0])) as Record<string, unknown>;
  const dataPart = JSON.parse(atob(parts[1])) as Record<string, unknown>;
  const issuer = dataPart.iss;
  if (typeof issuer !== 'string') throw new Error('bad iss');
  if (!issuer.startsWith('https://')) throw new Error('bad iss');
  const issuerBase = issuer.replace(/\/*$/, '/');

  // https://token.actions.githubusercontent.com/.well-known/openid-configuration
  const oidcConfig = await fetch(new URL('.well-known/openid-configuration', issuerBase)).then(x => x.json()) as {
    issuer: string;
    jwks_uri: string;
    subject_types_supported: string[];
    response_types_supported: string[];
    claims_supported: string[];
    id_token_signing_alg_values_supported: string[];
    scopes_supported: string[];
  };

  // TODO: add support for elliptic curves (at least)

  const jwksRaw = await fetch(new URL(oidcConfig.jwks_uri)).then(x => x.json()) as {
    keys: Array<{
      kid: string;
      use: "sig" | string;
      kty: "RSA";
      alg: "RS256" | string;
      n: string;
      e: string;
    } | {
      kid: string;
      use: "sig" | string;
      kty: "EC";
      alg: "ES384" | string;
      crv: "P-384" | string;
      x: string;
      y: string;
    }>;
  };

  const key = jwksRaw.keys.find(x => x.kid == headPart.kid && x.use == 'sig');
  if (!key) throw new Error('signing key not found');

  const result = await crypto.subtle.importKey(
    'jwk',
    key,
    key.kty == 'RSA' ? {
      name: 'RSASSA-PKCS1-v1_5',
      hash: `SHA-${key.alg.slice(2)}`,
    } : {
      name: 'ECDSA',
      hash: `SHA-${key.alg.slice(2)}`,
      namedCurve: key.crv,
    },
    true,
    ['verify'],
  );

  const payload = await verifyJwt(jwt, result);
  console.log('Successfully validated JWT from', payload.iss, payload.sub);

  if (typeof payload.iss !== 'string') throw new Error('iss missing');
  if (typeof payload.sub !== 'string') throw new Error('sub missing');
  return {
    ...payload,
    iss: payload.iss,
    sub: payload.sub,
    aud:
      Array.isArray(payload.aud)
      ? payload.aud.filter(x => typeof x == 'string')
      : (typeof payload.aud == 'string')
        ? [payload.aud]
        : [],
  };
}
