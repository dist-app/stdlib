import type { StreamEvent, EntityHandle, EntityEngine, EntityApiDefinition, EntityKindEntity } from "../types.ts";

export const EntityKindEntityKind: EntityKindEntity = {
  apiVersion: 'schema.dist.app/v1alpha1',
  kind: 'EntityKind',
  metadata: {
    name: 'entitykinds.schema.dist.app',
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

// TODO: generate from the declared interface somehow
/** Experimentation with what generated code could look like */
export class SchemaApi {
  static readonly definition: EntityApiDefinition = {
    name: 'schema.dist.app/v1alpha1',
    kinds: {
      'EntityKind': EntityKindEntityKind,
    },
  }

  constructor(
    private readonly engine: EntityEngine,
  ) {}

  // Methods for kind: EntityKind
  async insertEntityKind(entity: Pick<EntityKindEntity, 'metadata' | 'spec'>): Promise<EntityHandle<EntityKindEntity>> {
    return await this.engine.insertEntity<EntityKindEntity>({
      ...entity,
      apiVersion: 'schema.dist.app/v1alpha1',
      kind: 'EntityKind',
    });
  }
  async listEntityKinds(): Promise<Array<EntityKindEntity>> {
    return await this.engine.listEntities<EntityKindEntity>('schema.dist.app/v1alpha1', 'EntityKind');
  }
  observeEntityKinds(signal: AbortSignal): ReadableStream<StreamEvent<EntityKindEntity>> {
    return this.engine.observeEntities<EntityKindEntity>('schema.dist.app/v1alpha1', 'EntityKind', { signal });
  }
  async getEntityKind(name: string): Promise<EntityKindEntity | null> {
    return await this.engine.getEntity<EntityKindEntity>('schema.dist.app/v1alpha1', 'EntityKind', name);
  }
  async updateEntityKind(entity: Pick<EntityKindEntity, 'metadata' | 'spec'>): Promise<void>  {
    return await this.engine.updateEntity<EntityKindEntity>({
      ...entity,
      apiVersion: 'schema.dist.app/v1alpha1',
      kind: 'EntityKind',
    });
  }
  async deleteEntityKind(name: string): Promise<boolean> {
    return await this.engine.deleteEntity<EntityKindEntity>('schema.dist.app/v1alpha1', 'EntityKind', name);
  }

}
