/** @jsx h */
/** @jsxFrag Fragment */
import { h, Fragment } from "https://deno.land/x/htm@0.2.1/mod.ts";

import type { UserEntity, UserSessionEntity } from '../../api/entities.ts';
import type { AuthRequestContext, AuthSystem, SettingsTab } from "../../types.ts";

export const SessionsTab: SettingsTab = {
  slug: 'sessions',
  label: 'sessions',
  sortIdx: 80,
  eligable(auth: AuthSystem, ctx: AuthRequestContext, user: UserEntity) {
    if (!auth.hasAuthnMethod('cookie')) return false;
    if (!user.spec.profile.contactEmail) return false;
    return true;
  },
  async render(auth: AuthSystem, ctx: AuthRequestContext, user: UserEntity) {
    // TODO: scalability
    const allSessions = await auth.index
      .listEntities<UserSessionEntity>(
        'login-server.dist.app/v1alpha1', 'UserSession')
      .then(x => x
        .filter(y => y.spec.userName == user.metadata.name));

    return (<>
      <h2>your valid sessions</h2>
      <ul style="list-style: none; padding: 0.5em 1.3em; margin: 0;">
        {allSessions.map(x => (
          <li style="display: flex; background-color: #e8e8e8; padding: 0.5em 1em; margin: 0.5em 0; align-items: center; gap: 1em;">
            {/*
            <div style="background-color: #ddd; display: flex; width: 4em; height: 4em; align-items: center; justify-content: center;">
              <img src={aaguid?.icon_light ?? defaultIcon} style="width: 3em;" />
            </div>
            */}
            <div style="flex: 1; text-align: left;">
              <div style="margin-bottom: 0.4em;">
                Browser Session
                {/* {x.metadata.name == userSession.metadata.name ? (
                  <span style="border: 1px solid gray; background-color: #cfc; border-radius: 15px; font-size: 0.8em; padding: 0.2em 0.5em; margin: 0 0.5em;">
                    Current Session
                  </span>
                  ) : []} */}
              </div>
              <div style="font-size: 0.7em; color: rgba(0,0,0,0.7);">
                <span>Expires {x.spec.expiresAfter?.toLocaleDateString([])}</span>
                <span style="margin: 0 1em; color: rgba(0,0,0,0.3);">|</span>
                <span>Since {x.metadata.creationTimestamp?.toLocaleDateString([])}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>);
  }
};
