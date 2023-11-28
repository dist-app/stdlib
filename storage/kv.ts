import { EntityStorage, ApiKindEntity, StreamEvent } from "../portable/types.ts";

export class KvEntityStorage implements EntityStorage {
  constructor(
    private readonly kv: Deno.Kv,
    private readonly prefix: Deno.KvKey,
  ) {}
  observeEntities<T extends ApiKindEntity>(apiVersion: T["apiVersion"], kind: T["kind"], signal?: AbortSignal | undefined): ReadableStream<StreamEvent<T>> {
    throw new Error("TODO: Method not implemented.");
  }
  async insertEntity<T extends ApiKindEntity>(entity: T): Promise<void> {
    const coords = [...this.prefix, entity.apiVersion, entity.kind, entity.metadata.name];
    const result = await this.kv.atomic()
      .check({ key: coords, versionstamp: null })
      .set(coords, {
        ...entity,
        metadata: {
          ...entity.metadata,
          // namespace: undefined,
          creationTimestamp: new Date(),
          generation: 1,
          uid: crypto.randomUUID(),
        },
      })
      .commit();
    if (!result.ok) throw new Error('entity already exists');
  }
  async listAllEntities(): Promise<ApiKindEntity[]> {
    const entities = new Array<ApiKindEntity>;
    for await (const entry of this.kv.list({ prefix: [...this.prefix] })) {
      entities.push(entry.value as ApiKindEntity);
    }
    return entities;
  }
  async listEntities<T extends ApiKindEntity>(apiVersion: T["apiVersion"],kind: T["kind"]): Promise<T[]> {
    const entities = new Array<T>;
    const coords: string[] = [apiVersion, kind];
    for await (const entry of this.kv.list({ prefix: [...this.prefix, ...coords] })) {
      entities.push(entry.value as T);
    }
    return entities;
  }
  async getEntity<T extends ApiKindEntity>(apiVersion: T["apiVersion"],kind: T["kind"],name: string): Promise<T|null> {
    const coords: string[] = [apiVersion, kind, name];
    const entry = await this.kv.get([...this.prefix, ...coords]);
    if (entry.versionstamp) {
      return entry.value as T;
    }
    return null;
  }
  async updateEntity<T extends ApiKindEntity>(newEntity: T): Promise<void> {
    const coords = [...this.prefix, newEntity.apiVersion, newEntity.kind, newEntity.metadata.name];
    const prev = await this.kv.get(coords);
    const prevEntity = prev.value as ApiKindEntity | null;
    if (!prevEntity) throw new Error(`doc didn't exist`);
    if (prevEntity.metadata.generation !== newEntity.metadata.generation) {
      throw new Error(`doc is out of date`);
    }
    const result = await this.kv.atomic()
      .check({ key: coords, versionstamp: prev.versionstamp })
      .set(coords, {
        ...newEntity,
        metadata: {
          ...newEntity.metadata,
          // namespace: undefined,
          creationTimestamp: prevEntity.metadata.creationTimestamp,
          generation: (prevEntity.metadata.generation ?? 0) + 1,
          uid: prevEntity.metadata.uid,
        },
      })
      .commit();
    if (!result.ok) throw new Error('sorry, you lost the update race');
  }
  async deleteEntity<T extends ApiKindEntity>(apiVersion: T["apiVersion"],kind: T["kind"],name: string): Promise<boolean> {
    const coords = [...this.prefix, apiVersion, kind, name];
    const prev = await this.kv.get(coords);
    if (!prev) throw new Error(`doc didn't exist`);
    // if (prev.value?.metadata.generation !== entity.metadata.generation) {
    //   throw new Error(`doc is out of date`);
    // }
    const result = await this.kv.atomic()
      .check({ key: coords, versionstamp: prev.versionstamp })
      .delete(coords)
      .commit();
    return result.ok;
  }
}
