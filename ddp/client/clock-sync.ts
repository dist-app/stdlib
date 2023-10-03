import type { DDPClient } from "./ddp-client.ts";

/** Very simple one-shot clock difference between client and server */
export async function discoverClockOffset(client: DDPClient) {
  const d0 = Date.now();
  const dS = await client.callMethod<number>('OTLP/server-time', []);
  const dT = Date.now();

  const rtt = dT - d0;
  const offset = dS - (d0 + rtt / 2);
  console.log({ d0, dS, dT, rtt, offset });

  // Let's not make a big mess if the offset is (falsely) large
  if (Math.abs(offset) > 5000) {
    console.log('Clock offset unbelievable:', offset);
    return 0;
  }

  return offset;
}
