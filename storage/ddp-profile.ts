import { ArbitraryEntity } from "../../apis/arbitrary.ts";
import { DDPClient, MongoCollection } from "../ddp/client/ddp-client.ts";
import { CatalogDoc, EntityDoc, ProfileDoc } from "../ddp/db.ts";
import { EntityStorage } from "../storage.ts";
import { DdpEntityStorage } from "./ddp-entities.ts";

export class DdpProfileStorage implements EntityStorage {
  constructor(
    private readonly ddp: DDPClient,
    public readonly profileId: string,
    public readonly namespaceName: string,
  ) {
    this.ProfilesCollection = ddp.getCollection<ProfileDoc>('Profiles');
    this.CatalogsCollection = ddp.getCollection<CatalogDoc>('Catalogs');
    this.EntitiesCollection = ddp.getCollection<EntityDoc>('Entities');
  }
  ProfilesCollection: MongoCollection<ProfileDoc>;
  CatalogsCollection: MongoCollection<CatalogDoc>;
  EntitiesCollection: MongoCollection<EntityDoc>;

  async insertEntity<T extends ArbitraryEntity>(entity: T): Promise<void> {
    return await this.getStorage(entity.apiVersion, true)!.insertEntity(entity);
  }
  async listEntities<T extends ArbitraryEntity>(apiVersion: T["apiVersion"], kind: T["kind"]): Promise<T[]> {
    return await this.getStorage(apiVersion, false)?.listEntities(apiVersion, kind) ?? [];
  }
  async getEntity<T extends ArbitraryEntity>(apiVersion: T["apiVersion"], kind: T["kind"], name: string): Promise<T | null> {
    return await this.getStorage(apiVersion, false)?.getEntity(apiVersion, kind, name) ?? null;
  }
  async updateEntity<T extends ArbitraryEntity>(newEntity: T): Promise<void> {
    return await this.getStorage(newEntity.apiVersion, true)!.updateEntity(newEntity);
  }
  async deleteEntity<T extends ArbitraryEntity>(apiVersion: T["apiVersion"], kind: T["kind"], name: string): Promise<boolean> {
    return await this.getStorage(apiVersion, true)!.deleteEntity(apiVersion, kind, name);
  }
  getStorage(apiVersion: string, required: boolean): EntityStorage | null {
    // TODO: use LayeredNamespace for this logic instead
    const [apiGroup, _version] = apiVersion.split('/');
    const profile = this.ProfilesCollection.findOne({ _id: this.profileId });
    if (!profile) {
      if (!required) return null;
      throw new Error(`No storage matched profile ${this.profileId} [no-storage]`);
    }
    const layer = profile.layers.find(x => x.apiFilters.length == 0
      || x.apiFilters.some(y => {
        if (y.apiGroup && y.apiGroup !== apiGroup) return false;
        if (y.apiVersion && y.apiVersion !== apiVersion) return false;
        // if (y.kind && y.kind !== props.kind) return false;
        // if (x.mode == 'ReadOnly' && props.op !== 'Read') return false;
        // if (x.mode == 'WriteOnly' && props.op !== 'Write') return false;
        return true;
      }));
    if (!layer) {
      if (!required) return null;
      throw new Error(`No storage matched api filter ${apiGroup}`);
    }
    const banner = 'local-catalog:';
    if (layer.backingUrl.startsWith(banner)) {
      const catalogId = layer.backingUrl.slice(banner.length);
      return new DdpEntityStorage({
        ddp: this.ddp,
        EntitiesCollection: this.EntitiesCollection,
        catalogId: catalogId,
        namespace: this.namespaceName,
      });
    }
    throw new Error(`TODO: umimpl mongo type`);
  }
  async listAllEntities() {
    const profile = this.ProfilesCollection.findOne({ _id: this.profileId });
    if (!profile) {
      throw new Error(`No storage matched profile ${this.profileId} [no-storage]`);
    }
    const allLayers = profile.layers.map(layer => {
      const banner = 'local-catalog:';
      if (layer.backingUrl.startsWith(banner)) {
        const catalogId = layer.backingUrl.slice(banner.length);
        return new DdpEntityStorage({
          ddp: this.ddp,
          EntitiesCollection: this.EntitiesCollection,
          catalogId: catalogId,
          namespace: this.namespaceName,
        });
      }
      throw new Error(`TODO: umimpl mongo type`);
    });
    return (await Promise.all(allLayers.map(x => x.listAllEntities()))).flat(1);
  }
}
