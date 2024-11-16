// import { Meteor } from "meteor/meteor";
// import { ApiKindEntity, NamespaceEntity } from "../entities/core";
// import { Log } from "../lib/logging";
// import { ReactiveMap } from "../lib/reactive-map";
// import { LogicTracer } from "../lib/tracing";
// // import { AsyncCache, AsyncKeyedCache } from "../runtime/async-cache";
// import { ShellSession } from "../runtime/ShellSession";
// import { MongoEntityStorage, MongoProfileStorage, StaticEntityStorage } from "./EntityStorage";
// import { LayeredNamespace } from "./next-gen";


// not sure if this is enough
// export interface ApiKindEntity extends Record<string,unknown> {
//   apiVersion: string;
//   kind: string;
//   metadata: {
//     name: string;
//   } & Record<string,unknown>;
// }

import { KvEntityStorage } from "../../server-sdk/modules/storage-deno-kv/nonrealtime.ts";
import { EntityApiDefinition, SchemaApi, type EntityKindEntity } from "./schema/api-definition.ts";
import type { ApiKindEntity, EntityStorage, StreamEvent } from "./types.ts";

// import { EntityStorage, LayeredNamespace, NamespaceSpecWithImpl } from "../storage.ts";

export type MutationOptions<T extends ApiKindEntity> =
  | ((x: T) => void | symbol)
  | {
    mutationCb: (x: T) => void | symbol;
    creationCb: () => T;
  };

// interface EntityStorage {
//   // TODO: add some sort of API for 'submissions' (either entity spec/status or fetch request/response)
//   insertEntity<T extends ApiKindEntity>(entity: T): Promise<void>;
//   listAllEntities(): Promise<ApiKindEntity[]>;
//   listEntities<T extends ApiKindEntity>(apiVersion: T["apiVersion"], kind: T["kind"]): Promise<T[]>;
//   // watchEntities<T extends ApiKindEntity>(apiVersion: T["apiVersion"], kind: T["kind"]);
//   getEntity<T extends ApiKindEntity>(apiVersion: T["apiVersion"], kind: T["kind"], name: string): Promise<T | null>;
//   updateEntity<T extends ApiKindEntity>(newEntity: T): Promise<void>;
//   deleteEntity<T extends ApiKindEntity>(apiVersion: T["apiVersion"], kind: T["kind"], name: string): Promise<boolean>;
// }


// class KvEntityLayer

// type ApiFilter<T extends ApiKindEntity> = {
//   apiVersion: T["apiVersion"];
//   kind: T["kind"];
//   namespace?: string;
//   op: 'Read' | 'Write';
// };

// const tracer = new LogicTracer({
//   name: 'dist.app/entity-engine',
//   requireParent: true,
// });

// function loadFunc(this: EntityEngine, input: ApiKindEntity, key: string) {
//   if (input.apiVersion == 'runtime.dist.app/v1alpha1') {
//     // if (input.kind == 'ForeignNamespace') {
//     //   // return new
//     // }
//     if (input.kind == 'Workspace') {
//       return new ShellSession(this, input.metadata.namespace ?? 'bug', input.metadata.name);
//     }
//     if (input.kind == 'Activity') {
//       throw new Error(`TODO: activity class`)
//     }
//   }
//   throw new Error('TODO: loadFunc for '+key);
// }

export class EntityEngine {
  constructor(
    // primaryCatalog
  ) {
    this.addApi('schema.dist.app', new SchemaReflectionApiStorage(this), SchemaApi.definition);
  }

  apiImpls = new Map<string, {
    storage: EntityStorage;
    definition: EntityApiDefinition;
  }>();
  // loadedMap = new Map<string, ShellSession>();
  // loader = new AsyncKeyedCache<ApiKindEntity, string, | ShellSession>({
  //   keyFunc: x => [x.metadata.namespace, x.apiVersion, x.kind, x.metadata.name].join('_'),
  //   loadFunc: async (input, key) => {
  //     if (input.apiVersion == 'runtime.dist.app/v1alpha1') {
  //       if (input.kind == 'ForeignNamespace') {
  //         // return new
  //       }
  //       if (input.kind == 'Workspace') {
  //         return new ShellSession(this, input.metadata.namespace ?? 'bug', input.metadata.name);
  //       }
  //     }
  //     throw new Error('TODO: loadFunc for '+key);
  //   },
  // })

  addApi(apiName: string, storage: EntityStorage, definition: EntityApiDefinition) {
    if (this.apiImpls.has(apiName)) {
      throw new Error(`api ${apiName} already exists`);
    }
    // switch (opts.spec.layers) {

    // }
    this.apiImpls.set(apiName, {
      storage, // TODO: storages convey which datatypes they can store, other limitations thru a resuable EntityConverter
      definition: definition ?? {}, // TODO: is defaulting still needed?
    });
  }

  selectNamespaceLayer<T extends ApiKindEntity>(props: {
    apiVersion: T["apiVersion"];
  }) {
    const apiName = props.apiVersion.split('/')[0];
    const ns = this.apiImpls.get(apiName);
    if (!ns)
      throw new Error(
        `No namespace found for ${apiName}`);
    return ns;
  }

  async insertEntity<T extends ApiKindEntity>(entity: T) {
    const layer = this.selectNamespaceLayer({
      apiVersion: entity.apiVersion,
    });
    const definition = layer.definition.kinds[entity.kind];
    if (!definition) console.error(`WARN: lacking definitions for ${entity.apiVersion} ${entity.kind}`);
    await layer?.storage.insertEntity<T>(definition, entity);
    return this.getEntityHandle<T>(
      entity.apiVersion, entity.kind,
      entity.metadata.name);
  }

  async listEntities<T extends ApiKindEntity>(
    apiVersion: T["apiVersion"],
    kind: T["kind"],
  ): Promise<T[]> {
    const layer = this.selectNamespaceLayer({
      apiVersion: apiVersion,
    });
    const definition = layer.definition.kinds[kind];
    if (!definition) console.error(`WARN: lacking definitions for ${apiVersion} ${kind}`);
    const list = await layer.storage.listEntities<T>(definition, apiVersion, kind);
    return list;
  }

  async listEntityHandles<T extends ApiKindEntity>(
    apiVersion: T["apiVersion"],
    kind: T["kind"],
  ): Promise<EntityHandle<T>[]> {
    const layer = this.selectNamespaceLayer({
      apiVersion: apiVersion,
    });
    const definition = layer.definition.kinds[kind];
    if (!definition) console.error(`WARN: lacking definitions for ${apiVersion} ${kind}`);
    const list = await layer.storage.listEntities<T>(definition, apiVersion, kind);
    return list.map(snapshot => {
      const handle = this.getEntityHandle<T>(apiVersion, kind, snapshot.metadata.name);
      handle.snapshot = snapshot;
      return handle;
    });
  }

  observeEntities<T extends ApiKindEntity>(
    apiVersion: T["apiVersion"],
    kind: T["kind"],
    opts: {
      signal: AbortSignal;
      // filterCb?: (entity: T) => boolean;
    },
  ): ReadableStream<StreamEvent<T>> {
    const layer = this.selectNamespaceLayer({
      apiVersion: apiVersion,
    });
    const definition = layer.definition.kinds[kind];
    if (!definition) console.error(`WARN: lacking definitions for ${apiVersion} ${kind}`);
    return layer.storage.observeEntities(definition, apiVersion, kind, opts.signal);
  }

  async getEntity<T extends ApiKindEntity>(
    apiVersion: T["apiVersion"],
    kind: T["kind"],
    name: string
  ): Promise<T | null> {
    // return tracer.syncSpan('engine getEntity', {
    //   attributes: {
    //     'distapp.entity.api_version': apiVersion,
    //     'distapp.entity.kind': kind,
    //     'distapp.entity.namespace': namespace,
    //     'distapp.entity.name': name,
    //   },
    // }, () => {
      const layer = this.selectNamespaceLayer({
        apiVersion: apiVersion,
      });
      if (!layer) return null;
      const definition = layer.definition.kinds[kind];
      if (!definition) console.error(`WARN: lacking definitions for ${apiVersion} ${kind}`);
      const entity = await layer.storage.getEntity(definition, apiVersion, kind, name)
      if (!entity) return null;
      return entity;
    // });
  }

  getEntityHandle<T extends ApiKindEntity>(
    apiVersion: T["apiVersion"],
    apiKind: T["kind"],
    name: string
  ) {
    return new EntityHandle<T>(this, {
      apiVersion, apiKind,
      name,
    });
  }

  async updateEntity<T extends ApiKindEntity>(newEntity: T) {
    // return tracer.asyncSpan('engine updateEntity', {
    //   attributes: {
    //     'distapp.entity.api_version': newEntity.apiVersion,
    //     'distapp.entity.kind': newEntity.kind,
    //     'distapp.entity.namespace': newEntity.metadata.namespace,
    //     'distapp.entity.name': newEntity.metadata.name,
    //   },
    // }, async () => {
      const layer = this.selectNamespaceLayer({
        apiVersion: newEntity.apiVersion,
      });
      const definition = layer.definition.kinds[newEntity.kind];
      if (!definition) console.error(`WARN: lacking definitions for ${newEntity.apiVersion} ${newEntity.kind}`);
      await layer.storage.updateEntity(definition, newEntity);
      // const count = await layer.impl.updateEntity(newEntity);
      // if (!count)
      //   throw new Error(`TODO: Update applied to zero entities`);
    // });
  }

  // Mutation helper
  async mutateEntity<T extends ApiKindEntity>(
    apiVersion: T["apiVersion"],
    kind: T["kind"],
    name: string,
    mutation: MutationOptions<T>,
  ) {
    const mutationCb = typeof mutation == 'function' ? mutation : mutation.mutationCb;
    const creationCb = typeof mutation == 'function' ? null : mutation.creationCb;
    // return tracer.asyncSpan('engine mutateEntity', {
    //   attributes: {
    //     'distapp.entity.api_version': apiVersion,
    //     'distapp.entity.kind': kind,
    //     'distapp.entity.namespace': namespace,
    //     'distapp.entity.name': name,
    //   },
    // }, async span => {
      const layer = this.selectNamespaceLayer({
        apiVersion,
      });
      const definition = layer.definition.kinds[kind];
      if (!definition) console.error(`WARN: lacking definitions for ${apiVersion} ${kind}`);

      let entity = await layer.storage.getEntity(definition, apiVersion, kind, name);
      if (!entity) {
        if (creationCb) {
          await layer.storage.insertEntity(definition, creationCb());
          return;
        } else {
          throw new Error(`Entity doesn't exist`);
        }
      }

      for (let i = 0; i <= 3; i++) {
        if (i > 0) {
          console.warn(`Retrying mutation on ${entity.kind}/${entity.metadata.name} (#${i})`);
        }

        const result = mutationCb(entity);
        if (result == Symbol.for('no-op'))
          return;

        // TODO: retry this if we raced someone else
        try {
          await layer.storage.updateEntity(definition, entity);
          return;
        } catch (err: unknown) {
          // TODO: hook back up when ddp client has proper errors
          console.log('catching mutate err', JSON.stringify(err), err);
          // if (err instanceof Meteor.Error && err.error == 'no-update') {
          //   const richDetailsTODO = err.details as undefined | string | {latestVersion: T};
          //   if (richDetailsTODO && typeof richDetailsTODO !== 'string' && richDetailsTODO.latestVersion) {
          //     entity = richDetailsTODO.latestVersion;
          //     continue;
          //   }
          // } else {
            throw new Error(`Mutation failed: ${(err as Error).message}`);
          // }
        }

        entity = await layer.storage.getEntity(definition, apiVersion, kind, name);
        if (!entity)
          throw new Error(`Entity doesn't exist (anymore)`);
        continue;
      }
      throw new Error(`Ran out of retries for mutation. [no-mutate]`);
      // throw new Meteor.Error('no-mutate', `Ran out of retries for mutation.`);
    // });
  }

  // // Mutation helper
  // async upsertEntity<T extends ApiKindEntity>(
  //   apiVersion: T["apiVersion"],
  //   kind: T["kind"],
  //   name: string,
  //   upsertCb: (x: T | null) => T | symbol
  // ) {
  //   // return tracer.asyncSpan('engine mutateEntity', {
  //   //   attributes: {
  //   //     'distapp.entity.api_version': apiVersion,
  //   //     'distapp.entity.kind': kind,
  //   //     'distapp.entity.namespace': namespace,
  //   //     'distapp.entity.name': name,
  //   //   },
  //   // }, async span => {
  //     const layer = this.selectNamespaceLayer({
  //       apiVersion,
  //     });

  //     for (let i = 0; i <= 3; i++) {
  //       if (i > 0) {
  //         console.warn(`Retrying mutation on ${kind}/${name} (#${i})`);
  //       }

  //       let entity = await layer.getEntity(apiVersion, kind, name);

  //       const result = upsertCb(entity);
  //       if (result == Symbol.for('no-op'))
  //         return;

  //       // TODO: retry this if we raced someone else
  //       try {
  //         if (entity) {
  //           await layer.updateEntity(res);
  //         } else {
  //           await layer.insertEntity(entity);
  //         }
  //         return;
  //       } catch (err) {
  //         // TODO: hook back up when ddp client has proper errors
  //         console.log('catching mutate err', JSON.stringify(err), err);
  //         // if (err instanceof Meteor.Error && err.error == 'no-update') {
  //         //   const richDetailsTODO = err.details as undefined | string | {latestVersion: T};
  //         //   if (richDetailsTODO && typeof richDetailsTODO !== 'string' && richDetailsTODO.latestVersion) {
  //         //     entity = richDetailsTODO.latestVersion;
  //         //     continue;
  //         //   }
  //         // } else {
  //           throw new Error(`Mutation failed: ${err.message}`);
  //         // }
  //       }

  //       entity = await layer.getEntity(apiVersion, kind, name);
  //       if (!entity)
  //         throw new Error(`Entity doesn't exist (anymore)`);
  //       continue;
  //     }
  //     throw new Error(`Ran out of retries for mutation. [no-mutate]`);
  //     // throw new Meteor.Error('no-mutate', `Ran out of retries for mutation.`);
  //   // });
  // }

  async deleteEntity<T extends ApiKindEntity>(
    apiVersion: T["apiVersion"],
    kind: T["kind"],
    name: string
  ) {
    // return tracer.asyncSpan('engine deleteEntity', {
    //   attributes: {
    //     'distapp.entity.api_version': apiVersion,
    //     'distapp.entity.kind': kind,
    //     'distapp.entity.namespace': namespace,
    //     'distapp.entity.name': name,
    //   },
    // }, async () => {
      const layer = this.selectNamespaceLayer({
        apiVersion,
      });
      const definition = layer.definition.kinds[kind];
      if (!definition) console.error(`WARN: lacking definitions for ${apiVersion} ${kind}`);
      return await layer.storage.deleteEntity(definition, apiVersion, kind, name);
    // });
  }



  // useRemoteNamespace(appUri: string) {
  //   // const [loadedNs, setLoadedNs] = useState<string|false>(false);

  //   const appUrl = new URL(appUri);

  //   if (appUrl.protocol == 'bundled:') {

  //     // TODO: the fixed namespace sucks!
  //     const bundledName = decodeURIComponent(appUrl.pathname);
  //     if (this.namespaces.has(bundledName)) return bundledName;

  //     this.addNamespace({
  //       name: bundledName,
  //       spec: {
  //         layers: [{
  //           mode: 'ReadOnly',
  //           accept: [{
  //             apiGroup: 'manifest.dist.app',
  //           }],
  //           storage: {
  //             type: 'bundled',
  //             bundleId: bundledName,
  //           },
  //         }],
  //       }});
  //     return bundledName;
  //   }
  //   // console.log('p', appUrl.protocol)

  //   throw new Error("Function not implemented.");
  // }


  // async findAllEntities<T extends ApiKindEntity>(
  //   apiVersion: T["apiVersion"],
  //   kind: T["kind"],
  // ) {
  //   // Find places where we can find the type of entity
  //   const namespaces = Array
  //     .from(this
  //       .getNamespacesServingApi({
  //         apiVersion, kind,
  //         op: 'Read',
  //       })
  //       .keys());

  //   // Collect all of the entities
  //   return await Promise.all(namespaces
  //     .flatMap(x => this
  //       .listEntities<T>(apiVersion, kind, x)
  //       .then(list => list
  //         .map(entity => ({ ns: x, entity })))));
  // }

}


export class EntityHandle<Tself extends ApiKindEntity> {
  constructor(
    private readonly engine: EntityEngine,
    public readonly coords: {
      apiVersion: Tself["apiVersion"],
      apiKind: Tself["kind"],
      name: string;
    },
  ) {
    // this.snapshot = engine.getEntity<Tself>(coords.apiVersion, coords.apiKind, coords.namespace, coords.name);
  }
  snapshot: Tself | null = null;

  getNeighborHandle<Tother extends ApiKindEntity>(
    apiVersion: Tother["apiVersion"],
    apiKind: Tother["kind"],
    name: string,
  ): EntityHandle<Tother> {
    return this.engine.getEntityHandle<Tother>(
      apiVersion, apiKind,
      name);
  }

  async get() {
    return await this.engine.getEntity<Tself>(
      this.coords.apiVersion, this.coords.apiKind,
      this.coords.name);
  }

  async insert(
    entity: Omit<Tself, 'apiVersion' | 'kind'> & {metadata?: {name?: undefined}},
  ) {
    await this.engine.insertEntity<Tself>({
      ...entity,
      apiVersion: this.coords.apiVersion,
      kind: this.coords.apiKind,
      metadata: {
        ...entity.metadata,
        name: this.coords.name,
      },
    } as Tself);
  }

  async insertNeighbor<Tother extends ApiKindEntity>(
    neighbor: Tother,
  ) {
    await this.engine.insertEntity<Tother>({
      ...neighbor,
    });

    return this.getNeighborHandle<Tother>(
      neighbor.apiVersion, neighbor.kind,
      neighbor.metadata.name);
  }

  async mutate(mutationCb: MutationOptions<Tself>) {
    return await this.engine.mutateEntity<Tself>(
      this.coords.apiVersion, this.coords.apiKind,
      this.coords.name,
      mutationCb);
  }

  async delete() {
    return await this.engine.deleteEntity<Tself>(
      this.coords.apiVersion, this.coords.apiKind,
      this.coords.name);
  }

  async followOwnerReference<Towner extends ApiKindEntity>(
    apiVersion: Towner["apiVersion"],
    apiKind: Towner["kind"],
  ) {
    const snapshot = await this.get();

    const ownerName = snapshot?.metadata.ownerReferences
      ?.find(x => x.apiVersion == apiVersion && x.kind == apiKind)?.name;
    if (!ownerName) return null;

    return this.engine.getEntityHandle<Towner>(apiVersion, apiKind, ownerName);
  }
}

class SchemaReflectionApiStorage implements EntityStorage {
  constructor(private readonly engine: EntityEngine) {}
  insertEntity<T extends ApiKindEntity>(definition: EntityKindEntity, entity: T): Promise<void> {
    throw new Error("Method insertEntity not implemented.");
  }
  listAllEntities(): Promise<ApiKindEntity[]> {
    return Promise.resolve([...this.engine.apiImpls.values()].flatMap(x => Object.values(x.definition.kinds)));
  }
  listEntities<T extends ApiKindEntity>(definition: EntityKindEntity, apiVersion: T["apiVersion"], kind: T["kind"]): Promise<T[]> {
    if (apiVersion == 'schema.dist.app/v1alpha1' && kind == 'EntityKind') {
      return Promise.resolve([...this.engine.apiImpls.values()].flatMap(x => Object.values(x.definition.kinds)) as unknown[] as T[]);
    }
    console.log('listEntities', {apiVersion, kind});
    throw new Error("Method listEntities not implemented.");
  }
  observeEntities<T extends ApiKindEntity>(definition: EntityKindEntity, apiVersion: T["apiVersion"], kind: T["kind"], signal: AbortSignal): ReadableStream<StreamEvent<T>> {
    throw new Error("Method observeEntities not implemented.");
  }
  getEntity<T extends ApiKindEntity>(definition: EntityKindEntity, apiVersion: T["apiVersion"], kind: T["kind"], name: string): Promise<T | null> {
    throw new Error("Method getEntity not implemented.");
  }
  updateEntity<T extends ApiKindEntity>(definition: EntityKindEntity, newEntity: T): Promise<void> {
    throw new Error("Method updateEntity not implemented.");
  }
  deleteEntity<T extends ApiKindEntity>(definition: EntityKindEntity, apiVersion: T["apiVersion"], kind: T["kind"], name: string): Promise<boolean> {
    throw new Error("Method deleteEntity not implemented.");
  }
}
