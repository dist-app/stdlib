import { default as EJSON } from "https://cdn.skypack.dev/ejson@2.2.3";
import { ROOT_CONTEXT, SpanKind, TextMapGetter, propagation, trace } from "https://deno.land/x/observability@v0.4.0/opentelemetry/api.js";

import { ClientSentPacket, ServerSentPacket } from "../types.ts";

export type MethodHandler = (socket: InboundDdpSocket, params: unknown[]) => unknown;
export type PublicationHandler = (socket: InboundDdpSocket, params: unknown[]) => unknown;

// We add an extra field on DDP requests for distributed tracing.
// This is compatible with the meteor package "danopia:opentelemetry".
type TracedClientSentPacket = ClientSentPacket & {
  baggage?: Record<string, string>;
};

const methodtracer = trace.getTracer('ddp.method');
const subtracer = trace.getTracer('ddp.subscription');

export class DdpInterface {
  private readonly methods = new Map<string, MethodHandler>();
  private readonly publications = new Map<string, PublicationHandler>();
  private readonly openSockets = new Set<InboundDdpSocket>();

  addMethod(name: string, handler: MethodHandler) {
    this.methods.set(name, handler);
  }
  addPublication(name: string, handler: PublicationHandler) {
    this.publications.set(name, handler);
  }

  registerSocket(socket: InboundDdpSocket) {
    this.openSockets.add(socket);
    socket.closePromise
      .catch(err => {
        console.warn(`WebSocket walked away: ${err}`);
      })
      .finally(() => {
        this.openSockets.delete(socket);
      });
  }

  async callMethod(socket: InboundDdpSocket, name: string, params: unknown[]) {
    const handler = this.methods.get(name);
    if (!handler) {
      throw new Error(`unimplemented method: "${name}"`);
    }
    return await handler(socket, params);
  }

  async callSubscribe(socket: InboundDdpSocket, name: string, params: unknown[]) {
    const handler = this.publications.get(name);
    if (!handler) {
      throw new Error(`unimplemented sub: "${name}"`);
    }
    return await handler(socket, params);
  }
}

// tell opentelemetry how to get baggage from packets
const BaggageGetter: TextMapGetter<Record<string, string>> = {
  get(h,k) { return h[k]; },
  keys(h) { return Object.keys(h); },
};

// TODO: this class can probably use W3C streams better (e.g. outgoing backpressure)
// This would depend on WebSocketStream to properly function though.
export class InboundDdpSocket {
  constructor (
    private readonly socket: WebSocket,
    private readonly ddpInterface: DdpInterface,
  ) {
    socket.onopen = () => socket.send('o');
    socket.onmessage = (e) => {
      const msgs = JSON.parse(e.data) as string[];
      for (const msgText of msgs) {
        const msg = EJSON.parse(msgText) as TracedClientSentPacket;
        this.handleClientPacket(msg);
      }
    };

    this.closePromise = new Promise<void>((ok, fail) => {
      socket.onerror = (evt: ErrorEventInit) => {
        fail(new Error(`WebSocket errored: ${evt.message}`));
        console.log("WebSocket errored:", evt.message);
      }
      socket.onclose = () => {
        ok();
        console.log("WebSocket closed");
      }
    });

    // this.telemetryAttrs = {
      // 'rpc.ddp.session': this.id,
      // 'rpc.ddp.version': this.version,
    // 'meteor.user_id': this.userId,
      // 'net.peer.name': this.socket.remoteAddress,
      // 'net.peer.port': this.socket.remotePort,
      // 'net.host.name': this.socket.address.address,
      // 'net.host.port': this.socket.address.port,
      // 'net.sock.family': ({'IPv4':'inet','IPv6':'inet6'})[this.socket.address.family] ?? this.socket.address.family,
    // }
  }
  // telemetryAttrs: Attributes;
  public readonly closePromise: Promise<void>;

  async handleClientPacket(pkt: TracedClientSentPacket) {
    const ctx = propagation.extract(ROOT_CONTEXT, pkt.baggage ?? {}, BaggageGetter);
    console.log("<--", Deno.inspect(pkt, { depth: 1 }));
    switch (pkt.msg) {
      case 'connect':
        // "version\":\"1\"
        // "support\":[\"1\",\"pre2\",\"pre1\"]
        this.send([{
          msg: "connected",
          session: Math.random().toString(16).slice(2),
        }]);
        break;
      case 'ping':
        this.send([{
          msg: "pong",
        }]);
        break;
      case 'sub':
        await subtracer.startActiveSpan(pkt.name, {
          kind: SpanKind.SERVER,
          attributes: {
            'rpc.system': 'ddp-subscribe',
            'rpc.method': pkt.name,
            'rpc.ddp.sub_id': pkt.id,
          },
        }, ctx, (span) => this.ddpInterface
          .callSubscribe(this, pkt.name, pkt.params)
          .then<ServerSentPacket,ServerSentPacket>(x => ({
            msg: "ready",
            subs: [pkt.id],
          }), err => (console.error('sub error:', err), {
            msg: "nosub",
            id: pkt.id,
            error: {
              error: err.message,
              message: err.message,
            },
          }))
          .then(pkt => this.send([pkt]))
          .finally(() => span.end()));
        break;
      case 'method':
        await methodtracer.startActiveSpan(pkt.method, {
          kind: SpanKind.SERVER,
          attributes: {
            'rpc.system': 'ddp',
            'rpc.method': pkt.method,
            'rpc.ddp.method_id': pkt.id,
          },
        }, ctx, (span) => this.ddpInterface
          .callMethod(this, pkt.method, pkt.params)
          .then<ServerSentPacket,ServerSentPacket>(x => ({
            msg: "result",
            id: pkt.id,
            result: x,
          }), err => (console.error('method error:', err), {
            msg: "result",
            id: pkt.id,
            error: {
              error: err.message,
              message: err.message,
            },
          }))
          .then(pkt => this.send([pkt]))
          .finally(() => span.end()));
        break;
      default:
        throw new Error(`TODO: client sent unexpected packet ${pkt.msg}`);
    }
  }

  send(pkts: ServerSentPacket[]) {
    for (const pkt of pkts) {
      console.log('-->', Deno.inspect(pkt, { depth: 0 }));
    }
    this.socket.send('a'+JSON.stringify(pkts.map(x => EJSON.stringify(x))));
  }
}
