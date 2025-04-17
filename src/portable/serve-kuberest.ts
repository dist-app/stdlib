import type { EntityEngine } from "./engine.ts";

export async function serveKuberestApis(
  req: Request,
  url: {pathname: string, search: string},
  engine: EntityEngine,
): Promise<Response> {

  if (req.method == 'GET' && url.pathname == 'apis/') {
    console.log(engine.apiImpls)
    return Response.json({
      "kind":"APIGroupList",
      "apiVersion":"v1",
      "groups": [...engine.apiImpls.values()].map(apiImpl => ({
        "name": apiImpl.definition.name.split('/')[0],
        "versions": Object.values(Object.values(apiImpl.definition.kinds)[0].spec.versions).map(version => ({
          "groupVersion": `${apiImpl.definition.name.split('/')[0]}/${version.name}`,
          "version": version.name,
        })),
        "preferredVersion": {
          "groupVersion": apiImpl.definition.name,
          "version": apiImpl.definition.name.split('/')[1],
        },
      })),
    });
  }

  const apiVersionMatch = new URLPattern({
    pathname: 'apis/:apiName/:apiVersion',
  }).exec(url);
  if (apiVersionMatch) {
    const {
      apiName,
      apiVersion,
    } = apiVersionMatch.pathname.groups as Record<string,string>;
    const apiDef = engine.apiImpls.get(apiName);
    if (!apiDef) return new Response(null, {status: 404});

    if (req.method == 'GET') {
      const kinds = Object.values(apiDef.definition.kinds).filter(x => x.spec.versions.some(y => y.name == apiVersion));
      if (kinds.length == 0) return new Response(null, {status: 404});
      return Response.json({
        "kind":"APIResourceList",
        "apiVersion":"v1",
        "groupVersion":`${apiName}/${apiVersion}`,
        "resources": kinds.map(kind => ({
          "name": kind.spec.names.plural,
          "singularName":kind.spec.names.singular,
          "kind":kind.spec.names.kind,
          "namespaced":false,
          "verbs":["delete","deletecollection","get","list","patch","create","update","watch"],
          // "shortNames":["bc"],
          // "storageVersionHash":"WSy+cRyoJfU=",
        })),
        // {"name":"buildconfigs","singularName":"buildconfig","namespaced":true,"kind":"BuildConfig","verbs":["delete","deletecollection","get","list","patch","create","update","watch"],"shortNames":["bc"],"storageVersionHash":"WSy+cRyoJfU="},
        // {"name":"buildconfigs/status","singularName":"","namespaced":true,"kind":"BuildConfig","verbs":["get","patch","update"]},
      });
    }
    return new Response('sober up and impl this', {status: 420});
  }

  const collectionMatch = new URLPattern({
    pathname: 'apis/:apiName/:apiVersion/:kindPlural',
  }).exec(url);
  if (collectionMatch) {
    const {
      apiName,
      apiVersion,
      kindPlural,
    } = collectionMatch.pathname.groups as Record<string,string>;
    // console.log(req.method, collectionMatch.pathname.groups);
    const apiDef = engine.apiImpls.get(apiName);
    if (!apiDef) return new Response(null, {status: 404});
    const kindDef = Object.values(apiDef.definition.kinds).find(x => x.spec.names.plural == kindPlural);
    if (!kindDef) return new Response(null, {status: 404});
    const versionDef = Object.values(kindDef.spec.versions).find(x => x.name == apiVersion);
    if (!versionDef) return new Response(null, {status: 404});

    if (req.method == 'GET') {
      const entities = await engine.listEntities(`${apiName}/${apiVersion}`, kindDef.spec.names.kind);
      return Response.json({
        "kind": `${kindDef.spec.names.kind}List`,
        "apiVersion": apiVersion,
        "metadata":{"resourceVersion":"95066441"},
        "items": entities,
      });
    }
    return new Response('sober up and impl this', {status: 420});
  }

  return new Response(null, {status: 404});
}
