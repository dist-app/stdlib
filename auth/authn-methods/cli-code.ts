import { LoginServerApi } from "../../../apis/login-server/definitions.ts";
import { OpenidConnectFlowEntity, UserEntity } from "../../../apis/login-server/entities.ts";
import { validateOidcJwt } from "../../oidc/verifier.ts";
import { ForeignIdentityTab } from "../default-ui/tabs/foreign-identity.tsx";
import { AuthRequestContext, AuthRequestHandler, AuthSystem, AuthnMethod } from "../types.ts";

// This is a implementation is a stub.
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
  listRpcs() {
    return {};
  }

  settingsTabs = [];
}
