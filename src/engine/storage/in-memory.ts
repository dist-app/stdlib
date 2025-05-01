import { type EntityStorage, type ApiKindEntity, type StreamEvent, type EntityKindEntity } from "../types.ts";

export class InMemoryEntityStorage implements EntityStorage {
  constructor() {}
  private readonly entities = new Array<ApiKindEntity>;
  observeEntities<T extends ApiKindEntity>(definition: EntityKindEntity, apiVersion: T["apiVersion"], kind: T["kind"], signal?: AbortSignal | undefined): ReadableStream<StreamEvent<T>> {
    throw new Error("TODO: Method not implemented.");
  }
  async listEntities<T extends ApiKindEntity>(definition: EntityKindEntity, apiVersion: T["apiVersion"], kind: T["kind"]): Promise<T[]> {
    return this.entities.filter(x =>
      x.apiVersion == apiVersion && x.kind == kind) as T[];
  }
  async getEntity<T extends ApiKindEntity>(definition: EntityKindEntity, apiVersion: T["apiVersion"], kind: T["kind"], name: string): Promise<T | null> {
    return this.entities.find(x =>
      x.apiVersion == apiVersion && x.kind == kind && x.metadata.name == name) as T;
  }
  async insertEntity<T extends ApiKindEntity>(definition: EntityKindEntity, entity: T): Promise<void> {
    const exists = await this.getEntity(definition, entity.apiVersion, entity.kind, entity.metadata.name);
    if (exists) throw new Error(`Entity already exists`);
    // TODO: schema check?
    this.entities.push(structuredClone(entity));
  }
  async updateEntity<T extends ApiKindEntity>(definition: EntityKindEntity, newEntity: T): Promise<void> {
    const exists = await this.getEntity(definition, newEntity.apiVersion, newEntity.kind, newEntity.metadata.name);
    if (!exists) throw new Error(`Entity doesn't exist`);
    // TODO: schema check?
    this.entities.splice(this.entities.indexOf(exists), 1, structuredClone(newEntity));
  }
  async deleteEntity<T extends ApiKindEntity>(definition: EntityKindEntity, apiVersion: T["apiVersion"], kind: T["kind"], name: string): Promise<boolean> {
    const exists = await this.getEntity(definition, apiVersion, kind, name);
    if (!exists) throw new Error(`Entity doesn't exist`);
    return this.entities.splice(this.entities.indexOf(exists), 1).length > 0;
  }
}
