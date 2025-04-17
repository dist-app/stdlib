import { LoginServerApi } from "../../../apis/login-server/definitions.ts";
import { AuthSystem, AuthRpcHandler } from "../types.ts";

export function listUiRpcs(auth: AuthSystem): Record<string, AuthRpcHandler> {
  const api = new LoginServerApi(auth.index);
  return {

    'takeUsername': async (ctx, existingUser, {username}) => {
      if (typeof username !== 'string') throw new Error(`username not a string`);
      if (existingUser) throw new Error(`cannot sign up, already logged in`);

      const hUser = await api.createUser({
        metadata: {
          name: username,
        },
        spec: {
          lifecycle: 'Pending',
          profile: {},
        },
      });

      const user = await hUser.get();
      if (!user?.metadata.uid) throw new Error(`BUG: read-after-write missed`);

      console.log(`Username ${user.metadata.name} has been reserved.`);
      await auth.loginAs(ctx, user);

      return {
        serverOrigin: auth.selfBaseUrl,
        userName: username,
        userId: user.metadata.uid,
        // bearerToken,
        // expiresAt,
      };
    },

    'userRead': async (_ctx, user, _props) => {
      if (!user) throw new Error(`Not already logged in`);
      // const user = await resolveBearerToken(localIndex, userName, bearerToken).then(x => x.snapshot!);

      // TODO: not our responsibility
      const hPasskeyList = await api
        .listPasskeyAssociations()
        .then(x => x
          .filter(y => y.spec.userName == user.metadata.name));

      return {
        email: user.spec.profile.contactEmail ?? null,
        displayname: user.spec.profile.displayName ?? null,
        passkeys: hPasskeyList.map(x => x.snapshot),
      };
    },

    'writeProfile': async (_ctx, user, {email, displayname}) => {
      if (!user) throw new Error(`Not already logged in`);
      // const hUser = await resolveBearerToken(localIndex, userName, bearerToken);

      if (typeof email !== 'string') throw new Error(`email is required`);
      if (typeof displayname !== 'string') throw new Error(`displayname is required`);

      await api.mutateUser(user.metadata.name, x => {
        x.spec.profile.contactEmail = email;
        x.spec.profile.displayName = displayname;
      });

      return {ok: true};
    },
  };
}
