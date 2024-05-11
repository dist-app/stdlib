import type { EntityEngine } from "../engine.ts";
import type { ApiKindEntity } from "../types.ts";
import type { OpenAPI2SchemaObject } from "./openapi.ts";


export const EntityKindEntityKind: EntityKindEntity = {
  apiVersion: 'schema.dist.app/v1alpha1',
  kind: 'EntityKind',
  metadata: {
    name: 'EntityKinds.login-server.dist.app',
  },
  spec: {
    group: 'schema.dist.app',
    names: {
      kind: 'EntityKind',
      plural: 'entitykinds',
      singular: 'entitykind',
      shortNames: [],
    },
    versions: [{
      name: 'v1alpha1',
      served: true,
      storage: true,
      schema: {
        openAPIV3Schema: {
          type: 'object',
          properties: {
            'spec': {
              type: 'object',
              required: ['group', 'names', 'versions'],
              properties: {
                'group': { type: 'string' },
                'names': {
                  type: 'object',
                  required: ['plural', 'singular', 'kind'],
                  properties: {
                    'plural': { type: 'string' },
                    'singular': { type: 'string' },
                    'kind': { type: 'string' },
                    'shortNames': { type: 'array', items: {
                      type: 'string',
                    }},
                  },
                },
                'versions': { type: 'array', items: {
                  type: 'object',
                  required: ['name', 'served', 'storage'],
                  properties: {
                    'name': { type: 'string' },
                    'served': { type: 'boolean' },
                    'storage': { type: 'boolean' },
                    'subresources': {
                      type: 'object',
                      properties: {
                        'status': { type: 'boolean' },
                      },
                    },
                    'schema': {
                      type: 'object',
                      properties: {
                        'openAPIV3Schema': {
                          type: 'object',
                          // TODO: better typing for api schemas?
                          additionalProperties: true,
                        },
                      },
                    },
                  },
                } },
              },
            },
          },
        },
      },
    }],
  },
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


// TODO: solidfiy what we need to know about entities
// also where should this live?
export interface EntityApiDefinition<T extends ApiKindEntity = ApiKindEntity> {
  name: string;
  kinds: Record<string, EntityKindEntity>;
  // types?: Record<string, T>;
}


/** Experimentation with what generated code could look like */
export class SchemaApi {
  static readonly definition: EntityApiDefinition<
    | EntityKindEntity
  > = {
    name: 'schema.dist.app',
    kinds: {
      'EntityKind': EntityKindEntityKind,
    },
  }

  constructor(
    private readonly engine: EntityEngine,
  ) {}

  // Methods for kind: EntityKind
  async insertEntityKind(entity: Pick<EntityKindEntity, 'metadata' | 'spec'>) {
    return await this.engine.insertEntity<EntityKindEntity>({
      ...entity,
      apiVersion: 'schema.dist.app/v1alpha1',
      kind: 'EntityKind',
    });
  }
  async listEntityKinds() {
    return await this.engine.listEntities<EntityKindEntity>('schema.dist.app/v1alpha1', 'EntityKind');
  }
  observeEntityKinds(signal: AbortSignal) {
    return this.engine.observeEntities<EntityKindEntity>('schema.dist.app/v1alpha1', 'EntityKind', { signal });
  }
  async getEntityKind(name: string) {
    return await this.engine.getEntity<EntityKindEntity>('schema.dist.app/v1alpha1', 'EntityKind', name);
  }
  async updateEntityKind(entity: Pick<EntityKindEntity, 'metadata' | 'spec'>) {
    return await this.engine.updateEntity<EntityKindEntity>({
      ...entity,
      apiVersion: 'schema.dist.app/v1alpha1',
      kind: 'EntityKind',
    });
  }
  async deleteEntityKind(name: string) {
    return await this.engine.deleteEntity<EntityKindEntity>('schema.dist.app/v1alpha1', 'EntityKind', name);
  }

}
