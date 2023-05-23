import { ArbitraryEntity } from "../../apis/arbitrary.ts";
import { DDPClient, MongoCollection } from "../ddp/client/ddp-client.ts";
import { CatalogDoc, EntityDoc, ProfileDoc } from "../ddp/db.ts";
import { EntityStorage } from "../storage.ts";

// const remoteConns = new Map<string, DDP.DDPStatic>();
// const entitiesColls = new Map<DDP.DDPStatic, Mongo.Collection<EntityDoc>>();

export class DdpEntityStorage implements EntityStorage {
  constructor(private readonly props: {
    ddp: DDPClient,
    EntitiesCollection: MongoCollection<EntityDoc>;
    catalogId: string;
    namespace: string;
  }) {
  }

  async listAllEntities() {
    return this.props.EntitiesCollection.find({
      catalogId: this.props.catalogId,
    }).fetch().map(x => ({ ...x, metadata: { ...x.metadata, namespace: this.props.namespace } }));
  }

  async listEntities<T extends ArbitraryEntity>(apiVersion: T["apiVersion"], kind: T["kind"]) {
    // console.log({
    //   filter: {
    //     apiVersion: apiVersion,
    //     kind: kind,
    //     catalogId: this.props.catalogId,
    //     'metadata.namespace': this.props.namespace,
    //   },
    //   all: this.props.collection.find().fetch(),
    // })
    return this.props.EntitiesCollection.find({
      catalogId: this.props.catalogId,
      apiVersion: apiVersion,
      kind: kind,
      // 'metadata.namespace': this.props.namespace,
    }).fetch()
      .map(x => ({ ...x, metadata: { ...x.metadata, namespace: this.props.namespace } }) as {} as T);
  }

  async getEntity<T extends ArbitraryEntity>(apiVersion: T["apiVersion"], kind: T["kind"], name: string) {
    const entity = this.props.EntitiesCollection.findOne({
      catalogId: this.props.catalogId,
      apiVersion: apiVersion,
      kind: kind,
      // 'metadata.namespace': this.props.namespace,
      'metadata.name': name,
    }) as T & { catalogId: string; _id: string };

    return entity ? { ...entity,
      metadata: { ...entity.metadata, namespace: this.props.namespace },
    } : entity;
  }


  // TODO: the span should probably be set before calling into these
  async insertEntity<T extends ArbitraryEntity>(entity: T) {
    await this.props.ddp.callMethod('/v1alpha1/Entity/insert', [this.props.catalogId, entity]);
  }
  async updateEntity<T extends ArbitraryEntity>(newEntity: T) {
    await this.props.ddp.callMethod<void>('/v1alpha1/Entity/update', [this.props.catalogId, newEntity]);
  }
  async deleteEntity<T extends ArbitraryEntity>(apiVersion: T["apiVersion"], kind: T["kind"], name: string) {
    return await this.props.ddp.callMethod<boolean>('/v1alpha1/Entity/delete', [this.props.catalogId, apiVersion, kind, name]);
  }
}
