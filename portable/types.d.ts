

// not sure if this is enough
export interface ApiKindEntity extends Record<string,unknown> {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    creationTimestamp?: Date;
    generation?: number;
    uuid?: string,
  } & Record<string,unknown>;
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
