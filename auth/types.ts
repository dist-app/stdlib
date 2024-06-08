import { Cookie } from "https://deno.land/std@0.208.0/http/cookie.ts";
import { UserEntity } from "../../apis/login-server/definitions.ts";
import { EntityEngine } from "../portable/engine.ts";
import { EntityStorage } from "../portable/types.ts";

export type AuthnMethodId =
  | 'cookie'
  | 'oidc'
  | 'passkey'
;

export interface SettingsTab {
  slug: string;
  label: string;
  sortIdx: number;
  eligable(auth: AuthSystem, ctx: AuthRequestContext, user: UserEntity): boolean;
  render(auth: AuthSystem, ctx: AuthRequestContext, user: UserEntity): string | Promise<string>;
};

export interface AuthnMethod {
  readonly methodId: AuthnMethodId;

  recognizeUser(auth: AuthSystem, ctx: AuthRequestContext): Promise<UserEntity | false>;
  listRpcs(auth: AuthSystem): Record<string,AuthRpcHandler>;
  listPaths(auth: AuthSystem): Record<string,AuthRequestHandler>;

  recognizeBearerToken?(auth: AuthSystem, bearer: string): Promise<UserEntity>;

  observeSignin?(auth: AuthSystem, ctx: AuthRequestContext, user: UserEntity): Promise<boolean>;
  // serveSignin?(auth: AuthSystem, ctx: AuthRequestContext): Promise<Response>;
  runMaintanence?(auth: AuthSystem): Promise<void>;

  settingsTabs?: Array<SettingsTab>;
}

export type RoleGrant =
| {
  source: 'local';
  userId: string;
  // conditionCb?: (user: UserEntity) => boolean;
  roles: Array<string>;
}
| {
  source: 'oidc';
  issuer: string;
  subject: string;// or RegExp?
  // conditionCb?: (user: UserEntity) => boolean;
  roles: Array<string>;
}
;

// export interface AccountSystem {
//   runMaintanence(): Promise<void>;
//   // lookupUser()
// }

export interface AuthSystem {
  loginAs(context: AuthRequestContext, user: UserEntity): Promise<void>;
  hasAuthnMethod(methodId: AuthnMethodId): boolean;
  getRolesForUser(user: UserEntity): Array<string>;
  readonly selfBaseUrl: string;
  readonly storage: EntityStorage
  readonly index: EntityEngine;

  gatherSettingsTabs(ctx: AuthRequestContext, user: UserEntity): Array<SettingsTab>;
}

export type AuthRequestHandler = (
  ctx: AuthRequestContext,
) => Promise<Response>;

export type AuthRpcHandler = (
  // auth: AuthSystem,
  ctx: AuthRequestContext,
  user: UserEntity | null,
  props: Record<string,unknown>,
) => Promise<Record<string,unknown>>;

// export interface RetrievedSession {
//   user: UserEntity;
//   // userSession: UserSessionEntity;
// }

export interface AuthRequestContext {
  readonly request: Request;
  readonly connInfo: Deno.ServeHandlerInfo;
  readonly requestUrl: URL;
  readonly cookies: Record<string,string>;
  readonly respHeaders: Headers;

  setCookie(cookie: Cookie): void;
  deleteCookie(name: string, attributes: {
    path?: string;
    domain?: string;
  }): void;
  setHeader(name: string, value: string): void;
  respondText(status: number, body: string): Response;
  readFormFields(): Promise<URLSearchParams>;
  get remoteAddress(): string;
}
