
import { SchemaApi } from "./schema/api-definition.ts";
import {
  type EntityHandle,
  type MutationOptions,
  type ApiKindEntity,
  type EntityStorage,
  type StreamEvent,
  type EntityApiDefinition,
  type EntityEngine,
  EntityKindEntity,
} from "./types.ts";

export class EntityEngineImpl implements EntityEngine {
  constructor(
    // primaryCatalog
  ) {
    this.addApi('schema.dist.app', new SchemaReflectionApiStorage(this), SchemaApi.definition);
  }

  apiImpls: Map<string, {
    storage: EntityStorage;
    definition: EntityApiDefinition;
  }> = new Map;

  addApi(apiName: string, storage: EntityStorage, definition: EntityApiDefinition) {
    if (this.apiImpls.has(apiName)) {
      throw new Error(`api ${apiName} already exists`);
    }
    // switch (opts.spec.layers) {

    // }
    this.apiImpls.set(apiName, {
      storage, // TODO: storages convey which datatypes they can store, other limitations thru a resuable EntityConverter
      definition: definition ?? {kinds: {}}, // TODO: throw instead of defaulting
    });
  }

  private selectNamespaceLayer<T extends ApiKindEntity>(props: {
    apiVersion: T["apiVersion"];
  }) {
    const apiName = props.apiVersion.split('/')[0];
    const ns = this.apiImpls.get(apiName);
    if (!ns)
      throw new Error(
        `No namespace found for ${apiName}`);
    return ns;
  }

  async insertEntity<T extends ApiKindEntity>(entity: T): Promise<EntityHandle<T>> {
    const layer = this.selectNamespaceLayer({
      apiVersion: entity.apiVersion,
    });
    const definition = layer.definition.kinds[entity.kind];
    if (!definition) console.error(`WARN: lacking definitions for ${entity.apiVersion} ${entity.kind}`);
    // TODO: get resulting entity and return an EntitySnapshot
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
  ): EntityHandle<T> {
    return new EngineEntityHandle<T>(this, {
      apiVersion, apiKind,
      name,
    });
  }

  async updateEntity<T extends ApiKindEntity>(newEntity: T): Promise<void> {
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
  ): Promise<void> {
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
            throw new Error(`TODO: Mutation failed: ${(err as Error).message}`);
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

  async deleteEntity<T extends ApiKindEntity>(
    apiVersion: T["apiVersion"],
    kind: T["kind"],
    name: string
  ): Promise<boolean> {
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
}


export class EngineEntityHandle<Tself extends ApiKindEntity> implements EntityHandle<Tself> {
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

  async get(): Promise<Tself | null> {
    return await this.engine.getEntity<Tself>(
      this.coords.apiVersion, this.coords.apiKind,
      this.coords.name);
  }

  async insert(
    entity: Omit<Tself, 'apiVersion' | 'kind'> & {metadata?: {name?: undefined}},
  ): Promise<void> {
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
  ): Promise<EntityHandle<Tother> | null>  {
    await this.engine.insertEntity<Tother>({
      ...neighbor,
    });

    return this.getNeighborHandle<Tother>(
      neighbor.apiVersion, neighbor.kind,
      neighbor.metadata.name);
  }

  async mutate(mutationCb: MutationOptions<Tself>): Promise<void> {
    return await this.engine.mutateEntity<Tself>(
      this.coords.apiVersion, this.coords.apiKind,
      this.coords.name,
      mutationCb);
  }

  async delete(): Promise<boolean> {
    return await this.engine.deleteEntity<Tself>(
      this.coords.apiVersion, this.coords.apiKind,
      this.coords.name);
  }

  async followOwnerReference<Towner extends ApiKindEntity>(
    apiVersion: Towner["apiVersion"],
    apiKind: Towner["kind"],
  ): Promise<EntityHandle<Towner> | null>  {
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
