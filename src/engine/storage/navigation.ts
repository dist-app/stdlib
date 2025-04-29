import type { ApiKindEntity, EntityKindEntity, EntityStorage, StreamEvent } from "../types.ts";

interface OurNavigationState {
  entities: Array<ApiKindEntity>;
}
type NavigationApi = EventTarget & {
  currentEntry?: {
    getState: () => OurNavigationState | undefined;
  };
  updateCurrentEntry: (props: {
    state: OurNavigationState;
  }) => unknown;
}

/**
 * A low-throughput low-capacity context-local entity catalog.
 * Integrated with the browser's navigation history.
 *
 * NOTE: Not currently available in Firefox, per MDN.
 *
 * Should handle all of:
 *   - backward/forward/reload navigations
 *   - user duplicating the tab
 *   - user opening a previous history into a new tab
 *   - session restores (tab crash, idle tab disposal, system reboots)
 */
export class NavigationStorage implements EntityStorage {
  constructor(
    //@ts-ignore window.navigation is untyped in deno-ts, but not in JSR
    private readonly navigation: NavigationApi = globalThis.navigation ?? {},
  ) {
    if (!navigation.currentEntry || !navigation.updateCurrentEntry) {
      throw new Error(`NavigationStorage is not available in the current browser.`);
    }
    navigation.addEventListener("currententrychange", () => {
      // TODO: this should notify any observers
      const entities = this.currentEntities();
      console.log('navigation state changed to', entities);
    });
  }

  private currentEntities() {
    return this.navigation.currentEntry?.getState()?.entities ?? [];
  }
  private updateEntities(entities: Array<ApiKindEntity>) {
    this.navigation.updateCurrentEntry({
      state: {
        entities,
      },
    });
  }

  // listAllEntities(): Promise<ApiKindEntity[]> {
  //   return Promise.resolve(this.currentEntities());
  // }
  listEntities<T extends ApiKindEntity>(
    definition: EntityKindEntity,
    apiVersion: T["apiVersion"],
    kind: T["kind"]
  ): Promise<T[]> {
    return Promise.resolve(filterByKind(this.currentEntities(), apiVersion, kind));
  }
  observeEntities<T extends ApiKindEntity>(
    definition: EntityKindEntity,
    apiVersion: T["apiVersion"],
    kind: T["kind"],
    signal?: AbortSignal,
  ): ReadableStream<StreamEvent<T>> {
    throw new Error("Method not implemented.");
  }
  getEntity<T extends ApiKindEntity>(
    definition: EntityKindEntity,
    apiVersion: T["apiVersion"],
    kind: T["kind"],
    name: string,
    ): Promise<T|null> {
    return Promise.resolve(findByName(this.currentEntities(), apiVersion, kind, name));
  }

  insertEntity<T extends ApiKindEntity>(
    definition: EntityKindEntity,
    entity: T,
  ): Promise<void> {
    const entities = this.currentEntities();

    if (!entity.metadata.name) throw new Error(`name is required`);
    if (findByName(entities, entity.apiVersion, entity.kind, entity.metadata.name)) {
      throw new Error(`Can't insertEntity over existing item`);
    }

    this.updateEntities([
      ...entities,
      {
        ...entity,
        metadata: {
          ...entity.metadata,
          creationTimestamp: new Date(),
          generation: 1,
          uid: crypto.randomUUID(),
        },
      },
    ]);
    return Promise.resolve();
  }
  updateEntity<T extends ApiKindEntity>(
    definition: EntityKindEntity,
    entity: T,
  ): Promise<void> {
    const entities = this.currentEntities();

    if (!entity.metadata.name) throw new Error(`name is required`);
    const existing = findByName(entities, entity.apiVersion, entity.kind, entity.metadata.name);

    if (!existing) throw new Error(`doc didn't exist`);
    if (existing.metadata.generation !== entity.metadata.generation) {
      throw new Error(`doc is out of date`);
    }

    this.updateEntities([
      ...entities.filter(x => x !== existing),
      {
        ...entity,
        metadata: {
          ...entity.metadata,
          creationTimestamp: existing.metadata.creationTimestamp,
          generation: (existing.metadata.generation ?? 0) + 1,
          uid: existing.metadata.uid,
        },
      },
    ]);
    return Promise.resolve();
  }

  deleteEntity<T extends ApiKindEntity>(
    definition: EntityKindEntity,
    apiVersion: T["apiVersion"],
    kind: T["kind"],
    name: string,
  ): Promise<boolean> {
    const entities = this.currentEntities();

    if (!name) throw new Error(`name is required`);
    const existing = findByName(entities, apiVersion, kind, name);

    // TODO: confirm generation before deleting
    // if (existing.metadata.generation !== entity.metadata.generation) {
    //   throw new Error(`doc is out of date`);
    // }

    this.updateEntities(entities.filter(x => x !== existing));
    return Promise.resolve(existing ? true : false);
  }
}

function filterByKind<T extends ApiKindEntity>(
  entities: Array<ApiKindEntity>,
  apiVersion: T["apiVersion"],
  kind: T["kind"],
): T[] {
  return entities.flatMap(x => {
    if (x.apiVersion !== apiVersion) return [];
    if (x.kind !== kind) return [];
    return [x as T];
  });
}

function findByName<T extends ApiKindEntity>(
  entities: Array<ApiKindEntity>,
  apiVersion: T["apiVersion"],
  kind: T["kind"],
  name: string,
): T | null {
  return entities.find(x => {
    if (x.apiVersion !== apiVersion) return false;
    if (x.kind !== kind) return false;
    return x.metadata.name === name;
  }) as T | null;
}
