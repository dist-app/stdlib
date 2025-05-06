import { type OpenAPI2SchemaObject } from "./schema/openapi.ts";

export interface ApiKindEntity extends Record<string,unknown> {
  apiVersion: string;
  kind: string;
  metadata: EntityMetadata & Record<string,unknown>;
}

export interface EntityMetadata {
  name: string;
  creationTimestamp?: Date;
  generation?: number;
  uid?: string, // TODO: rename to uuid?

  // kubernetes inspired
  updateTimestamp?: Date;
  ownerReferences?: Array<{
    apiVersion: string;
    kind: string;
    name: string;
    uid?: string; // this is required in kubernetes
    blockOwnerDeletion?: boolean;
    controller?: boolean;
  }>;
  labels?: Record<string,string|undefined>;
  annotations?: Record<string,string|undefined>;

  // backstage inspired
  title?: string;
  description?: string;
  tags?: Array<string>;
  links?: Array<{
    url: string;
    title?: string;
    icon?: string;
    type?: string;
  }>;
}

export interface EntityHandle<Tself extends ApiKindEntity> {
  snapshot: Tself | null;

  readonly coords: {
    apiVersion: Tself["apiVersion"],
    apiKind: Tself["kind"],
    name: string;
  };

  getNeighborHandle<Tother extends ApiKindEntity>(
    apiVersion: Tother["apiVersion"],
    apiKind: Tother["kind"],
    name: string,
  ): EntityHandle<Tother>;

  /** @deprecated Prefer EntitySnapshot.followOwnerReference once available */
  followOwnerReference<Towner extends ApiKindEntity>(
    apiVersion: Towner["apiVersion"],
    apiKind: Towner["kind"],
  ): Promise<EntityHandle<Towner> | null>;

  get(): Promise<Tself | null>;
  insert(
    entity: Omit<Tself, 'apiVersion' | 'kind'> & {metadata?: {name?: undefined}},
  ): Promise<void>;
  insertNeighbor<Tother extends ApiKindEntity>(
    neighbor: Tother,
  ): Promise<EntityHandle<Tother> | null>;
  mutate(mutationCb: MutationOptions<Tself>): Promise<void>;
  delete(): Promise<boolean>;
}

export interface EntitySnapshot<Tself extends ApiKindEntity> {
  readonly snapshot: Tself;
  readonly handle: EntityHandle<Tself>;

  followOwnerReference<Towner extends ApiKindEntity>(
    apiVersion: Towner["apiVersion"],
    apiKind: Towner["kind"],
  ): Promise<EntityHandle<Towner> | null>;
}

// TODO: solidfiy what we need to know about entities
export interface EntityApiDefinition/*<T extends ApiKindEntity = ApiKindEntity>*/ {
  name: string;
  kinds: Record<string, EntityKindEntity>;
  // types?: Record<string, T>;
}

export interface EntityEngine {
  readonly apiImpls: Map<string, {
    storage: EntityStorage;
    definition: EntityApiDefinition;
  }>;

  addApi(
    apiName: string,
    storage: EntityStorage,
    definition: EntityApiDefinition,
  ): void;
  insertEntity<T extends ApiKindEntity>(
    entity: T,
  ): Promise<EntityHandle<T>>;
  listEntities<T extends ApiKindEntity>(
    apiVersion: T["apiVersion"],
    kind: T["kind"],
  ): Promise<T[]>;
  listEntityHandles<T extends ApiKindEntity>(
    apiVersion: T["apiVersion"],
    kind: T["kind"],
  ): Promise<EntityHandle<T>[]>;
  observeEntities<T extends ApiKindEntity>(
    apiVersion: T["apiVersion"],
    kind: T["kind"],
    opts: {
      signal: AbortSignal;
      // filterCb?: (entity: T) => boolean;
    },
  ): ReadableStream<StreamEvent<T>>;
  getEntity<T extends ApiKindEntity>(
    apiVersion: T["apiVersion"],
    kind: T["kind"],
    name: string
  ): Promise<T | null>;
  getEntityHandle<T extends ApiKindEntity>(
    apiVersion: T["apiVersion"],
    apiKind: T["kind"],
    name: string
  ): EntityHandle<T>;
  updateEntity<T extends ApiKindEntity>(
    newEntity: T,
  ): Promise<void>;
  mutateEntity<T extends ApiKindEntity>(
    apiVersion: T["apiVersion"],
    kind: T["kind"],
    name: string,
    mutation: MutationOptions<T>,
  ): Promise<void>;
  deleteEntity<T extends ApiKindEntity>(
    apiVersion: T["apiVersion"],
    kind: T["kind"],
    name: string
  ): Promise<boolean>;
}


export interface EntityStorage {
  insertEntity<T extends ApiKindEntity>(definition: EntityKindEntity, entity: T): Promise<void>;
  /** @deprecated to be replaced with an external helper function */ listAllEntities?(): Promise<ApiKindEntity[]>;
  listEntities<T extends ApiKindEntity>(definition: EntityKindEntity, apiVersion: T["apiVersion"], kind: T["kind"]): Promise<T[]>;
  observeEntities<T extends ApiKindEntity>(definition: EntityKindEntity, apiVersion: T["apiVersion"], kind: T["kind"], signal: AbortSignal): ReadableStream<StreamEvent<T>>;
  getEntity<T extends ApiKindEntity>(definition: EntityKindEntity, apiVersion: T["apiVersion"], kind: T["kind"], name: string): Promise<T | null>;
  updateEntity<T extends ApiKindEntity>(definition: EntityKindEntity, newEntity: T): Promise<void>;
  deleteEntity<T extends ApiKindEntity>(definition: EntityKindEntity, apiVersion: T["apiVersion"], kind: T["kind"], name: string): Promise<boolean>;
  // TODO: add some sort of API for 'submissions' (either entity spec/status or fetch request/response)
}

export type StreamEvent<T extends ApiKindEntity> =
  | {
    kind:
      | 'InSync'
      | 'LostSync'
      | 'Bookmark'
    ;
  }
  | {
    kind:
      | 'Creation'
      | 'Mutation'
      | 'Deletion'
    ;
    snapshot: T;
  }
  | {
    kind: 'Error';
    message: string;
  }
;

export type MutationOptions<T extends ApiKindEntity> =
  | ((x: T) => void | symbol)
  | {
    mutationCb: (x: T) => void | symbol;
    creationCb: () => T;
  };

export interface EntityKindEntity extends ApiKindEntity {
  apiVersion: "schema.dist.app/v1alpha1";
  kind: "EntityKind";
  spec: {
    group: string;
    names: {
      plural: string;
      singular: string;
      kind: string;
      shortNames?: Array<string>;
    };
    versions: Array<{
      name: string;
      served: boolean;
      storage: boolean;
      subresources?: {
        status?: boolean;
      };
      schema?: {
        openAPIV3Schema?: OpenAPI2SchemaObject;
        // {
        //   type: 'object';
        //   properties: {}; // TODO: OpenAPI Schema types
        // };
      };
    }>,
  };
}
