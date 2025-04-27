/** @jsx h */
/** @jsxFrag Fragment */
import html, { h, Fragment } from "https://deno.land/x/htm@0.2.1/mod.ts";

import { UserEntity } from '../api/entities.ts';

import { AuthRequestContext, AuthSystem } from "../types.ts";

export async function renderSettingsPage(auth: AuthSystem, ctx: AuthRequestContext, user: UserEntity, pageSlug: string) {

  const pages = auth.gatherSettingsTabs(ctx, user);
  const page = pages.find(x => x.slug == pageSlug);

  if (!page) {
    return new Response('', {status: 404});
  }

  return html({
    headers: ctx.respHeaders,
    lang: "en",
    title: "Settings",
    meta: {
      description: `Your Settings on ${auth.selfBaseUrl}`,
    },
    links: [
      // { rel: "mask-icon", href: "/logo.svg", color: "#ffffff" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css?family=Roboto:300,400,500|Material+Icons" },
      { rel: "stylesheet", href: "style.css", media: "screen,projection" },
    ],
    scripts: [
      { src: "/-/runtime/auth-onboarding.ts", async: true, type: 'module' },
    ],
    body: (<>
      <form class="modal-form" id={`${pageSlug}-form`} method="post">

        <ul class="modal-form-tabstrip">
          {pages.map(page => (
            <li><a href={page.slug} class={pageSlug == page.slug ? 'active' : null}>{page.label}</a></li>
          ))}
        </ul>

        {await page.render(auth, ctx, user)}
      </form>

      <div class="fill"></div>

      <footer>
        {"powered by dist.app, built by "}
        <a href="https://danopia.net">danopia</a>
      </footer>
    </>),
  });
}
