import { ArbitraryEntity } from "../apis/arbitrary.ts";

export type NamespaceSpecWithImpl = {
  // layers: Array<Omit<NamespaceEntity['spec']['layers'][number], 'storage'> & {
  //   impl: EntityStorage,
  // }>;
  layers: Array<{
    mode: 'ReadOnly' | 'ReadWrite' | 'WriteOnly';
    accept: Array<{
      apiGroup?: string;
      apiVersion?: string;
      kind?: string;
    }>;
    impl: EntityStorage;
  }>;
}


export interface EntityStorage {
  // TODO: add some sort of API for 'submissions' (either entity spec/status or fetch request/response)
  insertEntity<T extends ArbitraryEntity>(entity: T): Promise<void>;
  listAllEntities(): Promise<ArbitraryEntity[]>;
  listEntities<T extends ArbitraryEntity>(apiVersion: T["apiVersion"], kind: T["kind"]): Promise<T[]>;
  // watchEntities<T extends ArbitraryEntity>(apiVersion: T["apiVersion"], kind: T["kind"]);
  getEntity<T extends ArbitraryEntity>(apiVersion: T["apiVersion"], kind: T["kind"], name: string): Promise<T | null>;
  updateEntity<T extends ArbitraryEntity>(newEntity: T): Promise<void>;
  deleteEntity<T extends ArbitraryEntity>(apiVersion: T["apiVersion"], kind: T["kind"], name: string): Promise<boolean>;
}

// TODO: use this for profiles too
export class LayeredNamespace {
  constructor(
    public readonly namespaceName: string, // TODO: remove namespace construct
    public readonly spec: NamespaceSpecWithImpl,
  ) {
    this.layers = spec.layers;
  }
  private readonly layers: NamespaceSpecWithImpl['layers'];

  selectLayer(props: {
    op: 'Read' | 'Write';
    apiGroup: string;
    apiVersion: string;
    kind: string;
  }) {
    return this.layers.find(x => x.accept.some(y => {
      if (y.apiGroup && y.apiGroup !== props.apiGroup) return false;
      if (y.apiVersion && y.apiVersion !== props.apiVersion) return false;
      if (y.kind && y.kind !== props.kind) return false;
      if (x.mode == 'ReadOnly' && props.op !== 'Read') return false;
      if (x.mode == 'WriteOnly' && props.op !== 'Write') return false;
      return true;
    }))?.impl;
  }

  allLayers() {
    return this.layers.slice(0);
  }
}







// function buildLayer(namespaceName: string, layerSpec: NamespaceEntity["spec"]["layers"][number]) {
//   switch (layerSpec.storage.type) {
//     // case 'local-inmemory':
//     //   return new MongoEntityStorage({
//     //     collection: new Mongo.Collection<ArbitraryEntity & { catalogId: string; _id: string }>(null),
//     //     namespace: namespaceName,
//     //     catalogId: 'x',
//     //   });
//     // case 'bundled':
//     //   const staticCat = StaticCatalogs.get(layerSpec.storage.bundleId ?? '');
//     //   if (!staticCat) throw new Error(`Bundled id ${JSON.stringify(layerSpec.storage.bundleId)} not found`);
//     //   return new StaticEntityStorage(staticCat);
//     // case 'profile':
//     //   return new MongoProfileStorage(layerSpec.storage.profileId, namespaceName);
//     // case 'foreign-ddp':
//     //   return new DdpEntityStorage({
//     //     remoteUrl: layerSpec.storage.remoteUrl,
//     //     catalogId: layerSpec.storage.catalogId,
//     //     namespace: namespaceName,
//     //   });
//   }
//   //@ts-expect-error should be exhaustive thus 'never'
//   throw new Error(`BUG: nobody built ${JSON.stringify(layerSpec.storage.type)} layer`);
// }




// export class MongoEntityStorage implements EntityStorage {
//   constructor(private readonly props: {
//     collection: Mongo.Collection<ArbitraryEntity & {catalogId: string; _id: string}>;
//     catalogId: string;
//     namespace: string;
//   }) {}

//   insertEntity<T extends ArbitraryEntity>(entity: T) {
//     const _id = [
//       this.props.catalogId,
//       "",
//       entity.apiVersion,
//       entity.kind,
//       entity.metadata.name,
//     ].join('_');

//     this.props.collection.insert({
//       ...entity,
//       catalogId: this.props.catalogId,
//       metadata: {
//         ...entity.metadata,
//         namespace: undefined,
//         creationTimestamp: new Date(),
//         generation: 1,
//       },
//       _id,
//     });
//   }

//   listAllEntities() {
//     return this.props.collection.find({
//       catalogId: this.props.catalogId,
//     }, {
//       fields: {
//         // _id: 0,
//         catalogId: 0,
//       },
//     }).fetch().map(x => ({ ...x, metadata: { ...x.metadata, namespace: this.props.namespace } }));
//   }

//   listEntities<T extends ArbitraryEntity>(apiVersion: T["apiVersion"], kind: T["kind"]) {
//     // console.log({
//     //   filter: {
//     //     apiVersion: apiVersion,
//     //     kind: kind,
//     //     catalogId: this.props.catalogId,
//     //     'metadata.namespace': this.props.namespace,
//     //   },
//     //   all: this.props.collection.find().fetch(),
//     // })
//     return (this.props.collection.find({
//       catalogId: this.props.catalogId,
//       apiVersion: apiVersion,
//       kind: kind,
//       // 'metadata.namespace': this.props.namespace,
//     }) as Mongo.Cursor<T & { catalogId: string; _id: string }>).fetch()
//       .map(x => ({ ...x, metadata: { ...x.metadata, namespace: this.props.namespace } }));
//   }

//   getEntity<T extends ArbitraryEntity>(apiVersion: T["apiVersion"], kind: T["kind"], name: string) {
//     const entity = this.props.collection.findOne({
//       catalogId: this.props.catalogId,
//       apiVersion: apiVersion,
//       kind: kind,
//       // 'metadata.namespace': this.props.namespace,
//       'metadata.name': name,
//     }) as T & { catalogId: string; _id: string };

//     return entity ? { ...entity,
//       metadata: { ...entity.metadata, namespace: this.props.namespace },
//     } : entity;
//   }

//   updateEntity<T extends ArbitraryEntity>(newEntity: T) {
//     if (!newEntity.metadata.generation) throw new Meteor.Error(`bug`,
//       `no generation in update`);
//     const count = this.props.collection.update({
//       catalogId: this.props.catalogId,
//       apiVersion: newEntity.apiVersion,
//       kind: newEntity.kind,
//       // 'metadata.namespace': newEntity.metadata.namespace,
//       'metadata.name': newEntity.metadata.name,
//       'metadata.generation': newEntity.metadata.generation,
//     }, {
//       ...(newEntity as (ArbitraryEntity & { _id: string })),
//       catalogId: this.props.catalogId,
//       metadata: {
//         ...newEntity.metadata,
//         updateTimestamp: new Date(),
//         generation: (newEntity.metadata.generation ?? 0) + 1,
//       },
//     });
//     // return count > 0;
//     if (count == 0) {
//       // console.log('desired:', newEntity);
//       // TODO: this is not a good way of passing error details (but we do want them, to reduce round-trips)
//       const latestVersion = this.getEntity<T>(newEntity.apiVersion, newEntity.kind, newEntity.metadata.name);
//       // latestVersion.metadata.
//       throw new Meteor.Error('no-update', `updateEntity didn't apply any change`, {latestVersion});
//     }
//     // return this.getEntity<T>(newEntity.apiVersion, newEntity.kind, newEntity.metadata.name);
//   }

//   deleteEntity<T extends ArbitraryEntity>(apiVersion: T["apiVersion"], kind: T["kind"], name: string) {
//     const count = this.props.collection.remove({
//       catalogId: this.props.catalogId,
//       apiVersion: apiVersion,
//       kind: kind,
//       // 'metadata.namespace': this.props.namespace,
//       'metadata.name': name,
//     });
//     return count > 0;
//   }

// }





