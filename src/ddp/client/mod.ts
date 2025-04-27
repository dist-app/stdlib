import { EJSON, type EJSONableProperty } from "jsr:@cloudydeno/ejson@0.1.1";

// TODO: import 'sift' library to replace our DIY matching

import { trace, SpanKind, SpanStatusCode, Span, context, propagation, Context } from "jsr:@cloudydeno/opentelemetry@0.10.0/pkg/api";

const clientTracer = trace.getTracer('ddp.client');
const methodTracer = trace.getTracer('ddp.method');
const subTracer = trace.getTracer('ddp.subscription');

import { ClientSentPacket, ServerSentPacket, DocumentPacket } from "../types.ts";

class DDPCollection {
  public readonly fields: Map<string,Record<string,unknown>> = new Map;
  handlePacket(packet: DocumentPacket): void {
    switch (packet.msg) {
      case 'added': {
        this.fields.set(packet.id, packet.fields ?? {});
      }; break;
      case 'addedBefore': {
        // TODO: ordering
        this.fields.set(packet.id, packet.fields ?? {});
      }; break;
      case 'changed': {
        this.fields.set(packet.id, {
          ...this.fields.get(packet.id),
          ...(packet.fields ?? {}),
          ...Object.fromEntries(Object.entries(packet.cleared ?? {}).map(x => [x[0], undefined])),
        });
      }; break;
      case 'movedBefore': {
        // TODO: ordering
      }; break;
      case 'removed': {
        this.fields.delete(packet.id);
      }; break;
    }
  }
}

interface FindOpts {
  fields?: Record<string, boolean>;
}

export class MongoCollection<T extends {_id: string}> {
  constructor(
    private readonly ddpColl: DDPCollection,
  ) {}

  *_findGenerator(selector: Record<string,unknown>, opts?: FindOpts): Generator<T> {
    for (const [_id, fields] of this.ddpColl.fields) {
      let matches = true;
      for (const [field, spec] of Object.entries(selector)) {
        if (field.startsWith('$')) throw new Error(`TODO: selectors 1`);
        // console.log({spec, selector})
        if (Object.keys(spec as {_:1}).some(x => x.startsWith('$'))) throw new Error(`TODO: selectors 2`);
        if (field == '_id') {
          if (spec !== _id) matches = false;
          continue;
        }
        let fieldValue = null;
        if (field.includes('.')) {
          // throw new Error(`TODO: paths! ${field}`);
          fieldValue = fields;
          for (const part of field.split('.')) {
            fieldValue = (fieldValue[part] as Record<string,unknown>) ?? {};
          }
        } else {
          fieldValue = fields[field];
        }
        if (typeof spec == 'string' || typeof spec == 'number') {
          if (spec !== fieldValue) matches = false;
          continue;
        }
        throw new Error(`TODO: selectors!`);
      }
      if (matches) {
        yield makeReturnDoc(_id, fields as T, opts);
      }
    }
  }

  findOne(selector: Record<string,unknown>, opts?: FindOpts): T | null {
    for (const doc of this._findGenerator(selector, opts)) {
      return doc;
    }
    return null;
  }

  find(selector: Record<string,unknown>, opts?: FindOpts): Cursor<T> {
    const iterable = this._findGenerator(selector, opts);
    return {
      [Symbol.iterator]: iterable[Symbol.iterator],
      fetch: () => [...iterable],
    };
  }
}

export type Cursor<T extends {_id: string}> = {
  [Symbol.iterator]: () => Generator<T>;
  fetch(): Array<T>;
};

/** Clones a document using the 'fields' subset. */
function makeReturnDoc<T extends {_id: string}>(_id: string, original: T, opts?: FindOpts) {
  // const cloned = EJSON.clone(original);

  const fieldsSpec = (opts?.fields ?? {}) as Record<keyof T, boolean|undefined>;
  const subset: Partial<T> = {};
  let includeOthers = true;
  for (const pair of Object.entries(fieldsSpec)) {
    if (pair[1] === true) {
      includeOthers = false;
      if (pair[0] == '_id') {
        subset['_id'] = _id;
      } else if (pair[0] in original) {
        subset[pair[0] as keyof T] = EJSON.clone(original[pair[0] as keyof T]);
      }
    }
  }
  if (includeOthers) {
    for (const pair of Object.entries<unknown>(original)) {
      if (pair[0] in fieldsSpec) continue;
      subset[pair[0] as keyof T] = EJSON.clone(pair[1]) as T[keyof T];
    }
    if (!('_id' in fieldsSpec)) {
      subset['_id'] = _id;
    }
  }
  return subset as T; // TODO: this is a lie once fields is supplied
}

export class DDPClient {
  constructor(
    private readonly wss: WebSocketStream,
    private readonly readable: ReadableStream<string>,
    private readonly writable: WritableStream<string>,
    public readonly encapsulation: 'sockjs' | 'raw',
  ) {
    this.writer = this.writable.getWriter();
  }
  private readonly writer: WritableStreamDefaultWriter<string>;

  private readonly collections: Map<string, DDPCollection> = new Map;
  private readonly pendingMethods: Map<string, {
    // deno-lint-ignore no-explicit-any
    ok: (result: any) => void;
    fail: (error: Error) => void;
    span: Span;
  }> = new Map;
  private readonly pendingSubs: Map<string, {
    ok: () => void;
    fail: (error: Error) => void;
    span: Span;
  }> = new Map;
  // private readonly activeSubs = new Map<string, {
  //   ok: () => void,
  //   fail: (error: Error) => void,
  // }>();

  private grabCollection(collectionName: string): DDPCollection {
    let coll = this.collections.get(collectionName);
    if (!coll) {
      coll = new DDPCollection();
      this.collections.set(collectionName, coll);
    }
    return coll;
  }
  public getCollection<T extends {_id: string}>(collectionName: string): MongoCollection<T> {
    const coll = this.grabCollection(collectionName);
    return new MongoCollection<T>(coll);
  }

  async callMethod<T=EJSONableProperty>(name: string, params: EJSONableProperty[]): Promise<T> {
    const methodId = Math.random().toString(16).slice(2);
    const span = methodTracer.startSpan(name, {
      kind: SpanKind.CLIENT,
      attributes: {
        'rpc.system': 'ddp',
        'rpc.method': name,
        // 'rpc.ddp.session': this.id,
        // 'rpc.ddp.version': this.version,
        'rpc.ddp.method_id': methodId,
        // 'ddp.user_id': this.userId ?? '',
        // 'ddp.connection': this.connection?.id,
      },
    });

    console.log('--> call', name);
    return await new Promise<T>((ok, fail) => {
      this.pendingMethods.set(methodId, {ok, fail, span});
      this.sendMessage({
        msg: 'method',
        id: methodId,
        method: name,
        params: params,
      }, trace.setSpan(context.active(), span)).catch(fail);
    });
  }

  async subscribe(name: string, params: EJSONableProperty[]): Promise<void> {
    const subId = Math.random().toString(16).slice(2);
    const span = subTracer.startSpan(name, {
      kind: SpanKind.CLIENT,
      attributes: {
        'rpc.system': 'ddp-subscribe',
        'rpc.method': name,
        // 'rpc.ddp.session': this.id,
        // 'rpc.ddp.version': this.version,
        'rpc.ddp.sub_id': subId,
        // 'ddp.user_id': this.userId ?? '',
        // 'ddp.connection': this.connection?.id,
      },
    });

    console.log('--> sub', name, params);
    return await new Promise<void>((ok, fail) => {
      this.pendingSubs.set(subId, {ok, fail, span});
      this.sendMessage({
        msg: 'sub',
        id: subId,
        name: name,
        params: params,
      }, trace.setSpan(context.active(), span)).catch(fail);
    });
  }

  async runInboundLoop(): Promise<void> {
    if (this.encapsulation == 'raw') {
      for await (const chunk of this.readable) {
        const packet = EJSON.parse(chunk) as ServerSentPacket;
        await this.handlePacket(packet);
      }
      return;
    }

    for await (const chunk of this.readable) switch (chunk[0]) {
      case 'o': throw new Error(`got second open?`);
      case 'a': {
        for (const pkt of JSON.parse(chunk.slice(1))) {
          const packet = EJSON.parse(pkt) as ServerSentPacket;
          await this.handlePacket(packet);
        }
        break;
      }
      case 'c': {
        const [code, message] = JSON.parse(chunk.slice(1));
        throw new Error(`DDP connection closed by server: ${message} [${code}]`);
      }
      default: throw new Error(`got unimpl packet ${JSON.stringify(chunk)}`);
    }
  }

  async handlePacket(packet: ServerSentPacket): Promise<void> {
    if (Deno.args.includes('--debug')) console.debug('<--', packet.msg);
    switch (packet.msg) {
      case 'ping':
        await this.sendMessage({ msg: 'pong', id: packet.id });
        break;
      case 'pong':
        break;
      case 'error':
        console.error('DDP error:', packet);
        throw new Error(`DDP error: ${packet.reason ?? '(no reason)'}`);
      case 'updated':
        // We don't do client-side simulations so this isn't important
        break;

      // Subscription results
      case 'ready':
        for (const subId of packet.subs) {
          const handlers = this.pendingSubs.get(subId);
          if (!handlers) throw new Error(
            `DDP error: received "${packet.msg}" for unknown subscription ${JSON.stringify(subId)}`);
          this.pendingSubs.delete(subId);

          handlers.ok();
          handlers.span.end();
        }
        break;
      case 'nosub': {
        // TODO: this happens after a sub is pending, right?
        const handlers = this.pendingSubs.get(packet.id);
        if (!handlers) throw new Error(
          `DDP error: received "${packet.msg}" for unknown subscription ${JSON.stringify(packet.id)}`);
        this.pendingSubs.delete(packet.id);

        const message = packet.error?.message
          ?? 'Server refused the subscription without providing an error';
        handlers.span.setStatus({
          code: SpanStatusCode.ERROR,
          message: message,
        });
        handlers.fail(new Error(message));
        handlers.span.end();
      } break;

      // Method results
      case 'result': {
        const handlers = this.pendingMethods.get(packet.id);
        if (!handlers) throw new Error(
          `DDP error: received "${packet.msg}" for unknown method call ${JSON.stringify(packet.id)}`);
        this.pendingMethods.delete(packet.id);
        if (packet.error) {
          handlers.span.setStatus({
            code: SpanStatusCode.ERROR,
            message: packet.error.message,
          });
          // TODO: throw a MeteorError-alike
          // TODO: there's more details than just this
          handlers.fail(new Error(packet.error.message));
        } else {
          handlers.ok(packet.result);
        }
        handlers.span.end();
      } break;

      // Subscription document events
      case 'added':
      case 'addedBefore':
      case 'changed':
      case 'removed':
      case 'movedBefore': {
        console.debug('docevent:', packet.msg, packet.id);
        const coll = this.grabCollection(packet.collection);
        coll.handlePacket(packet);
        break;
      }

      default:
        console.log('<--', packet);
    }
  }

  async sendMessage(packet: ClientSentPacket, traceContext?: Context): Promise<void> {
    const baggage: Record<string,string> = {};
    if (traceContext) {
      propagation.inject(traceContext, baggage, {
        set: (h, k, v) => h[k] = typeof v === 'string' ? v : String(v),
      });
    }
    const fullPacket = { ...packet, baggage };

    if (Deno.args.includes('--debug')) console.debug('-->', fullPacket.msg, fullPacket.baggage);
    if (this.encapsulation == 'raw') {
      await this.writer.write(EJSON.stringify(fullPacket));
    } else {
      await this.writer.write(JSON.stringify([EJSON.stringify(fullPacket)]));
    }
  }

  static async connectToUrl(appUrl: string, encapsulation: 'sockjs' | 'raw'): Promise<DDPClient> {
    let sockPath = 'websocket';

    if (encapsulation == 'sockjs') {
      const shardId = Math.floor(Math.random()*1000);
      const sessionId = Math.random().toString(16).slice(2, 10);
      sockPath = `sockjs/${shardId}/${sessionId}/${sockPath}`;
    }

    const sockUrl = new URL(sockPath, appUrl);
    sockUrl.protocol = sockUrl.protocol.replace(/^http/, 'ws');
    const wss = new WebSocketStream(sockUrl.toString());

    const connectSpan = clientTracer.startSpan('DDP connection');
    const {readable, writable} = await wss.opened.finally(() => connectSpan.end());

    // TODO: typecheck
    const ddp = new this(wss, readable as ReadableStream<string>, writable, encapsulation);

    const setupReader = readable.getReader() as ReadableStreamDefaultReader<string>;

    const handshakeSpan = clientTracer.startSpan('DDP handshake');
    try {
      await ddp.sendMessage({
        msg: "connect",
        version: "1",
        support: ["1"],
      });

      if (encapsulation == 'sockjs') {
        {
          const {value} = await setupReader.read();
          if (value !== 'o') throw new Error(`Unexpected banner: ${JSON.stringify(value)}`)
        }

        // TODO: the parsing should be handled by a transformstream, read from that instead
        const {value} = await setupReader.read();
        if (value?.[0] !== 'a') throw new Error(`Unexpected connect resp: ${JSON.stringify(value)}`)
        const packet: ServerSentPacket = EJSON.parse(JSON.parse(value.slice(1))[0]) as ServerSentPacket;
        if (packet.msg !== 'connected') throw new Error(`Unexpected connect msg: ${JSON.stringify(packet)}`);
        // const session = packet.session as string;

      } else {
        const {value} = await setupReader.read();
        if (value?.[0] !== '{') throw new Error(`Unexpected connect resp: ${JSON.stringify(value)}`)
        const packet: ServerSentPacket = EJSON.parse(value) as ServerSentPacket;
        if (packet.msg !== 'connected') throw new Error(`Unexpected connect msg: ${JSON.stringify(packet)}`);
      }
    } finally {
      handshakeSpan.end();
    }

    setupReader.releaseLock();
    ddp.runInboundLoop(); // throw away the promise (it's fine)
    return ddp;
  }
}
