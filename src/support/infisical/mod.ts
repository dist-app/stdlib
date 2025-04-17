import { oidcAuth } from "./auth.ts";
import { listSecrets, ListSecretsQuery, ListSecretsResponse } from "./list-secrets.ts";

export const ServerUrl_us = 'https://us.infisical.com/api/';
export const ServerUrl_eu = 'https://eu.infisical.com/api/';

export class InfisicalApiClient {
  constructor(private readonly props: {
    serverUrl: string;
    tokenFactory: () => string | Promise<string>;
  }) {
  }

  static async fromOidcAuth(
    serverUrl: string,
    identityId: string,
    jwtFactory: () => string | Promise<string>,
  ): Promise<InfisicalApiClient> {
    let currentCredential = await oidcAuth(serverUrl, identityId, await jwtFactory());
    let expiresAt = new Date(Math.round((Date.now() / 1000 + currentCredential.expiresIn - 10) * 1000));
    console.log('Expires at', expiresAt);
    async function tokenFactory() {
      if (expiresAt < new Date()) {
        currentCredential = await oidcAuth(serverUrl, identityId, await jwtFactory());
        expiresAt = new Date(Math.round((Date.now() / 1000 + currentCredential.expiresIn - 10) * 1000));
      }
      return currentCredential.accessToken;
    }
    return new this({
      serverUrl,
      tokenFactory,
    })
  }

  public readonly listSecrets:
    (query: ListSecretsQuery) => Promise<ListSecretsResponse>
    = listSecrets.bind(null, this);

  async fetchJsonApi<T=unknown>(path: string, opts: RequestInit & {
    bodyJson?: unknown;
    query?: URLSearchParams;
  }): Promise<T> {
    const url = new URL(path, this.props.serverUrl);
    const headers = new Headers(opts.headers);
    headers.set('authorization', 'Bearer '+await this.props.tokenFactory());
    headers.set('accept', 'application/json');
    for (const [key, value] of opts.query ?? []) {
      url.searchParams.append(key, value);
    }
    if (opts.bodyJson) {
      headers.set('content-type', 'application/json');
      opts.body = JSON.stringify(opts.bodyJson);
    }
    const resp = await fetch(url, {
      ...opts,
      headers,
    });
    if (!resp.ok) throw new Error(
      `Infisical ${path} returned HTTP ${resp.status}: ${await resp.text()}`);
    return await resp.json() as T;
  }
}
