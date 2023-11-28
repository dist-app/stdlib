import { DDPClient, MongoCollection } from "../ddp/client/ddp-client.ts";
import { CatalogDoc, EntityDoc, ProfileDoc } from "../ddp/db.ts";
import { EntityStorage, ApiKindEntity, StreamEvent } from "../portable/types.ts";

// const remoteConns = new Map<string, DDP.DDPStatic>();
// const entitiesColls = new Map<DDP.DDPStatic, Mongo.Collection<EntityDoc>>();

// TODO: rename to DdpCatalogStorage
export class DdpEntityStorage implements EntityStorage {
  constructor(private readonly props: {
    ddp: DDPClient,
    EntitiesCollection: MongoCollection<EntityDoc>;
    catalogId: string;
    // namespace: string;
  }) {
  }

  observeEntities<T extends ApiKindEntity>(apiVersion: T["apiVersion"], kind: T["kind"], signal?: AbortSignal | undefined): ReadableStream<StreamEvent<T>> {
    throw new Error("TODO: Method not implemented.");
  }

  async listAllEntities() {
    return this.props.EntitiesCollection.find({
      catalogId: this.props.catalogId,
    }).fetch();
  }

  async listEntities<T extends ApiKindEntity>(apiVersion: T["apiVersion"], kind: T["kind"]) {
    return this.props.EntitiesCollection.find({
      catalogId: this.props.catalogId,
      apiVersion: apiVersion,
      kind: kind,
    }).fetch() as ApiKindEntity[] as T[];
  }

  async getEntity<T extends ApiKindEntity>(apiVersion: T["apiVersion"], kind: T["kind"], name: string) {
    return this.props.EntitiesCollection.findOne({
      catalogId: this.props.catalogId,
      apiVersion: apiVersion,
      kind: kind,
      'metadata.name': name,
    }) as T & { catalogId: string; _id: string };
  }


  // TODO: the span should probably be set before calling into these
  async insertEntity<T extends ApiKindEntity>(entity: T) {
    await this.props.ddp.callMethod('/v1alpha1/Entity/insert', [this.props.catalogId, entity]);
  }
  async updateEntity<T extends ApiKindEntity>(newEntity: T) {
    await this.props.ddp.callMethod<void>('/v1alpha1/Entity/update', [this.props.catalogId, newEntity]);
  }
  async deleteEntity<T extends ApiKindEntity>(apiVersion: T["apiVersion"], kind: T["kind"], name: string) {
    return await this.props.ddp.callMethod<boolean>('/v1alpha1/Entity/delete', [this.props.catalogId, apiVersion, kind, name]);
  }
}
