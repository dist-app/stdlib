import { ArbitraryEntity } from "../../apis/arbitrary.ts";
import { EntityStorage } from "../storage.ts";

export class StaticEntityStorage<T extends ArbitraryEntity> implements EntityStorage {
  constructor(private readonly src: Array<T>) {}
  async listAllEntities() {
    return this.src.slice(0);
  }
  async listEntities<T extends ArbitraryEntity>(apiVersion: T["apiVersion"], kind: T["kind"]): Promise<T[]> {
    return (this.src as ArbitraryEntity[]).filter(x =>
      x.apiVersion == apiVersion && x.kind == kind) as T[];
  }
  async getEntity<T extends ArbitraryEntity>(apiVersion: T["apiVersion"], kind: T["kind"], name: string): Promise<T | null> {
    return (this.src as ArbitraryEntity[]).find(x =>
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
