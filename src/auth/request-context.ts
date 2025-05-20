import { type Cookie, deleteCookie, getCookies, setCookie } from "@std/http/cookie";
import type { AuthRequestContext } from "./types.ts";

export class AuthRequestContextImpl implements AuthRequestContext {
  constructor(
    readonly request: Request,
    readonly connInfo: Deno.ServeHandlerInfo,
  ) {
    this.requestUrl = new URL(request.url);
    this.cookies = getCookies(this.request.headers);
  }
  requestUrl: URL;
  cookies: Record<string,string>;
  respHeaders: Headers = new Headers;

  setCookie(cookie: Cookie): void {
    setCookie(this.respHeaders, cookie);
  }

  deleteCookie(name: string, attributes: {
    path?: string;
    domain?: string;
  }): void {
    deleteCookie(this.respHeaders, name, attributes);
  }

  setHeader(name: string, value: string): void {
    this.respHeaders.set(name, value);
  }

  respondText(status: number, body: string): Response {
    return new Response(body, {
      status: status,
      headers: this.respHeaders,
    });
  }

  async readFormFields(): Promise<URLSearchParams> {
    if (this.request.headers.get('content-type') != 'application/x-www-form-urlencoded') {
      throw new Error(`unsupported form content-type`);
    }
    return new URLSearchParams(await this.request.text());
  }

  get remoteAddress(): string {
    const addr = getRemoteAddress(this.connInfo);
    return addr.hostname;
  }
}

function assertIsNetAddr(addr: Deno.Addr): asserts addr is Deno.NetAddr {
  if (!['tcp', 'udp'].includes(addr.transport)) {
    throw new Error('Not a network address');
  }
}

function getRemoteAddress(connInfo: Deno.ServeHandlerInfo): Deno.NetAddr {
  assertIsNetAddr(connInfo.remoteAddr);
  return connInfo.remoteAddr;
}
