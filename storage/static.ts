import { EntityStorage, ApiKindEntity, StreamEvent } from "../portable/types.ts";

export class StaticEntityStorage<T extends ApiKindEntity> implements EntityStorage {
  constructor(private readonly src: Array<T>) {}
  observeEntities<T extends ApiKindEntity>(apiVersion: T["apiVersion"], kind: T["kind"], signal?: AbortSignal | undefined): ReadableStream<StreamEvent<T>> {
    throw new Error("TODO: Method not implemented.");
  }
  async listAllEntities() {
    return this.src.slice(0);
  }
  async listEntities<T extends ApiKindEntity>(apiVersion: T["apiVersion"], kind: T["kind"]): Promise<T[]> {
    return (this.src as ApiKindEntity[]).filter(x =>
      x.apiVersion == apiVersion && x.kind == kind) as T[];
  }
  async getEntity<T extends ApiKindEntity>(apiVersion: T["apiVersion"], kind: T["kind"], name: string): Promise<T | null> {
    return (this.src as ApiKindEntity[]).find(x =>
      x.apiVersion == apiVersion && x.kind == kind && x.metadata.name == name) as T;
  }
  insertEntity(): Promise<void> {
    throw new Error("StaticEntityStorage is a read-only store. [is-readonly]");
  }
  updateEntity(): Promise<void> {
    throw new Error("StaticEntityStorage is a read-only store. [is-readonly]");
  }
  deleteEntity(): Promise<boolean> {
    throw new Error("StaticEntityStorage is a read-only store. [is-readonly]");
  }
}
