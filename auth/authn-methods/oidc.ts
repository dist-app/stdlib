import { LoginServerApi } from "../../../apis/login-server/definitions.ts";
import { OpenidConnectFlowEntity, UserEntity } from "../../../apis/login-server/entities.ts";
import { validateOidcJwt } from "../../oidc/verifier.ts";
import { ForeignIdentityTab } from "../default-ui/tabs/foreign-identity.tsx";
import { AuthRequestContext, AuthRequestHandler, AuthSystem, AuthnMethod } from "../types.ts";

const FlowCookieName = 'DistAppSingleSignOnFlow';

export class OidcAuthnMethod implements AuthnMethod {
  readonly methodId = 'oidc';

  constructor(
    // props: {
      // rootUrl: string;
      // allowedSelfUrls?: string[];
      // defaultIssuer: string;
      // extraIssuers?: Array<string>;
      // desiredAudience: string;
      // extraAudiences?: Array<string>;
      // roleGrants: Array<{
      //   issuer: string;
      //   subject: string;// | RegExp;
      //   addRoles: Array<string>;
      // }>;
    // },
  ) {
    // this.allowedSelfUrls = props.allowedSelfUrls ?? [props.rootUrl];
    // this.defaultIssuer = props.defaultIssuer;
    // this.loginServerApi = new LoginServerApi(this.engine);
  }
  listPaths(auth: AuthSystem): Record<string, AuthRequestHandler> {
    return {
      '/auth/login/oidc': async (context) => {
        if (context.request.method !== 'POST') {
          return context.respondText(405, 'POST only');
        }
        const formData = await context.request.formData();

        const desiredIssuer = formData.get('desired_issuer');
        if (typeof desiredIssuer != 'string') {
          return context.respondText(400, 'desired_issuer is required');
        }
        const redirectPath = formData.get('redirect_path');
        if (typeof redirectPath != 'string') {
          return context.respondText(400, 'redirect_path is required');
        }

        // return context.respondText(200, 'hi')

        const callbackUrl = new URL('auth/receive-oidc', auth.selfBaseUrl);
        // callbackUrl.protocol = 'https:'; // TODO: remove

        // TODO: move this logic into somewhere central
        // if (!context.request.headers.get('accept')?.includes('html')) {
        //   return context.respondText(401, 'Unauthorized: use browser to sign in.');
        // }

        const state = await this.startFlow(auth, context, {
          redirectPath,
          issuer: desiredIssuer,
          audience: auth.selfBaseUrl,
          callbackUrl: callbackUrl.toString(),
        });

        const issuerUrl = new URL('oidc/authorize', desiredIssuer);
        issuerUrl.searchParams.set('response_type', 'code');
        issuerUrl.searchParams.set('client_id', auth.selfBaseUrl);
        issuerUrl.searchParams.set('redirect_uri', callbackUrl.toString());
        issuerUrl.searchParams.set('scope', 'openid');
        issuerUrl.searchParams.set('state', state);

        context.setHeader('location', issuerUrl.toString());
        return context.respondText(303, 'Redirecting to sign-in');
      },

      '/auth/receive-oidc': async (context) => {

        const code = context.requestUrl.searchParams.get('code');
        const state = context.requestUrl.searchParams.get('state');
        if (!code) throw new Error(`no code`);
        if (!state) throw new Error(`no state`);

        const flow = await this.retrieveFlow(auth, context, state);
        const redeemUrl = new URL('oidc/redeem', flow.issuer).toString();

        // TODO: issue a JWT towards the issuer
        // const redeemJwt = await oidcIssuer.signJwt({
        //   iss: auth.selfBaseUrl, // Issuer. This MUST contain the client_id of the OAuth Client.
        //   sub: auth.selfBaseUrl, // Subject. This MUST contain the client_id of the OAuth Client.
        //   aud: redeemUrl, // Audience. SHOULD be the URL of the Authorization Server's Token Endpoint.
        //   jti: Math.random().toString(16).slice(2), // JWT ID. A unique identifier for the token
        // });

        const redeemResp = await fetch(redeemUrl, {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'authorization': `Bearer TODO`, // TODO(SECURITY)
          },
          body: new URLSearchParams([
            ['code', code],
            ['grant_type', 'authorization_code'],
            ['client_id', flow.audience],
            ['redirect_uri', flow.callbackUrl],
            // ['client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'],
            // ['client_assertion', MY_JWT],
          ]),
        });
        if (!redeemResp.ok) throw new Error(`redeem failed: ${redeemResp.status}`);
        const redeemData = await redeemResp.json() as {
          "access_token": string;
          "token_type": "Bearer",
          "expires_in": number;
          "refresh_token"?: string;
          "id_token": string;
        };
        console.log('access:', redeemData.access_token);
        console.log('id:', redeemData.id_token);

        const user = await this.recognizeBearerToken(auth, redeemData.id_token);

        await auth.loginAs(context, user);

        context.setHeader('location', flow.requestedUrl);
        return context.respondText(302, 'Login complete, redirecting back.');
      },
    };
  }

  async recognizeBearerToken(auth: AuthSystem, bearerToken: string) {
    const idPayload = await validateOidcJwt(bearerToken);
    console.log('idtoken payload:', JSON.stringify(idPayload));

    if (!idPayload.aud.includes(auth.selfBaseUrl)) {
      throw new Error(`Incorrect JWT audience (${JSON.stringify(idPayload.aud)} vs ${JSON.stringify(auth.selfBaseUrl)})`);
    }

    const profile = (idPayload as {
      profile?: {
        email?: string;
        display_name?: string;
        username?: string;
      };
    }).profile;

    const hUser = auth.index.getEntityHandle<UserEntity>(
      "login-server.dist.app/v1alpha1", "User",
      `${idPayload.iss}/-/${idPayload.sub}`);
    let user = await hUser.get();
    if (!user) {
      await hUser.insert({
        spec: {
          lifecycle: 'Active',
          profile: {
            contactEmail: profile?.email,
            displayName: profile?.display_name,
          },
          foreignIdentity: {
            issuer: idPayload.iss,
            subject: idPayload.sub,
            username: profile?.username,
            lastSeen: new Date,
          },
        },
      });
      user = await hUser.get();
      if (!user) throw new Error(`BUG: read after write failed.`);
    }

    if (user.spec.lifecycle == "Inactive") {
      throw new Error(`This user is not active.`);
    }
    return user;
  }

  recognizeUser(_auth: AuthSystem, _ctx: AuthRequestContext): Promise<false | UserEntity> {
    // TODO: recognize JWTs in the authorization header
    return Promise.resolve(false);
  }
  listRpcs() {
    return {};
  }
  // observeSignin?(auth: AuthSystem, ctx: AuthRequestContext, user: UserEntity): Promise<boolean> {
  //   throw new Error("Method not implemented.");
  // }
  // defaultIssuer: string;
  // loginServerApi: LoginServerApi;
  // allowedSelfUrls: string[];

  // Flow cookies include the state in the name.
  // This is intended to allow for parallel ongoing flows with the same cookie store.

  private async startFlow(auth: AuthSystem, ctx: AuthRequestContext, props: {
    issuer: string;
    audience: string;
    callbackUrl: string;
    timeoutSeconds?: number;
    redirectPath: string;
  }) {
    const state = crypto.randomUUID().split('-')[0];

    const expiresAfter = new Date();
    const timeoutMs = (props.timeoutSeconds ?? 60) * 1000;
    expiresAfter.setMilliseconds(expiresAfter.getMilliseconds() + timeoutMs);

    const loginServerApi = new LoginServerApi(auth.index);
    const hFlow = await loginServerApi.createOpenidConnectFlow({
      metadata: {
        name: crypto.randomUUID().split('-')[4],
      },
      spec: {
        requestedUrl: props.redirectPath, // ctx.request.url,
        state,
        callbackUrl: props.callbackUrl,
        issuer: props.issuer,
        audience: props.audience,
        expiresAfter,
      },
    });

    ctx.setCookie({
      name: `${FlowCookieName}_${state}`,
      value: hFlow.coords.name,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax', // TODO: can we use 'Strict' and not have the cross-origin-redirect issue?
      // Expire our cookie a bit after the challenge itself times out
      // Should help make timeout symptoms more consistent
      maxAge: Math.round(timeoutMs / 1000) + 5,
    });
    console.log(`Setting cookie ${FlowCookieName}_${state} on`, ctx.cookies);

    return state;
  }

  private async retrieveFlow(auth: AuthSystem, ctx: AuthRequestContext, state: string) {
    const loginServerApi = new LoginServerApi(auth.index);
    const cookieName = `${FlowCookieName}_${state}`;

    const flowName = ctx.cookies[cookieName];
    if (typeof flowName !== 'string') {
      throw new Error(`Flow cookie ${cookieName} not given`);
    }

    const flow = await loginServerApi.getOpenidConnectFlow(flowName);
    if (!flow) {
      throw new Error(`Flow named ${flowName} not found`);
    }

    if (flow.spec.state !== state) {
      throw new Error(`Login flow failed: Unexpected state value.`);
    }

    await loginServerApi.deleteOpenidConnectFlow(flowName);
    ctx.deleteCookie(cookieName, {
      path: '/',
    });
    return flow.spec;
  }

  async runMaintanence(auth: AuthSystem): Promise<void> {
    const cutoffDate = new Date;
    cutoffDate.setMinutes(cutoffDate.getMinutes() - 60);
    const entities = await auth.index.listEntityHandles<OpenidConnectFlowEntity>("login-server.dist.app/v1alpha1", "OpenidConnectFlow");
    let deleted = 0;
    for (const hChallenge of entities) {
      const creationTimestamp = hChallenge.snapshot?.metadata.creationTimestamp;
      if (creationTimestamp && creationTimestamp < cutoffDate) {
        await hChallenge.delete();
        deleted++;
      }
    }
    if (deleted) {
      console.debug("Deleted", deleted, "oidc flows older than", cutoffDate);
    }
  }

  settingsTabs = [ForeignIdentityTab];
}
