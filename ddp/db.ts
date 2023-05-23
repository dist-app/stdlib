import { ArbitraryEntity } from "../../apis/arbitrary.ts";

export interface ProfileDoc {
  _id: string;
  createdAt: Date;
  description?: string;
  members: Array<{
    basicRole: 'Viewer' | 'Editor' | 'Owner';
    userId: string;
  }>;
  layers: Array<{
    // namespace: string;
    backingUrl: string;
    // mode: 'ReadOnly' | 'ReadWrite' | 'WriteOnly';
    apiFilters: Array<{
      apiGroup?: string;
      apiVersion?: string;
      kind?: string;
    }>;
  }>;
}

export interface CatalogDoc {
  _id: string;
  createdAt: Date;
  description?: string;
  // catalogId: string;
  accessRules: Array<{
    mode: 'ReadOnly' | 'ReadWrite' | 'WriteOnly';
    subject: string;
  }>;
  // backingStore: {
  //   type: 'dynamic',
  // },
  apiFilters: Array<{
    apiGroup?: string;
    apiVersion?: string;
    kind?: string;
  }>;
}


export type EntityDoc = ArbitraryEntity & {
  _id: string;
  catalogId: string;
  // layerId: string;
  // entity: ArbitraryEntity;
}
