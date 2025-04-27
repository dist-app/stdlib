/** @jsx jsx *//** @jsxImportSource jsr:@hono/hono@4.7.7/jsx *//** @jsxFrag Fragment */

import type { UserEntity } from '../../api/entities.ts';
import type { AuthRequestContext, AuthSystem, SettingsTab } from "../../types.ts";

export const ProfileTab: SettingsTab = {
  slug: 'profile',
  label: 'profile',
  sortIdx: 10,
  eligable(auth: AuthSystem, ctx: AuthRequestContext, user: UserEntity) {
    // if (!auth.hasAuthnMethod('cookie')) return false;
    // return !!ctx.cookies['DistAppUserSession'];
    // TODO: when?
    return true;
  },
  render(auth: AuthSystem, ctx: AuthRequestContext, user: UserEntity) {

    return (<>
      <h1>your <em>{auth.selfBaseUrl}</em> profile</h1>
      {!user.spec.profile.contactEmail ? (
        <p>
          <strong style="font-weight: 500;">Your registration is not yet complete.</strong>
          To keep your username, provide an email address (for verification only) and a display name.
          You can change your display name later on.
        </p>
      ) : []}
      <div class="row">
        <label for="username" style="flex: 1; margin: 0 1.5em; text-align: left;">username:</label>
        <input type="text" style="flex: 2; width: 0;" name="username" disabled autocomplete="username" value={user.metadata.name} />
      </div>
      <div class="row">
        <label for="email" style="flex: 1; margin: 0 1.5em; text-align: left;">your email:</label>
        <input type="email" style="flex: 2; width: 0;" name="email" required placeholder="(private)" autocomplete="email" value={user.spec.profile.contactEmail ?? ''} />
      </div>
      <div class="row">
        <label for="displayname" style="flex: 1; margin: 0 1.5em; text-align: left;">display name:</label>
        <input type="text" style="flex: 2; width: 0;" name="displayname" required placeholder="John Smith" autocomplete="name" value={user.spec.profile.displayName ?? ''} />
      </div>
      <div class="row">
        <label for="username" style="flex: 1; margin: 0 1.5em; text-align: left;">
          <span style="font-size: 0.7em;">unique ID:</span>
        </label>
        <input type="text" style="flex: 2; width: 0; font-size: 0.7em; margin-right: 1.85em;" name="uid" disabled value={user.metadata.uid} />
      </div>
      <button type="submit">
        {user.spec.profile.contactEmail ? 'update profile' : 'create profile'}
      </button>
    </>);
  }
};
