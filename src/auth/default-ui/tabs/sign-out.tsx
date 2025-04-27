/** @jsx jsx *//** @jsxImportSource jsr:@hono/hono@4.7.7/jsx *//** @jsxFrag Fragment */

import type { UserEntity } from '../../api/entities.ts';
import type { AuthRequestContext, AuthSystem, SettingsTab } from "../../types.ts";

export const SignOutTab: SettingsTab = {
  slug: 'sign-out',
  label: 'sign out',
  sortIdx: 100,
  eligable(auth: AuthSystem, ctx: AuthRequestContext, user: UserEntity) {
    if (!auth.hasAuthnMethod('cookie')) return false;
    return !!ctx.cookies['DistAppUserSession'];
  },
  render(auth: AuthSystem, ctx: AuthRequestContext, user: UserEntity) {

    let text = `Done for now?`;

    if (auth.hasAuthnMethod('passkey')) {
      // <strong style="font-weight: 500;">You need to add a passkey before you can log out.</strong>
      // Otherwise you wouldn't be able to access your account again!
      text = `You will need to use one of your passkeys when you'd like to sign back in to your account.`;
    }

    return (<>
      <p>
        {text}
      </p>
      <button type="submit" formaction="signout">
        sign out now
      </button>
    </>);
  }
};
