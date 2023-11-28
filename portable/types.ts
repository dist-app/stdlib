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

  updateTimestamp?: Date;
  title?: string;
  description?: string;
  labels?: Record<string,string|undefined>;
  annotations?: Record<string,string|undefined>;
  tags?: Array<string>;
  links?: Array<{
    url: string;
    title?: string;
    icon?: string;
    type?: string;
  }>;
  ownerReferences?: Array<{
    apiVersion: string;
    kind: string;
    name: string;
    uid?: string; // this is required in kubernetes
    blockOwnerDeletion?: boolean;
    controller?: boolean;
  }>;
}

export interface EntityStorage {
  insertEntity<T extends ApiKindEntity>(entity: T): Promise<void>;
  listAllEntities(): Promise<ApiKindEntity[]>;
  listEntities<T extends ApiKindEntity>(apiVersion: T["apiVersion"], kind: T["kind"]): Promise<T[]>;
  observeEntities<T extends ApiKindEntity>(apiVersion: T["apiVersion"], kind: T["kind"], signal?: AbortSignal): ReadableStream<StreamEvent<T>>;
  getEntity<T extends ApiKindEntity>(apiVersion: T["apiVersion"], kind: T["kind"], name: string): Promise<T | null>;
  updateEntity<T extends ApiKindEntity>(newEntity: T): Promise<void>;
  deleteEntity<T extends ApiKindEntity>(apiVersion: T["apiVersion"], kind: T["kind"], name: string): Promise<boolean>;
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
