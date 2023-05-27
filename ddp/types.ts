export type ClientSentPacket = {
  msg: 'ping' | 'pong';
  id?: string;
} | {
  msg: 'connect';
  version: string;
  support: string[];
} | {
  msg: 'method';
  id: string;
  method: string;
  params: unknown[];
  randomSeed?: string;
} | {
  msg: 'sub';
  id: string;
  name: string;
  params: unknown[];
} | {
  msg: 'unsub';
  id: string;
};

export interface MeteorError {
  isClientSafe?: boolean;
  error?: number | string;
  reason?: string;
  message?: string;
  details?: string;
  errorType?: string; // e.g. "Meteor.Error"
};

export type ServerSentPacket = {
  msg: 'ping' | 'pong';
  id?: string;
} | {
  msg: 'connected';
  session: string;
} | {
  msg: 'failed';
  version: string;
} | {
  msg: 'ready';
  subs: string[];
} | {
  msg: 'nosub';
  id: string;
  error?: MeteorError;
} | {
  msg: 'updated';
  methods: string[];
} | {
  msg: 'result';
  id: string;
  result?: unknown;
  error?: undefined;
} | {
  msg: 'result';
  id: string;
  result?: undefined;
  error: MeteorError;
} | {
  msg: 'added';
  collection: string;
  id: string;
  fields?: Record<string, unknown>;
} | {
  msg: 'changed';
  collection: string;
  id: string;
  fields?: Record<string, unknown>;
  cleared?: Record<string, unknown>;
} | {
  msg: 'removed';
  collection: string;
  id: string;
} | {
  msg: 'addedBefore';
  collection: string;
  id: string;
  fields?: Record<string, unknown>;
  before: string | null;
} | {
  msg: 'movedBefore';
  collection: string;
  id: string;
  before: string | null;
} | {
  msg: 'error';
  reason: string;
  offendingMessage?: ClientSentPacket;
};

export type DocumentPacket = ServerSentPacket & {msg: 'added' | 'changed' | 'removed' | 'addedBefore' | 'movedBefore'};
