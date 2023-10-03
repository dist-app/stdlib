import * as ows from "https://deno.land/x/stream_observables@v1.3/mod.ts";

import { ArbitraryEntity } from "../../apis/meta.ts";
import { EntityStorage } from "../storage.ts";
import { trace, SpanKind, propagation, context, TextMapGetter, ROOT_CONTEXT, SpanContext } from "https://deno.land/x/observability@v0.4.3/opentelemetry/api.js";

type KvRealtimeEvent =
| {
    type: 'insert' | 'replace';
    appliedAt: Date;
    key: Deno.KvKey;
    value: unknown;
    versionstamp: string;
  }
| {
    type: 'delete';
    appliedAt: Date;
    key: Deno.KvKey;
    versionstamp: string;
  }
;

const tracer = trace.getTracer('kv-realtime');

export class KvRealtimeContext {
  constructor(
    private readonly kv: Deno.Kv,
    private readonly broadcastChannel?: BroadcastChannel
  ) {
    // TODO: tracing context thru the BroadcastChannel
    broadcastChannel?.addEventListener('message', (evt) => {
      const payload: { event: KvRealtimeEvent; baggage: Record<string,string> } = evt.data;
      const ctx = propagation.extract(ROOT_CONTEXT, payload.baggage, BaggageGetter);
      context.with(ctx, () => this.processEvent(payload.event));
    });
  }

  private async generateEvent(event: KvRealtimeEvent) {
    await tracer.startActiveSpan(`KvRealtime:${event.type}`, {
      kind: SpanKind.PRODUCER,
      attributes: {
        'kv.event': event.type,
        'kv.key': event.key as string[],
        'kv.versionstamp': event.versionstamp,
      },
    }, async span => {

      const baggage: Record<string,string> = {};
      propagation.inject(context.active(), baggage, {
        set: (h, k, v) => h[k] = typeof v === 'string' ? v : String(v),
      });
      this.broadcastChannel?.postMessage({
        event,
        baggage,
      });

      await this.processEvent(event)
        .catch(err => {
          span.recordException(err);
          return Promise.reject(err);
        })
        .finally(() => span.end());
    });
  }
  private async processEvent(event: KvRealtimeEvent) {
    console.log('running kv event:', event.type, event.key.join('/'));
    for (const observer of this.observers) {
      if (event.key.length < observer.prefix.length) continue;
      if (observer.prefix.every((part, idx) => event.key[idx] == part)) {
        tracer.startActiveSpan(`KvRealtime:${event.type}`, {
          kind: SpanKind.CONSUMER,
          attributes: {
            'kv.event': event.type,
            'kv.key': event.key as string[],
            'kv.versionstamp': event.versionstamp,
          },
          links: observer.spanCtx ? [{
            context: observer.spanCtx,
          }] : [],
        }, span => {
          observer.next(event);
          span.end();
        });
      }
    }
  }


  async getKey(key: Deno.KvKey) {
    const result = await this.kv.get(key);
    return result;
  }

  async collectList(opts: { prefix: Deno.KvKey }) {
    const entities = new Array<Deno.KvEntry<unknown>>();
    for await (const entry of this.kv.list(opts)) {
      entities.push(entry);
    }
    return entities;
  }

  observers = new Set<{
    prefix: Deno.KvKey,
    next: ows.NextFunc<KvRealtimeEvent>,
    spanCtx?: SpanContext,
  }>();

  observePrefix(prefix: Deno.KvKey, abortSignal: AbortSignal) {
    return ows
      .concat<KvRealtimeEvent | {type: 'ready'}>(
        ows
          .fromIterable(this.kv.list({ prefix }))
          .pipeThrough(ows.map(entry => ({
              type: 'insert',
              appliedAt: new Date(),
              key: entry.key,
              value: entry.value,
              versionstamp: entry.versionstamp,
          }))),
        ows
          .just({type: 'ready'}),
        ows
          .fromNext<KvRealtimeEvent>(next => {
            const observer = {
              prefix,
              next,
              spanCtx: trace.getSpanContext(context.active()),
            };
            abortSignal.throwIfAborted();
            this.observers.add(observer);
            abortSignal.addEventListener('abort', () => {
              this.observers.delete(observer);
              next(ows.EOF);
            });
          })
          // .pipeThrough(ows.filter<KvRealtimeEvent>(evt => {
          //   if (evt.key.length < prefix.length) return false;
          //   return prefix.every((part, idx) => evt.key[idx] == part);
          // })),
      );
  }


  async createKey(key: Deno.KvKey, value: unknown) {
    const result = await this.kv.atomic()
      .check({ key, versionstamp: null })
      .set(key, value)
      .commit();
    if (result.ok) {
      this.generateEvent({
        type: 'insert',
        appliedAt: new Date(),
        key, value,
        versionstamp: result.versionstamp,
      });
    }
    return result;
  }

  async replaceKey(key: Deno.KvKey, versionstamp: string, value: unknown) {
    const result = await this.kv.atomic()
      .check({ key, versionstamp })
      .set(key, value)
      .commit();
    if (result.ok) {
      this.generateEvent({
        type: 'replace',
        appliedAt: new Date(),
        key, value,
        versionstamp: result.versionstamp,
      });
    }
    return result;
  }

  async deleteKey(key: Deno.KvKey, versionstamp: string) {
    const result = await this.kv.atomic()
      .check({ key, versionstamp })
      .delete(key)
      .commit();
    if (result.ok) {
      this.generateEvent({
        type: 'delete',
        appliedAt: new Date(),
        key,
        versionstamp: result.versionstamp,
      });
    }
    return result;
  }
}

export class KvRealtimeEntityStorage implements EntityStorage {
  constructor(
    private readonly context: KvRealtimeContext,
    private readonly prefix: Deno.KvKey,
  ) {}
  async insertEntity<T extends ArbitraryEntity>(entity: T): Promise<void> {
    const coords = [...this.prefix, entity.apiVersion, entity.kind, entity.metadata.name];
    const result = await this.context.createKey(coords, {
      ...entity,
      metadata: {
        ...entity.metadata,
        namespace: undefined,
        creationTimestamp: new Date(),
        generation: 1,
        uid: crypto.randomUUID(),
      },
    });
    if (!result.ok) throw new Error('entity already exists');
    // TODO: probably return the new entity? (incl. uid, resourceVersion, creationTimestamp)
  }
  async listAllEntities(): Promise<ArbitraryEntity[]> {
    const entries = await this.context.collectList({
      prefix: [...this.prefix],
    });
    return entries.map<ArbitraryEntity>(entry => {
      const entity = entry.value as ArbitraryEntity;
      return {
        ...entity,
        metadata: {
          ...entity.metadata,
          resourceVersion: entry.versionstamp,
        },
      };
    });
  }
  async listEntities<T extends ArbitraryEntity>(apiVersion: T["apiVersion"], kind: T["kind"]): Promise<T[]> {
    const coords: string[] = [apiVersion, kind];
    const entries = await this.context.collectList({
      prefix: [...this.prefix, ...coords],
    });
    return entries.map<T>(entry => {
      const entity = entry.value as T;
      return {
        ...entity,
        metadata: {
          ...entity.metadata,
          resourceVersion: entry.versionstamp,
        },
      };
    });
  }
  async getEntity<T extends ArbitraryEntity>(apiVersion: T["apiVersion"],kind: T["kind"],name: string): Promise<T|null> {
    const coords: string[] = [apiVersion, kind, name];
    const entry = await this.context.getKey([...this.prefix, ...coords]);
    if (!entry.versionstamp) return null;
    const entity = entry.value as T;
    return {
      ...entity,
      metadata: {
        ...entity.metadata,
        resourceVersion: entry.versionstamp,
      },
    };
  }
  async updateEntity<T extends ArbitraryEntity>(newEntity: T): Promise<void> {
    const coords = [...this.prefix, newEntity.apiVersion, newEntity.kind, newEntity.metadata.name];
    const prev = await this.context.getKey(coords);
    const prevEntity = prev.value as ArbitraryEntity | null;
    if (!prevEntity || !prev.versionstamp) throw new Error(`doc didn't exist`);
    if (prevEntity.metadata.generation !== newEntity.metadata.generation) {
      throw new Error(`doc is out of date`);
    }
    const result = await this.context.replaceKey(coords, prev.versionstamp, {
      ...newEntity,
      metadata: {
        ...newEntity.metadata,
        // namespace: undefined,
        creationTimestamp: prevEntity.metadata.creationTimestamp,
        generation: (prevEntity.metadata.generation ?? 0) + 1,
        uid: prevEntity.metadata.uid,
      },
    });
    if (!result.ok) throw new Error('sorry, you lost the update race');
  }
  async deleteEntity<T extends ArbitraryEntity>(apiVersion: T["apiVersion"],kind: T["kind"],name: string): Promise<boolean> {
    const coords = [...this.prefix, apiVersion, kind, name];
    const prev = await this.context.getKey(coords);
    if (!prev.versionstamp) throw new Error(`doc didn't exist`);
    // if (prev.value?.metadata.generation !== entity.metadata.generation) {
    //   throw new Error(`doc is out of date`);
    // }
    const result = await this.context.deleteKey(coords, prev.versionstamp);
    return result.ok;
  }
}

const BaggageGetter: TextMapGetter<Record<string, string>> = {
  get(h,k) { return h[k]; },
  keys(h) { return Object.keys(h); },
};
