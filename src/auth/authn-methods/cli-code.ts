import { type UserEntity } from "../api/definitions.ts";
import type { AuthRequestContext, AuthRequestHandler, AuthRpcHandler, AuthSystem, AuthnMethod } from "../types.ts";

// This implementation is a stub.
// You can help dist.app by expanding it.

export class CliCodeAuthnMethod implements AuthnMethod {
  readonly methodId = 'cli-code';

  constructor(
  ) {
  }
  listPaths(auth: AuthSystem): Record<string, AuthRequestHandler> {
    return {
      '/auth/login/cli-code': async (context) => {
        if (context.request.method !== 'POST') {
          return context.respondText(405, 'POST only');
        }
        return context.respondText(420, 'TODO: sober up and implement this');
      },
    };
  }

  recognizeUser(_auth: AuthSystem, _ctx: AuthRequestContext): Promise<false | UserEntity> {
    // TODO: recognize JWTs in the authorization header
    return Promise.resolve(false);
  }
  listRpcs(): Record<string, AuthRpcHandler> {
    return {};
  }

  settingsTabs = [];
}
