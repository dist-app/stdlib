import { TextLineStream } from "@std/streams/text-line-stream";

export class SubhostingApiClient {
  constructor(private readonly props: {
    serverUrl?: string;
    organizationId: string;
    tokenFactory: () => string | Promise<string>;
  }) {}

  async fetchApiResponse({path, ...opts}: RequestInit & {
    path: string;
    // query?: URLSearchParams;
  }): Promise<Response> {
    const url = new URL(path, this.props.serverUrl ?? 'https://api.deno.com/');
    const headers = new Headers(opts.headers);
    headers.set('authorization', 'Bearer '+await this.props.tokenFactory());
    const resp = await fetch(url, { ...opts, headers });
    if (!resp.ok) throw new Error(
      `Deno Deploy Subhosting ${path} returned HTTP ${resp.status}: ${await resp.text()}`);
    return resp;
  }
  async fetchJsonApi<T=unknown>({bodyJson, ...opts}: RequestInit & {
    bodyJson?: unknown;
    path: string;
    query?: URLSearchParams;
  }): Promise<T> {
    const headers = new Headers(opts.headers);
    headers.set('accept', 'application/json');
    if (bodyJson) {
      // headers.set('content-type', 'application/json');
      opts.body = JSON.stringify(bodyJson);
    }
    const resp = await this.fetchApiResponse({ ...opts, headers });
    return await resp.json() as T;
  }


  async createProject(spec: {
    name: string | null;
    description: string;
  }): Promise<ProjectRecord> {
    return await this.fetchJsonApi<ProjectRecord>({
      path: `v1/organizations/${this.props.organizationId}/projects`,
      method: "POST",
      bodyJson: spec,
    });
  }

  async listProjects(): Promise<Array<ProjectRecord>> {
    return await this.fetchJsonApi<Array<ProjectRecord>>({
      path: `/v1/organizations/${this.props.organizationId}/projects`,
      method: "GET",
      headers: {
        // "content-type": "application/json",
      },
    });
  }

  async createDomain(spec: {
    domain: string;
  }): Promise<DomainRecord> {
    return await this.fetchJsonApi<DomainRecord>({
      path: `/v1/organizations/${this.props.organizationId}/domains`,
      method: "POST",
      headers: {
        // "content-type": "application/json",
      },
      body: JSON.stringify(spec),
    });
  }

  async verifyDomain(domainId: string): Promise<void> {
    await this.fetchJsonApi<void>({
      path: `/v1/domains/${domainId}/verify`,
      method: "POST",
    });
  }

  async uploadCertificate(domainId: string, spec: {
    privateKey: string;
    certificateChain: string;
  }): Promise<void> {
    await this.fetchJsonApi<void>({
      path: `/v1/domains/${domainId}/certificates`,
      method: "POST",
      headers: {
        // "content-type": "application/json",
      },
      body: JSON.stringify(spec),
    });
  }

  async provisionCertificate(domainId: string): Promise<void> {
    await this.fetchJsonApi<void>({
      path: `/v1/domains/${domainId}/certificates/provision`,
      method: "POST",
    });
  }

  async listDatabases(): Promise<Array<DatabaseRecord>> {
    return await this.fetchJsonApi<Array<DatabaseRecord>>({
      path: `/v1/organizations/${this.props.organizationId}/databases`,
      method: "GET",
      headers: {
        // "content-type": "application/json",
      },
    });
  }

  async createDatabase(spec: {
    "description": string;
  }): Promise<DatabaseRecord> {
    return await this.fetchJsonApi<DatabaseRecord>({
      path: `/v1/organizations/${this.props.organizationId}/databases`,
      method: "POST",
      headers: {
        // "content-type": "application/json",
      },
      body: JSON.stringify(spec),
    });
  }

  async createDeployment(projectId: string, spec: {
    "entryPointUrl": string; // "main.ts",
    "importMapUrl"?: string;
    "lockFileUrl"?: string;
    "envVars": Record<string,string>;
    "description"?: string; // "My first deployment",
    "databases"?: Record<string,string>;
    "assets": Record<string, Asset>;
  }): Promise<DeploymentRecord> {
    return await this.fetchJsonApi<DeploymentRecord>({
      path: `/v1/projects/${projectId}/deployments`,
      method: "POST",
      headers: {
        // "content-type": "application/json",
      },
      body: JSON.stringify(spec),
    });
  }
  async listDeployments(projectId: string): Promise<Array<DeploymentRecord>> {
    return await this.fetchJsonApi<Array<DeploymentRecord>>({
      path: `/v1/projects/${projectId}/deployments`,
      method: "GET",
      headers: {
      },
    });
  }
  async getDeployment(deploymentId: string): Promise<DeploymentRecord> {
    return await this.fetchJsonApi<DeploymentRecord>({
      path: `/v1/deployments/${deploymentId}`,
      method: "GET",
      headers: {
      },
    });
  }
  async deleteDeployment(deploymentId: string): Promise<void> {
    return await this.fetchJsonApi<void>({
      path: `/v1/deployments/${deploymentId}`,
      method: "DELETE",
      headers: {
      },
    });
  }

  async listDomains(): Promise<Array<DomainRecord>> {
    return await this.fetchJsonApi<Array<DomainRecord>>({
      path: `/v1/organizations/${this.props.organizationId}/domains`,
      method: "GET",
      headers: {
        // "content-type": "application/json",
      },
    });
  }

  async associateDomain(domainId: string, spec: {
    deploymentId: string | null;
  }): Promise<void> {
    return await this.fetchJsonApi<void>({
      path: `/v1/domains/${domainId}`,
      method: "PATCH",
      headers: {
        // "content-type": "application/json",
      },
      body: JSON.stringify(spec),
    });
  }

  async streamDeploymentLog(deploymentId: string, signal: AbortSignal): Promise<ReadableStream<{
    level: 'info' | 'error';
    message: string;
  }>> {
    const resp = await this.fetchApiResponse({
      path: `/v1/deployments/${deploymentId}/build_logs`,
      method: "GET",
      headers: {
        "accept": 'application/x-ndjson',
      },
      signal,
    });
    if (!resp.body) throw new Error(`Deno Deploy gave no body in stream`);
    return resp.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream())
      .pipeThrough(new TransformStream({
        transform(line, ctlr) {
          ctlr.enqueue(JSON.parse(line));
        },
      }));
  }

}

export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface DomainRecord {
  id: string;
  organizationId: string;
  domain: string;
  token: string;
  isValidated: boolean;
  certificates: Array<{
    cipher: "rsa" | "ec";
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
  }>;
  provisioningStatus: {
    message?: string;
    code: "manual" | "success" | "failed" | "pending";
  };
  deploymentId?: string | null;
  dnsRecords: Array<{
    type: "A" | "AAAA" | "CNAME";
    name: string;
    content: string;
  }>;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export interface Asset { // "main.ts"
  "kind": "file";
  "content": string;
  "encoding"?: "utf-8" | "base64";
};
export interface DeploymentRecord {
  id: string;
  projectId: string;
  description: string | null; // wrongly false?
  status: "pending" | "success" | "failed";
  domains?: Array<string>;
  databases: Record<string,string>;
  requestTimeout: null;
  permissions: null | { net: null };
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface DatabaseRecord {
  id: string;
  organizationId: string;
  description: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}
