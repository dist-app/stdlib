import type { DdpInterface } from "./mod.ts";

export function registerOtlpMethods(ddp: DdpInterface) {
  const otlpEndpoint = Deno.env.get('OTEL_EXPORTER_OTLP_ENDPOINT');
  if (!otlpEndpoint) return;

  ddp.addMethod('OTLP/server-time', () => Date.now());
  ddp.addMethod('OTLP/v1/traces', async (_socket, params) => {
    const resp = await fetch(`${otlpEndpoint}/v1/traces`, {
      method: 'POST',
      body: JSON.stringify(params[0]),
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
      },
    });
    if (!resp.ok) throw new Error(`OTLP submission error: HTTP ${resp.status}`);
    return await resp.json();
  });
}
