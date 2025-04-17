import { LoginServerApi, UserEntity } from "../../apis/login-server/definitions.ts";
import { EntityEngine } from "../engine/engine.ts";
import { EntityStorage } from "../engine/types.ts";
import { authStyle } from "./default-ui/auth-style.ts";
import { renderLoginPage } from "./default-ui/login-page.tsx";
import { listUiRpcs } from "./default-ui/rpc.ts";
import { renderSettingsPage } from "./default-ui/settings-page.tsx";
import { ProfileTab } from "./default-ui/tabs/profile.tsx";
import { AuthRequestContextImpl } from "./request-context.ts";
import { AuthRequestContext, AuthRequestHandler, AuthRpcHandler, AuthSystem, AuthnMethod, RoleGrant, SettingsTab } from "./types.ts";


export class AuthFramework implements AuthSystem {
  constructor(
    /*private*/ readonly storage: EntityStorage,
    /*private*/ readonly selfBaseUrl: string,
  ) {
    // TODO: better way of registering apis
    // TODO: each authn-method should have its own api surface
    this.index.addApi('login-server.dist.app', storage, LoginServerApi.definition);

    for (const [id, handler] of Object.entries(listUiRpcs(this))) {
      this.rpcs.set(id, handler);
    }
    // TODO: get paths from the UI module
  }
  /*private*/ readonly index = new EntityEngine;
  private readonly rpcs = new Map<string,AuthRpcHandler>();
  private readonly paths = new Map<string,AuthRequestHandler>();
  private readonly roleGrants = new Array<RoleGrant>;

  async maintainDb() {
    for (const authnMethod of this.authnMethods.values()) {
      await authnMethod.runMaintanence?.(this);
    }
  }

  private readonly authnMethods = new Map<string,AuthnMethod>();
  public addAuthnMethod(impl: AuthnMethod) {
    if (this.authnMethods.has(impl.methodId)) {
      throw new Error(`Authn method ${impl.methodId} is already set up once`);
    }
    this.authnMethods.set(impl.methodId, impl);
    for (const [id, handler] of Object.entries(impl.listRpcs(this))) {
      this.rpcs.set(id, handler);
    }
    for (const [id, handler] of Object.entries(impl.listPaths(this))) {
      this.paths.set(id, handler);
    }
  }
  public hasAuthnMethod(methodId: string) {
    return this.authnMethods.has(methodId);
  }

  gatherSettingsTabs(ctx: AuthRequestContext, user: UserEntity): Array<SettingsTab> {
    return [...this.authnMethods.values()]
      .flatMap(x => x.settingsTabs ?? [])
      .concat(ProfileTab)
      .filter(x => x.eligable(this, ctx, user))
      .sort((a,b) => a.sortIdx - b.sortIdx);
  }

  // private accountSystem : AccountSystem | null = null;

  addRoleGrant(grant: RoleGrant) {
    this.roleGrants.push(grant);
  }
  getRolesForUser(user: UserEntity): Array<string> {
    const roles = new Set(['authed']);
    for (const grant of this.roleGrants) {
      if (grant.source == 'oidc' && user.spec.foreignIdentity) {
        if (grant.issuer !== user.spec.foreignIdentity.issuer) continue;
        if (grant.subject !== user.spec.foreignIdentity.subject) continue;
      } else if (grant.source == 'local') {
        if (grant.userId !== user.metadata.name) continue;
      } else continue;

      for (const role of grant.roles) {
        roles.add(role);
      }
    }
    return Array.from(roles);
  }

  async recognizeBearerToken(methodId: string, bearer: string): Promise<UserEntity> {
    const method = this.authnMethods.get(methodId);
    if (!method?.recognizeBearerToken) throw new Error(`Login method not available.`);
    return await method.recognizeBearerToken(this, bearer);
  }

  async loginAs(context: AuthRequestContext, user: UserEntity): Promise<void> {
    // // TODO: attach originating claims to session for OIDC logins
    let worked = false;
    for (const authnMethod of this.authnMethods.values()) {
      if (await authnMethod.observeSignin?.(this, context, user)) {
        worked = true;
      }
    }
    if (!worked) throw new Error(`TODO: no registered AuthnMethod took notice of the login.`);

    // console.log(JSON.stringify({challenge, signin: reqJson.authn, verification, passkey},null,2));
    console.log(`User ${user.metadata.name} signed in.`);

    // context.setHeader('location', redirectTo ?? '/');
    // return context.respondText(302, 'Login complete, redirecting back.');
  }

  redirectToLogin(_req: Request, origUrl: URL, _connInfo: Deno.ServeHandlerInfo) {
    const newUrl = new URL('auth/login', this.selfBaseUrl);
    // url.protocol = 'https:'; // TODO: remove
    newUrl.searchParams.set('redirect', `${origUrl.pathname}${origUrl.search}`);

    return Promise.resolve(new Response('Redirecting to sign-in', {
      status: 303,
      headers: {
        location: newUrl.toString(),
      },
    }));
  }

  async fetchRequestSession(req: Request, connInfo: Deno.ServeHandlerInfo) {
    // TODO: add support for taking JWTs off the `Authorization` header

    const ctx = new AuthRequestContextImpl(req, connInfo);
    // const storage = new AuthStorage(this.engine);

    for (const method of this.authnMethods.values()) {
      const user = await method.recognizeUser(this, ctx);
      if (user) return user;
    }
    return null;

    // if (!user) return null;
    // return {
    //   user,
    //   session: session.userSession,
    //   roles: [
    //     'authed',
    //     // ...user.spec.profile.contactEmail ? ['registered'] : [],
    //     ...this.props.roleGrants
    //       ?.find(x => {
    //         // TODO: allow adding roles to local users, right?
    //         //x.issuer == user.metadata.uid && x.username == user.metadata.name
    //         if (x.issuer && user.spec.foreignIdentity) {
    //           if (x.issuer == user.spec.foreignIdentity.issuer) {
    //             if (x.subject == user.spec.foreignIdentity.subject) {
    //               return true;
    //             }
    //           }
    //         }
    //         return false;
    //       })
    //       ?.addRoles ?? [],
    //   ],
    // }
  }

  async serveLoginRoute(req: Request, url: URL, connInfo: Deno.ServeHandlerInfo): Promise<Response> {
    const ctx = new AuthRequestContextImpl(req, connInfo);

    const handler = this.paths.get(url.pathname);
    if (handler) {
      return await handler(ctx);
    }

    if (req.method == 'POST') {

      if (url.pathname == '/auth/profile') {
        const user = await this.fetchRequestSession(req, connInfo);
        if (!user) throw new Error(`Not already logged in`);

        const submission = await ctx.readFormFields();

        await this.index.mutateEntity<UserEntity>(
          "login-server.dist.app/v1alpha1", "User",
          user.metadata.name,
          x => {
            x.spec.profile.contactEmail = submission.get('email') ?? undefined;
            x.spec.profile.displayName = submission.get('displayname') ?? undefined;
          })

        // TODO: correct way to change user to a GET?
        ctx.setHeader('location', url.toString());
        return ctx.respondText(303, 'Profile updated.');
      }

      if (url.pathname == '/auth/api') {
        const reqJson = await ctx.request.json();
        const user = await this.fetchRequestSession(req, connInfo);

        const handler = this.rpcs.get(reqJson.rpc);
        if (handler) {
          console.error(`Running auth rpc:`, reqJson);
          try {
            const resp = await handler(ctx, user, reqJson);
            return Response.json(resp, { headers: ctx.respHeaders });
          } catch (err: unknown) {
            console.log({reqJson}, err);
            return ctx.respondText(400, JSON.stringify({
              "error": `${(err as Error).message || err}`,
            }));
          }
        } else {
          return Response.json({error: "RPC not found"}, { headers: ctx.respHeaders });
        }
      }

      return new Response('', {status: 404});

    } else if (req.method == 'GET') {
      if (url.pathname == '/auth/style.css') {
        return new Response(authStyle, {
          headers: {
            'content-type': 'text/css; charset=utf-8',
            'cache-control': 'max-age=600',
          },
        });
      } else if (['/auth/profile', '/auth/foreign-identity', '/auth/passkeys', '/auth/sessions', '/auth/sign-out'].includes(url.pathname)) {
        const user = await this.fetchRequestSession(req, connInfo);
        if (user) {
          return await renderSettingsPage(this, ctx, user, url.pathname.split('/')[2]);
        }
        return Response.redirect(new URL(`/auth/login?${new URLSearchParams({
          redirect: url.pathname,
        })}`, url));
      } else if (url.pathname == '/auth/' || url.pathname == '/auth/login') {
        const user = await this.fetchRequestSession(req, connInfo);
        if (user) {
          const redirect = url.searchParams.get('redirect');
          if (redirect && redirect.startsWith('/')) {
            return Response.redirect(new URL(redirect, url));
          }
          return Response.redirect(new URL('profile', url));
        }
        return renderLoginPage(this, ctx);
      }
      return new Response('', {status: 404});
    } else {
      return new Response('Method not allowed', {status: 405});
    }
  }
}
