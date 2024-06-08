import { UserEntity, UserSessionEntity } from '../../../apis/login-server/entities.ts';
import { SessionsTab } from '../default-ui/tabs/sessions.tsx';
import { SignOutTab } from '../default-ui/tabs/sign-out.tsx';
import { AuthRequestContext, AuthRequestHandler, AuthRpcHandler, AuthSystem, AuthnMethod } from "../types.ts";

export class CookieAuthnMethod implements AuthnMethod {
  readonly methodId = 'cookie';

  constructor(props?: {
    sessionLengthDays?: number;
  }) {
    this.sessionLengthDays = props?.sessionLengthDays ?? 1; // TODO: widen
  }
  sessionLengthDays: number;

  // serveSignin?(auth: AuthSystem, ctx: AuthRequestContext): Promise<Response> {
  //   throw new Error('Method not implemented.');
  // }
  private async recognizeSession(auth: AuthSystem, ctx: AuthRequestContext) {
    const sessionCookie = ctx.cookies['DistAppUserSession'];
    if (!sessionCookie) return false;

    const parts = sessionCookie.split(':');
    if (parts.length !== 2) throw new Error(`Corrupt session cookie?`);
    const [sessionName, bearerToken] = parts.map(x => decodeURIComponent(x));

    const session = await auth.index
      .getEntity<UserSessionEntity>('login-server.dist.app/v1alpha1', 'UserSession', sessionName);
    if (!session) return false
    if (session.spec.bearerToken !== bearerToken) throw new Error(`Unrecognized session token`);

    const user = await auth.index
      .getEntity<UserEntity>('login-server.dist.app/v1alpha1', 'User', session.spec.userName);
    if (!user) throw new Error(`no user found`);

    return {user, session: session};
  }

  async recognizeUser(auth: AuthSystem, ctx: AuthRequestContext): Promise<false | UserEntity> {
    const session = await this.recognizeSession(auth, ctx);
    if (!session) return false;
    return session.user;
  }

  async runMaintanence(auth: AuthSystem) {
    const sessions = await auth.index.listEntityHandles<UserSessionEntity>("login-server.dist.app/v1alpha1", "UserSession");
    let deleted = 0;
    for (const hSession of sessions) {
      const expiresAfter = hSession.snapshot?.spec.expiresAfter;
      if (expiresAfter && expiresAfter < new Date) {
        await hSession.delete();
        deleted++;
      }
    }
    console.log("Deleted", deleted, "expired sessions");
  }

  // bindTo(framework: AuthFramework) {

  // }

  listPaths(auth: AuthSystem): Record<string, AuthRequestHandler> {
    return {

      '/auth/signout': async (ctx) => {
        if (ctx.request.method !== 'POST') {
          return new Response('', {status: 405});
        }

        const session = await this.recognizeSession(auth, ctx);
        if (!session) throw new Error(`Not already logged in`);

        // TODO(security): check xsrf

        await auth.index.deleteEntity<UserSessionEntity>(
          "login-server.dist.app/v1alpha1", "UserSession",
          session.session.metadata.name);

        ctx.deleteCookie('DistAppUserSession', { path: '/' });

        ctx.setHeader('location', '/auth/login');
        return ctx.respondText(303, 'Redirecting to public page...');
      },

    };
  }
  listRpcs(_auth: AuthSystem): Record<string, AuthRpcHandler> {
    return {
    };
  }

  async observeSignin(auth: AuthSystem, ctx: AuthRequestContext, user: UserEntity): Promise<boolean> {
    const bearerToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.sessionLengthDays);

    const hSession = await auth.index.insertEntity<UserSessionEntity>({
      apiVersion: 'login-server.dist.app/v1alpha1',
      kind: 'UserSession',
      metadata: {
        name: `${user.metadata.name}-${bearerToken.split('-')[0]}`,
      },
      spec: {
        // TODO: associate with auth source
        // passkeyAssociationName,
        userName: user.metadata.name,
        bearerToken,
        expiresAfter: expiresAt,
        deviceInfo: {
          ipAddress: ctx.remoteAddress,
          // TODO: use the newer structured api for user agent info
          userAgent: navigator.userAgent,
        },
      },
    });

    ctx.setCookie({
      name: 'DistAppUserSession',
      value: `${encodeURIComponent(hSession.coords.name)}:${encodeURIComponent(bearerToken)}`,
      expires: expiresAt,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax', // TODO: can we use 'Strict' and not have the cross-origin-redirect issue?
    });

    // return { bearerToken, expiresAt };
    return true;
  }

  settingsTabs = [SessionsTab, SignOutTab];
}
