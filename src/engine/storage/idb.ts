// import { openDB } from "https://cdn.jsdelivr.net/npm/idb@7/+esm";
// import { DBSchema, IDBPDatabase, openDB } from "https://esm.sh/idb@7.1.1";
import { type DBSchema, type IDBPDatabase, openDB } from "npm:idb@7";

import type {
  ApiKindEntity,
  EntityKindEntity,
  EntityStorage,
  StreamEvent,
} from "../types.ts";
import { concat, EOF, fromNext, map, NextFunc } from "./_ows.ts";

// import type {
//   ApiSurface,
//   EntityStorage,
//   RestRequest,
//   RestResponse,
//   StreamEvent,
//   ArbitraryEntity,
//   EntityKind,
// } from "./types.d.ts";

type IdbEntityDocument<
  T extends ApiKindEntity = ApiKindEntity,
> = T & {
  catalogId: string;
};
//   apiVersion: string;
//   kind: string;
//   metadata: {
//     name: string;
//     uid: string;
//   };
// }
interface MyIdb extends DBSchema {
  entities: {
    value: IdbEntityDocument;
    key: [string, string, string, string];
    indexes: {
      'by-uid': [string, string],
    };
  };
}

type IdbRealtimeEvent =
| {
    type: 'insert' | 'replace';
    appliedAt: Date;
    key: Deno.KvKey;
    value: unknown;
  }
| {
    type: 'delete';
    appliedAt: Date;
    key: Deno.KvKey;
  }
;

// const tracer = trace.getTracer('idb-realtime');

async function openIdb(name: string) {
  return await openDB<MyIdb>(name, 1, {
    upgrade(db, oldVersion, _newVersion, txn) {
      switch (oldVersion) {
        case 0:
          db.createObjectStore('entities', {
            keyPath: ['catalogId', 'apiVersion', 'kind', 'metadata.name'],
          });
          // txn.objectStore('entities').createIndex('by-coords', ['catalogId', 'apiVersion', 'kind', 'metadata.name'], { unique: true });
          txn.objectStore('entities').createIndex('by-uid', ['catalogId', 'metadata.uid'], { unique: true });
      }
    },
  });
}

export class RealtimeIdb {
  constructor(
    partitionKey: string,
  ) {
    const idbName = `dist.app-${partitionKey}`;

    this.idbPromise = openIdb(idbName);
    this.broadcastChannel = new BroadcastChannel(idbName);

    this.idbPromise.then(() => {
      this.broadcastChannel.addEventListener('message', (evt) => {
        const payload: { event: IdbRealtimeEvent; baggage: Record<string,string> } = evt.data;
        // const ctx = propagation.extract(ROOT_CONTEXT, payload.baggage, BaggageGetter);
        // context.with(ctx, () => this.processEvent(payload.event));
        this.processEvent(payload.event);
      });
    });
  }
  idbPromise: Promise<IDBPDatabase<MyIdb>>;
  broadcastChannel: BroadcastChannel;
  close(): void {
    this.idbPromise.then(idb => idb.close());
    this.broadcastChannel.close();
  }

  private async generateEvent(event: IdbRealtimeEvent) {
    // await tracer.startActiveSpan(`KvRealtime:${event.type}`, {
    //   kind: SpanKind.PRODUCER,
    //   attributes: {
    //     'kv.event': event.type,
    //     'kv.key': event.key as string[],
    //     'kv.versionstamp': event.versionstamp,
    //   },
    // }, async span => {

      // const baggage: Record<string,string> = {};
      // propagation.inject(context.active(), baggage, {
      //   set: (h, k, v) => h[k] = typeof v === 'string' ? v : String(v),
      // });
      this.broadcastChannel?.postMessage({
        event,
        // baggage,
      });

      await this.processEvent(event)
        // .catch(err => {
        //   span.recordException(err);
        //   return Promise.reject(err);
        // })
        // .finally(() => span.end());
    // });
  }
  private async processEvent(event: IdbRealtimeEvent) {
    console.debug('running idb event:', event.type, event.key.join('/'));
    for (const observer of this.observers) {
      if (event.key.length < observer.prefix.length) continue;
      if (observer.prefix.every((part, idx) => event.key[idx] == part)) {
        // tracer.startActiveSpan(`KvRealtime:${event.type}`, {
        //   kind: SpanKind.CONSUMER,
        //   attributes: {
        //     'kv.event': event.type,
        //     'kv.key': event.key as string[],
        //     'kv.versionstamp': event.versionstamp,
        //   },
        //   links: observer.spanCtx ? [{
        //     context: observer.spanCtx,
        //   }] : [],
        // }, span => {
          observer.next(event);
        //   span.end();
        // });
      }
    }
  }


  // TODO: these functions don't agree about returning catalogId

  async collectList<T extends ApiKindEntity>(opts: { prefix: Deno.KvKey }): Promise<Array<T>> {
    const idb = await this.idbPromise;
    const txn = idb.transaction('entities', 'readonly');
    const entities = txn.objectStore('entities');
    // @ts-ignore TODO: jsr says: Cannot find name 'IDBKeyRange'.
    const docs = await entities.getAll(IDBKeyRange.bound(opts.prefix, [...opts.prefix, []]));
    return docs.map(x => {
      // Remove catalogId key from results
      const { catalogId: _, ...props } = x;
      return props as T;
    });
  }

  async getKey(key: Deno.KvKey): Promise<IdbEntityDocument<ApiKindEntity> | null>  {
    const idb = await this.idbPromise;
    const txn = idb.transaction('entities', 'readonly')
    const entities = txn.objectStore('entities');
    const doc = await entities.get(key as [string,string,string,string]);
    if (doc) return doc;
    return null;
  }

  observers: Set<{
    prefix: Deno.KvKey,
    next: NextFunc<IdbRealtimeEvent>,
    // spanCtx?: SpanContext,
  }> = new Set;

  observePrefix(prefix: Deno.KvKey, abortSignal: AbortSignal): ReadableStream<IdbRealtimeEvent | {type: "ready";}> {
    return concat<IdbRealtimeEvent | {type: 'ready'}>(
      new ReadableStream({
        start: async (ctlr) => {
          const items = await this.collectList({ prefix });
          for (const item of items) {
            ctlr.enqueue({
              type: 'insert',
              appliedAt: new Date(),
              key: [prefix[0], item.apiVersion, item.kind, item.metadata.name],
              value: item,
            });
          }
          ctlr.enqueue({type: 'ready'});
          ctlr.close();
        }
      }),
        fromNext<IdbRealtimeEvent>(next => {
            const observer = {
              prefix,
              next,
              // spanCtx: trace.getSpanContext(context.active()),
            };
            abortSignal.throwIfAborted();
            this.observers.add(observer);
            abortSignal.addEventListener('abort', () => {
              this.observers.delete(observer);
              next(EOF);
            });
          })
          // .pipeThrough(ows.filter<IdbRealtimeEvent>(evt => {
          //   if (evt.key.length < prefix.length) return false;
          //   return prefix.every((part, idx) => evt.key[idx] == part);
          // })),
      );
  }

  async createItem(catalogId: string, entity: ApiKindEntity) {
    const key = [catalogId, entity.apiVersion, entity.kind, entity.metadata.name];
    const value = {
      ...entity,
      catalogId,
    };

    const idb = await this.idbPromise;
    const txn = idb.transaction('entities', 'readwrite');
    const entities = txn.objectStore('entities');
    // console.log('inserting', value);
    await entities.add(value);
    await txn.done;

    this.generateEvent({
      type: 'insert',
      appliedAt: new Date(),
      key,
      value: entity,
      // versionstamp: result.versionstamp,
    });
  }

  async replaceItem(catalogId: string, /*versionstamp: string,*/ entity: ApiKindEntity) {
    const key = [catalogId, entity.apiVersion, entity.kind, entity.metadata.name];
    const value = {
      ...entity,
      catalogId,
    };

    const idb = await this.idbPromise;
    const txn = idb.transaction('entities', 'readwrite');
    const entities = txn.objectStore('entities');
    // TODO: want to check for up-to-date here
    // console.log('inserting', value);
    await entities.put(value);
    await txn.done;

    this.generateEvent({
      type: 'replace',
      appliedAt: new Date(),
      key, value,
      // versionstamp: result.versionstamp,
    });

    // return result;
  }

  // async deleteKey(key: Deno.KvKey, versionstamp: string) {
  //   const result = await this.kv.atomic()
  //     .check({ key, versionstamp })
  //     .delete(key)
  //     .commit();
  //   if (result.ok) {
  //     this.generateEvent({
  //       type: 'delete',
  //       appliedAt: new Date(),
  //       key,
  //       versionstamp: result.versionstamp,
  //     });
  //   }
  //   return result;
  // }
}

export class IdbStorage implements EntityStorage {
  constructor(
    private readonly idb: RealtimeIdb,
    private readonly catalogId: string,
  ) {
  }

  // async listAllEntities(): Promise<ApiKindEntity[]> {
  //   return await this.idb.collectList({
  //     prefix: [this.catalogId],
  //   });
  // }
  async listEntities<T extends ApiKindEntity>(definition: EntityKindEntity, apiVersion: T["apiVersion"],kind: T["kind"]): Promise<T[]> {
    return await this.idb.collectList({
      prefix: [this.catalogId, apiVersion, kind],
    });
  }
  observeEntities<T extends ApiKindEntity>(definition: EntityKindEntity, apiVersion: T["apiVersion"],kind: T["kind"], signal?: AbortSignal): ReadableStream<StreamEvent<T>> {
    return this.idb.observePrefix([this.catalogId, apiVersion, kind], signal ?? new AbortController().signal)
    .pipeThrough(map<IdbRealtimeEvent | { type: 'ready'; },StreamEvent<T>>(x => {
      switch (x.type) {
        case 'insert': return {
          kind: 'Creation',
          snapshot: x.value as T,
        };
        case 'ready': return {
          kind: 'InSync',
        };
        case 'replace': return {
          kind: 'Mutation',
          snapshot: x.value as T,
        };
        case 'delete': return {
          kind: 'Deletion',
          // TODO: don't fake this
          snapshot: {
            apiVersion, kind,
            metadata: {
              name: x.key[3],
            },
          } as T,
        };
        default: throw new Error(`BUG: unhandled ${(x as IdbRealtimeEvent).type}`);
      }
    }));
  }
  async getEntity<T extends ApiKindEntity>(definition: EntityKindEntity, apiVersion: T["apiVersion"],kind: T["kind"],name: string): Promise<T|null> {
    return await this.idb.getKey([this.catalogId, apiVersion, kind, name]) as T|null;
  }

  async insertEntity<T extends ApiKindEntity>(definition: EntityKindEntity, entity: T): Promise<void> {
    await this.idb.createItem(this.catalogId, {
      ...entity,
      metadata: {
        ...entity.metadata,
        creationTimestamp: new Date(),
        generation: 1,
        uid: crypto.randomUUID(),
      },
    });
  }
  async updateEntity<T extends ApiKindEntity>(definition: EntityKindEntity, entity: T): Promise<void> {
    // TODO: somehow put both of these I/Os on one IDB transaction
    const existing = await this.getEntity(definition, entity.apiVersion, entity.kind, entity.metadata.name);
    if (!existing) throw new Error(`updateEntity on non-existing`);
    await this.idb.replaceItem(this.catalogId, {
      ...entity,
      metadata: {
        ...entity.metadata,
        creationTimestamp: existing.metadata.creationTimestamp,
        generation: (existing.metadata.generation ?? 0) + 1,
        uid: existing.metadata.uid,
      },
    });
  }
  async deleteEntity<T extends ApiKindEntity>(definition: EntityKindEntity, apiVersion: T["apiVersion"],kind: T["kind"],name: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
}


//   async listAll(kind: string): Promise<ArbitraryEntity[]> {
//     return docs;
//   }
//   observeList(kind: string): ReadableStream<StreamEvent<ArbitraryEntity>> {
//     return new ReadableStream({
//       start: async (ctlr) => {
//         const list = await this.listAll(kind);
//         for (const doc of list) {
//           ctlr.enqueue({
//             kind: 'Creation',
//             snapshot: doc,
//           });
//         }
//         ctlr.enqueue({
//           kind: 'InSync',
//         });
//       }
//     })
//   }
//   async getOne(kind: string, name: string): Promise<null | ArbitraryEntity> {
//   }
//   async putOne(entity: ArbitraryEntity) {
//     const txn = this.idb.transaction('entities', 'readwrite');
//     const entities = txn.objectStore('entities');
//     const doc = await entities.get([
//       this.props.catalogId,
//       this.props.apiVersion,
//       entity.kind,
//       entity.metadata.name,
//     ]);
//     await entities.put({
//       ...entity,
//       catalogId: this.props.catalogId,
//     });
//     console.log(doc ? 'Replaced' : 'Created', entity);
//     await txn.done;
//   }

// export class IdbEntityStorage implements ApiSurface, EntityStorage {
//   constructor(
//     private readonly idb: IDBPDatabase<MyIdb>,
//     private readonly props: {
//       catalogId: string;
//       apiVersion: string;
//       kinds: Array<EntityKind>;
//     },
//   ) {
//     this.kindPlurals = new Map(props.kinds.map(x => [x.urlPlural, x]));
//   }
//   private kindPlurals: Map<string, EntityKind>;

//   async doRequest(request: RestRequest): Promise<RestResponse> {
//     const pathParts = request.path.slice(1).split('/');
//     switch (true) {
//       case pathParts.length == 2 && this.kindPlurals.has(pathParts[0]): {
//         const kind = this.kindPlurals.get(pathParts[0])!;
//         const name = pathParts[1];

//         // TODO: this is a terrible thing to do, update callers
//         if (name == 'stream') {
//           const stream = this.observeList(kind.kind);
//           return {
//             status: 200,
//             body: stream.pipeThrough(new TransformStream<StreamEvent<ArbitraryEntity>,string>({
//               transform(chunk, ctlr) {
//                 ctlr.enqueue(`${JSON.stringify(chunk)}\n`);
//               }
//             })).pipeThrough(new TextEncoderStream()),
//             headers: {
//               'content-type': 'application/json-lines',
//             },
//           };
//         }

//         if (request.method == 'GET') {
//           const entity = await this.getOne(kind.kind, name);
//           if (entity) {
//             return {
//               status: 200,
//               body: JSON.stringify(entity),
//               headers: {
//                 'content-type': 'application/json',
//               },
//             };
//           }
//         }
//         if (request.method == 'PUT') {
//           const fields = JSON.parse(await new Response(request.body).text());
//           const result = await this.putOne({
//             ...fields,
//             apiVersion: this.props.apiVersion,
//             kind: kind.kind,
//             metadata: {
//               ...fields.metadata,
//               name,
//             },
//           });
//           return {
//             status: 204,
//             body: null,
//           };
//         }
//       } break;
//       default:
//         alert(`AppRuntime todo: ${request.path}`);
//     }
//     return {
//       status: 404,
//       body: 'Not found.',
//       headers: {
//         'content-type': 'text/plain',
//       },
//     };
//   }
// }
