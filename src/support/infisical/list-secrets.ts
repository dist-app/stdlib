// https://infisical.com/docs/api-reference/endpoints/secrets/list

import { type InfisicalApiClient } from "./mod.ts";

export type ListSecretsQuery = {
  metadataFilter?: string; // The secret metadata key-value pairs to filter secrets by. When querying for multiple metadata pairs, the query is treated as an AND operation. Secret metadata format is key=value1,value=value2|key=value3,value=value4.
  workspaceId?: string; // The ID of the project to list secrets from.
  workspaceSlug?: string; // The slug of the project to list secrets from. This parameter is only applicable by machine identities.
  environment?: string; // The slug of the environment to list secrets from.
  secretPath?: string; // The secret path to list secrets from.
  viewSecretValue?: boolean; // Whether or not to retrieve the secret value.
  expandSecretReferences?: boolean; // Whether or not to expand secret references.
  recursive?: boolean; // Whether or not to fetch all secrets from the specified base path, and all of its subdirectories. Note, the max depth is 20 deep.
  include_imports?: boolean; // Weather to include imported secrets or not.
  tagSlugs?: string; // The comma separated tag slugs to filter secrets.
};
export type ListSecretsResponse = {
  "secrets": Array<SecretDetails>;
  "imports": Array<{
    "secretPath": string;
    "environment": string;
    "folderId": string;
    "secrets": Array<SecretDetails>;
  }>;
};

export async function listSecrets(
  client: InfisicalApiClient,
  query: ListSecretsQuery,
) {
  return await client.fetchJsonApi('v3/secrets/raw', {
    query: new URLSearchParams(query as any), // fuck it, type system
  }) as ListSecretsResponse;
}

export type SecretDetails = {
  "id": string;
  "workspace": string;
  "environment": string;
  "version": number;
  "type": string;
  "secretKey": string;
  "secretValue": string;
  "secretComment": string;
  "secretReminderNote": string;
  "secretReminderRepeatDays": number;
  "skipMultilineEncoding": boolean;
  "createdAt": string;
  "updatedAt": string;
  "actor": {
    "actorId": string;
    "actorType": string;
    "name": string;
    "membershipId": string;
  };
  "secretPath": string;
  "secretValueHidden": true,
  "secretMetadata": Array<{
    "key": string;
    "value": string;
  }>;
  "tags": Array<{
    "id": string;
    "slug": string;
    "color": string;
    "name": string;
  }>;
};
