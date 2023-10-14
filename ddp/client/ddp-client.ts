import {default as EJSON} from "https://cdn.skypack.dev/ejson@2.2.3";

import { trace, SpanKind, SpanStatusCode, Span, context, propagation, Context } from "https://deno.land/x/observability@v0.4.3/opentelemetry/api.js";

const clientTracer = trace.getTracer('ddp.client');
const methodTracer = trace.getTracer('ddp.method');
const subTracer = trace.getTracer('ddp.subscription');

import { ClientSentPacket, MeteorError, ServerSentPacket, DocumentPacket } from "../types.ts";

class DDPCollection {
  public readonly fields = new Map<string,Record<string,unknown>>();
  handlePacket(packet: DocumentPacket) {
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

export class MongoCollection<T extends {_id: string}> {
  constructor(
    private readonly ddpColl: DDPCollection,
  ) {}

  *_findGenerator(selector: Record<string,unknown>) {
    for (const [_id, fields] of this.ddpColl.fields) {
      let matches = true;
      for (const [field, spec] of Object.entries(selector)) {
        if (field.startsWith('$')) throw new Error(`TODO: selectors 1`);
        if (Object.keys(spec as {}).some(x => x.startsWith('$'))) throw new Error(`TODO: selectors 2`);
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
        yield { _id, ...EJSON.clone(fields) } as T;
      }
    }
  }

  findOne(selector: Record<string,unknown>) {
    for (const doc of this._findGenerator(selector)) {
      return doc;
    }
    return null;
  }

  find(selector: Record<string,unknown>) {
    const iterable = this._findGenerator(selector);
    return {
      [Symbol.iterator]: iterable[Symbol.iterator],
      fetch: () => [...iterable],
    };
  }
}

export class DDPClient {
  constructor(
    private readonly wss: WebSocketStream,
    private readonly readable: ReadableStream<string>,
    private readonly writable: WritableStream<string>,
  ) {
    this.writer = this.writable.getWriter();
  }
  private readonly writer: WritableStreamDefaultWriter<string>;

  private readonly collections = new Map<string, DDPCollection>();
  private readonly pendingMethods = new Map<string, {
    ok: (result: any) => void;
    fail: (error: Error) => void;
    span: Span;
  }>();
  private readonly pendingSubs = new Map<string, {
    ok: () => void;
    fail: (error: Error) => void;
    span: Span;
  }>();
  // private readonly activeSubs = new Map<string, {
  //   ok: () => void,
  //   fail: (error: Error) => void,
  // }>();

  private grabCollection(collectionName: string) {
    let coll = this.collections.get(collectionName);
    if (!coll) {
      coll = new DDPCollection();
      this.collections.set(collectionName, coll);
    }
    return coll;
  }
  public getCollection<T extends {_id: string}>(collectionName: string) {
    const coll = this.grabCollection(collectionName);
    return new MongoCollection<T>(coll);
  }

  async callMethod<T=unknown>(name: string, params: unknown[]) {
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

  async subscribe(name: string, params: unknown[]) {
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

  async runInboundLoop() {
    for await (const chunk of this.readable) switch (chunk[0]) {
      case 'o': throw new Error(`got second open?`);
      case 'a': {
        for (const pkt of JSON.parse(chunk.slice(1))) {
          const packet = EJSON.parse(pkt);
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

  async handlePacket(packet: ServerSentPacket) {
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
      case 'movedBefore':
        console.debug('docevent:', packet.msg, packet.id);
        const coll = this.grabCollection(packet.collection);
        coll.handlePacket(packet);
        break;

      default:
        console.log('<--', packet);
    }
  }

  async sendMessage(packet: ClientSentPacket, traceContext?: Context) {
    const baggage: Record<string,string> = {};
    if (traceContext) {
      propagation.inject(traceContext, baggage, {
        set: (h, k, v) => h[k] = typeof v === 'string' ? v : String(v),
      });
    }
    const fullPacket = { ...packet, baggage };

    if (Deno.args.includes('--debug')) console.debug('-->', fullPacket.msg, fullPacket.baggage);
    await this.writer.write(JSON.stringify([EJSON.stringify(fullPacket)]));
  }

  static async connectToUrl(appUrl: string) {
    const shardId = Math.floor(Math.random()*1000);
    const sessionId = Math.random().toString(16).slice(2, 10);

    const sockUrl = new URL(`sockjs/${shardId}/${sessionId}/websocket`, appUrl);
    sockUrl.protocol = sockUrl.protocol.replace(/^http/, 'ws');
    const wss = new WebSocketStream(sockUrl.toString());

    const connectSpan = clientTracer.startSpan('DDP connection');
    const {readable, writable} = await wss.opened.finally(() => connectSpan.end());

    // TODO: typecheck
    const ddp = new this(wss, readable as ReadableStream<string>, writable);

    const setupReader = readable.getReader() as ReadableStreamDefaultReader<string>;

    const handshakeSpan = clientTracer.startSpan('DDP handshake');
    try {
      await ddp.sendMessage({
        msg: "connect",
        version: "1",
        support: ["1"],
      });

      {
        const {value} = await setupReader.read();
        if (value !== 'o') throw new Error(`Unexpected banner: ${JSON.stringify(value)}`)
      }

      // TODO: the parsing should be handled by a transformstream, read from that instead
      const {value} = await setupReader.read();
      if (value?.[0] !== 'a') throw new Error(`Unexpected connect resp: ${JSON.stringify(value)}`)
      const packet: ServerSentPacket = JSON.parse(JSON.parse(value.slice(1))[0]);
      if (packet.msg !== 'connected') throw new Error(`Unexpected connect msg: ${JSON.stringify(packet)}`);
      // const session = packet.session as string;
    } finally {
      handshakeSpan.end();
    }

    setupReader.releaseLock();
    ddp.runInboundLoop(); // throw away the promise (it's fine)
    return ddp;
  }
}
