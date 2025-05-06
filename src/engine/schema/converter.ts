import type { OpenAPI2SchemaObject } from "./openapi.ts";
import { encodeBase64, decodeBase64 } from "jsr:@std/encoding@1.0.10/base64";

export interface ConversionOpts {
  nativeBinary: boolean;
  nativeDates: boolean;
}
export const JsonSafeConversion: ConversionOpts = {
  nativeBinary: false,
  nativeDates: false,
};
export const YamlSafeConversion: ConversionOpts = {
  nativeBinary: false,
  nativeDates: true,
};

export function fromStorage(data: unknown, schema: OpenAPI2SchemaObject, opts: ConversionOpts): unknown {
  switch (schema.type) {
    case 'string':
      if (typeof data == 'string') return data;
      return null;
    case 'boolean':
      if (data === true || data === false) return data;
      return null;
    case 'number':
      if (typeof data == 'number') return data;
      return null;
    case 'integer':
      if (typeof data == 'number') return data % 0;
      return null;
    case 'binary':
      if (typeof data == 'string') return decodeBase64(data);
      if (data?.constructor == Uint8Array) return data;
      return null;
    case 'dateTime':
      if (data instanceof Date) return new Date(data);
      if (typeof data == 'string') return new Date(data);
      return null;
    case 'array': {
      if (!data) return null;
      const childSchema = schema.items;
      if (!Array.isArray(data) || !childSchema) return null;
      if (Array.isArray(childSchema)) {
        return data.map((item, idx) => fromStorage(item, childSchema[idx], opts));
      }
      return data.map(item => fromStorage(item, childSchema, opts));
    }
    case 'object': {
      const root: Record<string,unknown> = Object.create(null);
      if (!data) return null;
      const dataRecord = data as Record<string,unknown>;
      for (const [key, value] of Object.entries(schema.properties ?? {})) {
        if (dataRecord[key] != null) {
          root[key] = fromStorage(dataRecord[key], value, opts);
        }
      }
      const missingReqs = (schema.required ?? []).filter(key => root[key] == null);
      if (missingReqs.length > 0) {
        throw new Error(`fromStorage failed: missing keys ${missingReqs}`);
      }
      return root;
    };
    default:
      console.error(schema);
      throw new Error(`fromStorage not handling ${schema.type}`);
  }
}

export function toStorage(data: unknown, schema: OpenAPI2SchemaObject, opts: ConversionOpts): unknown {
  switch (schema.type) {
    case 'string':
    case 'boolean':
    case 'number':
      if ((typeof data) == schema.type) return data;
      throw new Error(`expected ${schema.type} got ${typeof data}`);
    case 'integer':
      if (typeof data == 'number') return data % 0;
      throw new Error(`expected ${schema.type} got ${typeof data}`);
    case 'dateTime':
      if (!(data instanceof Date)) throw new Error(`expected Date got ${data?.constructor?.name}`);
      if (opts.nativeDates) return data;
      return data.toISOString();
    case 'binary':
      if (!(data instanceof Uint8Array)) throw new Error(`expected Uint8Array got ${data?.constructor?.name}`);
      if (opts.nativeBinary) return data;
      return encodeBase64(data);
    case 'array': {
      if (!Array.isArray(data)) throw new Error(`expected Array got ${typeof data}`);
      const childSchema = schema.items;
      if (!childSchema) throw new Error(`array not typed`);
      if (Array.isArray(childSchema)) {
        // throw new Error(`array (tuple?) typed wrong`);
        if (childSchema.length !== data.length) throw new Error(`Array of wrong length (${data.length})`);
        return data.map((item, idx) => toStorage(item, childSchema[idx], opts));
      }
      return data.map(item => toStorage(item, childSchema, opts));
    }
    case 'object': {
      if ((typeof data) !== schema.type) throw new Error(`expected ${schema.type} got ${typeof data}`);
      const root: Record<string,unknown> = Object.create(null);
      const dataRecord = data as Record<string,unknown>;
      const dataKeys = new Set(Object.keys(dataRecord));
      for (const [key, value] of Object.entries(schema.properties ?? {})) {
        if (dataRecord[key] != null) {
          root[key] = toStorage(dataRecord[key], value, opts);
        }
        dataKeys.delete(key);
      }
      if (dataKeys.size > 0) {
        throw new Error(`toStorage failed: extra keys: ${[...dataKeys].join(', ')}`)
      }
      const missingReqs = (schema.required ?? []).filter(key => root[key] == null);
      if (missingReqs.length > 0) {
        throw new Error(`toStorage failed: missing keys ${missingReqs.join(', ')}`);
      }
      return root;
    };
    default:
      console.error(schema);
      throw new Error(`toStorage not handling ${schema.type}`);
  }
}
