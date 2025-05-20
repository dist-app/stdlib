/** @jsxRuntime automatic *//** @jsxImportSource @hono/hono/jsx */

import type { UserEntity } from '../../api/entities.ts';
import type { AuthRequestContext, AuthSystem, SettingsTab } from "../../types.ts";

export const ForeignIdentityTab: SettingsTab = {
  slug: 'foreign-identity',
  label: 'foreign identity',
  sortIdx: 20,
  eligable(auth: AuthSystem, ctx: AuthRequestContext, user: UserEntity) {
    return !!user.spec.foreignIdentity;
  },
  render(auth: AuthSystem, ctx: AuthRequestContext, user: UserEntity) {
    const roles = auth.getRolesForUser(user);
    const identity = user.spec.foreignIdentity;
    if (!identity) throw new Error(`unexpected user spec`);
    return (<>
      <h2>foreign identity</h2>
      <p>
        You logged in via another website.
        If you would like to switch users, you can sign out.
      </p>
      <div class="row">
        <label for="issuer" style="flex: 1; margin: 0 1.5em; text-align: left;">issuer:</label>
        <input type="text" style="flex: 2; width: 0;" name="issuer" readonly value={identity.issuer} />
      </div>
      <div class="row">
        <label for="subject" style="flex: 1; margin: 0 1.5em; text-align: left;">subject:</label>
        <input type="text" style="flex: 2; width: 0;" name="subject" readonly value={identity.subject} />
      </div>
      <div class="row">
        <label for="username" style="flex: 1; margin: 0 1.5em; text-align: left;">
          <span style="font-size: 0.7em;">local unique ID:</span>
        </label>
        <input type="text" style="flex: 2; width: 0; font-size: 0.7em; margin-right: 1.85em;" name="uid" disabled value={user.metadata.uid} />
      </div>
      <button type="submit" formaction="signout">
        sign out now
      </button>
    </>);
  },
};
