/** @jsx jsx *//** @jsxImportSource jsr:@hono/hono@4.7.7/jsx *//** @jsxFrag Fragment */
import { html } from "../../html/mod.tsx";

import { AuthRequestContext, AuthSystem } from "../types.ts";

// UI bits based on https://github.com/stardustapp/graveyard/blob/9b3e7939dca4f49cca0f23f699b3910a2d1d8603/dust-server/src/daemon/gate-site.js

export function renderLoginPage(auth: AuthSystem, ctx: AuthRequestContext): Promise<Response> {
  console.log({
    oidc: auth.hasAuthnMethod('oidc'),
    cliCode: auth.hasAuthnMethod('cli-code'),
    passkey: auth.hasAuthnMethod('passkey'),
  })
  return html({
    headers: ctx.respHeaders,
    lang: "en",
    title: "Login",
    meta: {
      description: "Sign in to your account.",
    },
    links: [
      // { rel: "mask-icon", href: "/logo.svg", color: "#ffffff" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css?family=Roboto:300,400,500|Material+Icons" },
      { rel: "stylesheet", href: "style.css", media: "screen,projection" },
    ],
    scripts: [
      { src: "/-/runtime/auth-page.ts", async: true, type: 'module' },
    ],
    body: (<>
      <div class="modal-form" id="skeleton-form">
        <h1>sign in to <em>{auth.selfBaseUrl}</em></h1>
        <progress indeterminate style="width: 75%; margin: 2em auto;"></progress>
      </div>

      {auth.hasAuthnMethod('oidc') ? (
        <form id="oidc-form" method="post" action="/auth/login/oidc" style="display: none;">
          <input type="hidden" name="redirect_path" value={ctx.requestUrl.searchParams.get('redirect') ?? ''} />
        </form>
      ) : []}

      <form class="modal-form" id="auth-form" style="display: none;">
        <h1>sign in to <em>{auth.selfBaseUrl}</em></h1>

        {auth.hasAuthnMethod('cli-code') ? (<>
          <p>
            For local development, click the sign-in link from the server logs.
          </p>
          <hr />
        </>) : []}

        {auth.hasAuthnMethod('oidc') ? (<>
          <p>
            Select an identity provider:
          </p>
          <button form="oidc-form" type="submit" name="desired_issuer" value="https://login.dist.app">sign in with login.dist.app</button>
        </>) : []}

        {auth.hasAuthnMethod('passkey') ? (<>
          <p>
            This website uses modern passkeys to access your account instead of passwords.
            <br />If you already registered, you can use your passkey now:
          </p>
          <button id="signinButton" type="button">sign in with a passkey</button>

          <hr/>

          <p>
            Or you can select a username to create a new account:
          </p>
          <div class="row">
            <input type="text" name="username" placeholder="username" required style="width: 10em; text-align: right;" />
            <label for="username">@{new URL(auth.selfBaseUrl).hostname}</label>
          </div>
          {/*
          <div class="row">
            <label for="email" style="flex: 1; margin: 0 1.5em; text-align: left;">your email:</label>
            <input type="email" name="email" required placeholder="(private)" autocomplete="email" />
          </div>
          <div class="row">
            <label for="displayname" style="flex: 1; margin: 0 1.5em; text-align: left;">display name:</label>
            <input type="text" name="displayname" required placeholder="John Smith" autocomplete="name" />
          </div>
          */}
          <button type="submit">register now</button>
        </>) : []}
      </form>

      <div class="fill"></div>

      <footer>
        {"powered by dist.app, built by "}
        <a href="https://danopia.net">danopia</a>
      </footer>
    </>),
  });
}
