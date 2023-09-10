import { ArbitraryEntity } from "../apis/meta.ts";
import { EntityEngine } from "./engine.ts";

export class EntityHandle<Tself extends ArbitraryEntity> {
  constructor(
    private readonly engine: EntityEngine,
    public readonly coords: {
      apiVersion: Tself["apiVersion"],
      apiKind: Tself["kind"],
      namespace: string;
      name: string;
    },
  ) {
    // this.snapshot = engine.getEntity<Tself>(coords.apiVersion, coords.apiKind, coords.namespace, coords.name);
  }
  // snapshot: Tself | null;

  getNeighborHandle<Tother extends ArbitraryEntity>(
    apiVersion: Tother["apiVersion"],
    apiKind: Tother["kind"],
    name: string,
  ): EntityHandle<Tother> {
    return this.engine.getEntityHandle<Tother>(
      apiVersion, apiKind,
      this.coords.namespace, name);
  }

  async get() {
    return await this.engine.getEntity<Tself>(
      this.coords.apiVersion, this.coords.apiKind,
      this.coords.namespace, this.coords.name);
  }

  async insertNeighbor<Tother extends ArbitraryEntity>(
    neighbor: Tother,
  ) {
    await this.engine.insertEntity<Tother>({
      ...neighbor,
      metadata: {
        ...neighbor.metadata,
        namespace: this.coords.namespace,
      },
    });

    return this.getNeighborHandle<Tother>(
      neighbor.apiVersion, neighbor.kind,
      neighbor.metadata.name);
  }

  async mutate(mutationCb: (x: Tself) => void | symbol) {
    return await this.engine.mutateEntity<Tself>(
      this.coords.apiVersion, this.coords.apiKind,
      this.coords.namespace, this.coords.name,
      mutationCb);
  }

  async delete() {
    return await this.engine.deleteEntity<Tself>(
      this.coords.apiVersion, this.coords.apiKind,
      this.coords.namespace, this.coords.name);
  }

  async followOwnerReference<Towner extends ArbitraryEntity>(
    apiVersion: Towner["apiVersion"],
    apiKind: Towner["kind"],
  ) {
    const snapshot = await this.get();

    const ownerName = snapshot?.metadata.ownerReferences
      ?.find(x => x.apiVersion == apiVersion && x.kind == apiKind)?.name;
    if (!ownerName) return null;

    return this.engine.getEntityHandle<Towner>(apiVersion, apiKind, this.coords.namespace, ownerName);
  }
}
