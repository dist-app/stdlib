import {
  type EntityApiDefinition,
  type EntityEngine,
  type MutationOptions,
  type EntityKindEntity,
} from "../../engine/types.ts";

import * as entities from "./entities.ts";
export * from "./entities.ts";

export const UserDefinition: EntityKindEntity = {
  apiVersion: 'schema.dist.app/v1alpha1',
  kind: 'EntityKind',
  metadata: {
    name: 'users.login-server.dist.app',
  },
  spec: {
    group: 'login-server.dist.app',
    names: {
      kind: 'User',
      plural: 'users',
      singular: 'user',
      shortNames: [],
    },
    versions: [{
      name: 'v1alpha1',
      served: true,
      storage: true,
      schema: {
        openAPIV3Schema: {
          "properties": {
            "spec": {
              "properties": {
                "lifecycle": {
                  "title": "UserEntity.spec.lifecycle",
                  "type": "string",
                  "enum": [
                    "Pending",
                    "Active",
                    "Inactive"
                  ]
                },
                "profile": {
                  "properties": {
                    "contactEmail": {
                      "title": "UserEntity.spec.profile.contactEmail",
                      "type": "string"
                    },
                    "displayName": {
                      "title": "UserEntity.spec.profile.displayName",
                      "type": "string"
                    }
                  },
                  "additionalProperties": false,
                  "title": "UserEntity.spec.profile",
                  "type": "object"
                },
                "foreignIdentity": {
                  "properties": {
                    "issuer": {
                      "title": "UserEntity.spec.foreignIdentity.issuer",
                      "type": "string"
                    },
                    "subject": {
                      "title": "UserEntity.spec.foreignIdentity.subject",
                      "type": "string"
                    },
                    "username": {
                      "title": "UserEntity.spec.foreignIdentity.username",
                      "type": "string"
                    },
                    "lastSeen": {
                      "title": "UserEntity.spec.foreignIdentity.lastSeen",
                      "type": "dateTime"
                    }
                  },
                  "required": [
                    "issuer",
                    "subject"
                  ],
                  "additionalProperties": false,
                  "title": "UserEntity.spec.foreignIdentity",
                  "type": "object"
                }
              },
              "required": [
                "lifecycle",
                "profile"
              ],
              "additionalProperties": false,
              "title": "UserEntity.spec",
              "type": "object"
            }
          },
          "required": [
            "spec"
          ],
          "additionalProperties": false,
          "title": "UserEntity",
          "type": "object"
        },
      },
      subresources: {
        status: false,
      },
    }],
  },
};

export const UserSessionDefinition: EntityKindEntity = {
  apiVersion: 'schema.dist.app/v1alpha1',
  kind: 'EntityKind',
  metadata: {
    name: 'usersessions.login-server.dist.app',
  },
  spec: {
    group: 'login-server.dist.app',
    names: {
      kind: 'UserSession',
      plural: 'usersessions',
      singular: 'usersession',
      shortNames: [],
    },
    versions: [{
      name: 'v1alpha1',
      served: true,
      storage: true,
      schema: {
        openAPIV3Schema: {
          "properties": {
            "spec": {
              "properties": {
                "userName": {
                  "title": "UserSessionEntity.spec.userName",
                  "type": "string"
                },
                "passkeyAssociationName": {
                  "title": "UserSessionEntity.spec.passkeyAssociationName",
                  "type": "string"
                },
                "bearerToken": {
                  "title": "UserSessionEntity.spec.bearerToken",
                  "type": "string"
                },
                "expiresAfter": {
                  "title": "UserSessionEntity.spec.expiresAfter",
                  "type": "dateTime"
                },
                "deviceInfo": {
                  "properties": {
                    "ipAddress": {
                      "title": "UserSessionEntity.spec.deviceInfo.ipAddress",
                      "type": "string"
                    },
                    "userAgent": {
                      "title": "UserSessionEntity.spec.deviceInfo.userAgent",
                      "type": "string"
                    }
                  },
                  "required": [
                    "ipAddress",
                    "userAgent"
                  ],
                  "additionalProperties": false,
                  "title": "UserSessionEntity.spec.deviceInfo",
                  "type": "object"
                }
              },
              "required": [
                "userName"
              ],
              "additionalProperties": false,
              "title": "UserSessionEntity.spec",
              "type": "object"
            }
          },
          "required": [
            "spec"
          ],
          "additionalProperties": false,
          "title": "UserSessionEntity",
          "type": "object"
        },
      },
      subresources: {
        status: false,
      },
    }],
  },
};

export const PasskeyChallengeDefinition: EntityKindEntity = {
  apiVersion: 'schema.dist.app/v1alpha1',
  kind: 'EntityKind',
  metadata: {
    name: 'passkeychallenges.login-server.dist.app',
  },
  spec: {
    group: 'login-server.dist.app',
    names: {
      kind: 'PasskeyChallenge',
      plural: 'passkeychallenges',
      singular: 'passkeychallenge',
      shortNames: [],
    },
    versions: [{
      name: 'v1alpha1',
      served: true,
      storage: true,
      schema: {
        openAPIV3Schema: {
          "properties": {
            "spec": {
              "properties": {
                "userName": {
                  "title": "PasskeyChallengeEntity.spec.userName",
                  "type": "string"
                },
                "challenge": {
                  "title": "PasskeyChallengeEntity.spec.challenge",
                  "type": "string"
                },
                "type": {
                  "title": "PasskeyChallengeEntity.spec.type",
                  "type": "string",
                  "enum": [
                    "webauthn.create",
                    "webauthn.get"
                  ]
                }
              },
              "required": [
                "challenge",
                "type"
              ],
              "additionalProperties": false,
              "title": "PasskeyChallengeEntity.spec",
              "type": "object"
            }
          },
          "required": [
            "spec"
          ],
          "additionalProperties": false,
          "title": "PasskeyChallengeEntity",
          "type": "object"
        },
      },
      subresources: {
        status: false,
      },
    }],
  },
};

export const PasskeyAssociationDefinition: EntityKindEntity = {
  apiVersion: 'schema.dist.app/v1alpha1',
  kind: 'EntityKind',
  metadata: {
    name: 'passkeyassociations.login-server.dist.app',
  },
  spec: {
    group: 'login-server.dist.app',
    names: {
      kind: 'PasskeyAssociation',
      plural: 'passkeyassociations',
      singular: 'passkeyassociation',
      shortNames: [],
    },
    versions: [{
      name: 'v1alpha1',
      served: true,
      storage: true,
      schema: {
        openAPIV3Schema: {
          "properties": {
            "spec": {
              "properties": {
                "userName": {
                  "title": "PasskeyAssociationEntity.spec.userName",
                  "type": "string"
                },
                "aaguid": {
                  "title": "PasskeyAssociationEntity.spec.aaguid",
                  "type": "string"
                },
                "credential": {
                  "properties": {
                    "id": {
                      "title": "PasskeyAssociationEntity.spec.credential.id",
                      "type": "binary"
                    },
                    "publicKey": {
                      "title": "PasskeyAssociationEntity.spec.credential.publicKey",
                      "type": "binary"
                    },
                    "deviceType": {
                      "title": "PasskeyAssociationEntity.spec.credential.deviceType",
                      "type": "string",
                      "enum": [
                        "singleDevice",
                        "multiDevice"
                      ]
                    },
                    "backedUp": {
                      "title": "PasskeyAssociationEntity.spec.credential.backedUp",
                      "type": "boolean"
                    },
                    "transports": {
                      "items": {
                        "type": "string",
                        "enum": [
                          "usb",
                          "ble",
                          "nfc",
                          "internal"
                        ]
                      },
                      "title": "PasskeyAssociationEntity.spec.credential.transports",
                      "type": "array"
                    }
                  },
                  "required": [
                    "id",
                    "publicKey",
                    "deviceType",
                    "backedUp"
                  ],
                  "additionalProperties": false,
                  "title": "PasskeyAssociationEntity.spec.credential",
                  "type": "object"
                },
                "details": {
                  "properties": {
                    "fmt": {
                      "title": "PasskeyAssociationEntity.spec.details.fmt",
                      "type": "string"
                    },
                    "origin": {
                      "title": "PasskeyAssociationEntity.spec.details.origin",
                      "type": "string"
                    },
                    "rpID": {
                      "title": "PasskeyAssociationEntity.spec.details.rpID",
                      "type": "string"
                    },
                    "json": {
                      "title": "PasskeyAssociationEntity.spec.details.json",
                      "type": "string"
                    }
                  },
                  "required": [
                    "fmt",
                    "origin",
                    "rpID",
                    "json"
                  ],
                  "additionalProperties": false,
                  "title": "PasskeyAssociationEntity.spec.details",
                  "type": "object"
                }
              },
              "required": [
                "userName",
                "aaguid",
                "credential",
                "details"
              ],
              "additionalProperties": false,
              "title": "PasskeyAssociationEntity.spec",
              "type": "object"
            },
            "status": {
              "properties": {
                "lastSeen": {
                  "title": "PasskeyAssociationEntity.status.lastSeen",
                  "type": "dateTime"
                },
                "counter": {
                  "title": "PasskeyAssociationEntity.status.counter",
                  "type": "number"
                }
              },
              "additionalProperties": false,
              "title": "PasskeyAssociationEntity.status",
              "type": "object"
            }
          },
          "required": [
            "spec"
          ],
          "additionalProperties": false,
          "title": "PasskeyAssociationEntity",
          "type": "object"
        },
      },
      subresources: {
        status: true,
      },
    }],
  },
};

export const OpenidConnectFlowDefinition: EntityKindEntity = {
  apiVersion: 'schema.dist.app/v1alpha1',
  kind: 'EntityKind',
  metadata: {
    name: 'openidconnectflows.login-server.dist.app',
  },
  spec: {
    group: 'login-server.dist.app',
    names: {
      kind: 'OpenidConnectFlow',
      plural: 'openidconnectflows',
      singular: 'openidconnectflow',
      shortNames: [],
    },
    versions: [{
      name: 'v1alpha1',
      served: true,
      storage: true,
      schema: {
        openAPIV3Schema: {
          "properties": {
            "spec": {
              "properties": {
                "requestedUrl": {
                  "title": "OpenidConnectFlowEntity.spec.requestedUrl",
                  "type": "string"
                },
                "callbackUrl": {
                  "title": "OpenidConnectFlowEntity.spec.callbackUrl",
                  "type": "string"
                },
                "issuer": {
                  "title": "OpenidConnectFlowEntity.spec.issuer",
                  "type": "string"
                },
                "audience": {
                  "title": "OpenidConnectFlowEntity.spec.audience",
                  "type": "string"
                },
                "state": {
                  "title": "OpenidConnectFlowEntity.spec.state",
                  "type": "string"
                },
                "expiresAfter": {
                  "title": "OpenidConnectFlowEntity.spec.expiresAfter",
                  "type": "dateTime"
                }
              },
              "required": [
                "requestedUrl",
                "callbackUrl",
                "issuer",
                "audience",
                "state",
                "expiresAfter"
              ],
              "additionalProperties": false,
              "title": "OpenidConnectFlowEntity.spec",
              "type": "object"
            }
          },
          "required": [
            "spec"
          ],
          "additionalProperties": false,
          "title": "OpenidConnectFlowEntity",
          "type": "object"
        },
      },
      subresources: {
        status: false,
      },
    }],
  },
};

export const OpenidConnectCodeDefinition: EntityKindEntity = {
  apiVersion: 'schema.dist.app/v1alpha1',
  kind: 'EntityKind',
  metadata: {
    name: 'openidconnectcodes.login-server.dist.app',
  },
  spec: {
    group: 'login-server.dist.app',
    names: {
      kind: 'OpenidConnectCode',
      plural: 'openidconnectcodes',
      singular: 'openidconnectcode',
      shortNames: [],
    },
    versions: [{
      name: 'v1alpha1',
      served: true,
      storage: true,
      schema: {
        openAPIV3Schema: {
          "properties": {
            "spec": {
              "properties": {
                "callbackUrl": {
                  "title": "OpenidConnectCodeEntity.spec.callbackUrl",
                  "type": "string"
                },
                "issuer": {
                  "title": "OpenidConnectCodeEntity.spec.issuer",
                  "type": "string"
                },
                "audience": {
                  "title": "OpenidConnectCodeEntity.spec.audience",
                  "type": "string"
                },
                "state": {
                  "title": "OpenidConnectCodeEntity.spec.state",
                  "type": "string"
                },
                "expiresAfter": {
                  "title": "OpenidConnectCodeEntity.spec.expiresAfter",
                  "type": "dateTime"
                },
                "claimsJson": {
                  "title": "OpenidConnectCodeEntity.spec.claimsJson",
                  "type": "string"
                },
                "userName": {
                  "title": "OpenidConnectCodeEntity.spec.userName",
                  "type": "string"
                }
              },
              "required": [
                "callbackUrl",
                "issuer",
                "audience",
                "state",
                "expiresAfter",
                "claimsJson",
                "userName"
              ],
              "additionalProperties": false,
              "title": "OpenidConnectCodeEntity.spec",
              "type": "object"
            }
          },
          "required": [
            "spec"
          ],
          "additionalProperties": false,
          "title": "OpenidConnectCodeEntity",
          "type": "object"
        },
      },
      subresources: {
        status: false,
      },
    }],
  },
};

export const IssuedTokenDefinition: EntityKindEntity = {
  apiVersion: 'schema.dist.app/v1alpha1',
  kind: 'EntityKind',
  metadata: {
    name: 'issuedtokens.login-server.dist.app',
  },
  spec: {
    group: 'login-server.dist.app',
    names: {
      kind: 'IssuedToken',
      plural: 'issuedtokens',
      singular: 'issuedtoken',
      shortNames: [],
    },
    versions: [{
      name: 'v1alpha1',
      served: true,
      storage: true,
      schema: {
        openAPIV3Schema: {
          "properties": {
            "spec": {
              "properties": {
                "tokenType": {
                  "title": "IssuedTokenEntity.spec.tokenType",
                  "enum": [
                    "JWT"
                  ],
                  "type": "string"
                },
                "standardClaims": {
                  "properties": {
                    "iss": {
                      "title": "IssuedTokenEntity.spec.standardClaims.iss",
                      "type": "string"
                    },
                    "aud": {
                      "title": "IssuedTokenEntity.spec.standardClaims.aud",
                      "type": "string"
                    }
                  },
                  "required": [
                    "iss",
                    "aud"
                  ],
                  "additionalProperties": false,
                  "title": "IssuedTokenEntity.spec.standardClaims",
                  "type": "object"
                },
                "userName": {
                  "title": "IssuedTokenEntity.spec.userName",
                  "type": "string"
                },
                "extraClaimsJson": {
                  "title": "IssuedTokenEntity.spec.extraClaimsJson",
                  "type": "string"
                }
              },
              "required": [
                "tokenType",
                "standardClaims",
                "userName",
                "extraClaimsJson"
              ],
              "additionalProperties": false,
              "title": "IssuedTokenEntity.spec",
              "type": "object"
            }
          },
          "required": [
            "spec"
          ],
          "additionalProperties": false,
          "title": "IssuedTokenEntity",
          "type": "object"
        },
      },
      subresources: {
        status: false,
      },
    }],
  },
};

export type LoginServerApiEntities =
| entities.UserEntity
| entities.UserSessionEntity
| entities.PasskeyChallengeEntity
| entities.PasskeyAssociationEntity
| entities.OpenidConnectFlowEntity
| entities.OpenidConnectCodeEntity
| entities.IssuedTokenEntity
;

/** Experimentation with what generated code could look like */
export class LoginServerApi {
  static readonly definition: EntityApiDefinition = {
    name: 'login-server.dist.app/v1alpha1',
    kinds: {
      'User': UserDefinition,
      'UserSession': UserSessionDefinition,
      'PasskeyChallenge': PasskeyChallengeDefinition,
      'PasskeyAssociation': PasskeyAssociationDefinition,
      'OpenidConnectFlow': OpenidConnectFlowDefinition,
      'OpenidConnectCode': OpenidConnectCodeDefinition,
      'IssuedToken': IssuedTokenDefinition,
    },
  }

  constructor(
    private readonly engine: EntityEngine,
  ) {}

  async createUser(entity: Pick<entities.UserEntity, 'metadata' | 'spec'>) {
    return await this.engine.insertEntity<entities.UserEntity>({
      ...entity,
      apiVersion: 'login-server.dist.app/v1alpha1',
      kind: 'User',
    });
  }
  async listUsers() {
    return await this.engine.listEntities<entities.UserEntity>('login-server.dist.app/v1alpha1', 'User');
  }
  observeUsers(signal: AbortSignal) {
    return this.engine.observeEntities<entities.UserEntity>('login-server.dist.app/v1alpha1', 'User', { signal });
  }
  async getUser(name: string) {
    return await this.engine.getEntity<entities.UserEntity>('login-server.dist.app/v1alpha1', 'User', name);
  }
  async updateUser(entity: Pick<entities.UserEntity, 'metadata' | 'spec'>) {
    return await this.engine.updateEntity<entities.UserEntity>({
      ...entity,
      apiVersion: 'login-server.dist.app/v1alpha1',
      kind: 'User',
    });
  }
  async mutateUser(name: string, mutation: MutationOptions<entities.UserEntity>) {
    return await this.engine.mutateEntity<entities.UserEntity>('login-server.dist.app/v1alpha1', 'User', name, mutation);
  }
  async deleteUser(name: string) {
    return await this.engine.deleteEntity<entities.UserEntity>('login-server.dist.app/v1alpha1', 'User', name);
  }

  async createUserSession(entity: Pick<entities.UserSessionEntity, 'metadata' | 'spec'>) {
    return await this.engine.insertEntity<entities.UserSessionEntity>({
      ...entity,
      apiVersion: 'login-server.dist.app/v1alpha1',
      kind: 'UserSession',
    });
  }
  async listUserSessions() {
    return await this.engine.listEntities<entities.UserSessionEntity>('login-server.dist.app/v1alpha1', 'UserSession');
  }
  observeUserSessions(signal: AbortSignal) {
    return this.engine.observeEntities<entities.UserSessionEntity>('login-server.dist.app/v1alpha1', 'UserSession', { signal });
  }
  async getUserSession(name: string) {
    return await this.engine.getEntity<entities.UserSessionEntity>('login-server.dist.app/v1alpha1', 'UserSession', name);
  }
  async updateUserSession(entity: Pick<entities.UserSessionEntity, 'metadata' | 'spec'>) {
    return await this.engine.updateEntity<entities.UserSessionEntity>({
      ...entity,
      apiVersion: 'login-server.dist.app/v1alpha1',
      kind: 'UserSession',
    });
  }
  async mutateUserSession(name: string, mutation: MutationOptions<entities.UserSessionEntity>) {
    return await this.engine.mutateEntity<entities.UserSessionEntity>('login-server.dist.app/v1alpha1', 'UserSession', name, mutation);
  }
  async deleteUserSession(name: string) {
    return await this.engine.deleteEntity<entities.UserSessionEntity>('login-server.dist.app/v1alpha1', 'UserSession', name);
  }

  async createPasskeyChallenge(entity: Pick<entities.PasskeyChallengeEntity, 'metadata' | 'spec'>) {
    return await this.engine.insertEntity<entities.PasskeyChallengeEntity>({
      ...entity,
      apiVersion: 'login-server.dist.app/v1alpha1',
      kind: 'PasskeyChallenge',
    });
  }
  async listPasskeyChallenges() {
    return await this.engine.listEntities<entities.PasskeyChallengeEntity>('login-server.dist.app/v1alpha1', 'PasskeyChallenge');
  }
  observePasskeyChallenges(signal: AbortSignal) {
    return this.engine.observeEntities<entities.PasskeyChallengeEntity>('login-server.dist.app/v1alpha1', 'PasskeyChallenge', { signal });
  }
  async getPasskeyChallenge(name: string) {
    return await this.engine.getEntity<entities.PasskeyChallengeEntity>('login-server.dist.app/v1alpha1', 'PasskeyChallenge', name);
  }
  async updatePasskeyChallenge(entity: Pick<entities.PasskeyChallengeEntity, 'metadata' | 'spec'>) {
    return await this.engine.updateEntity<entities.PasskeyChallengeEntity>({
      ...entity,
      apiVersion: 'login-server.dist.app/v1alpha1',
      kind: 'PasskeyChallenge',
    });
  }
  async mutatePasskeyChallenge(name: string, mutation: MutationOptions<entities.PasskeyChallengeEntity>) {
    return await this.engine.mutateEntity<entities.PasskeyChallengeEntity>('login-server.dist.app/v1alpha1', 'PasskeyChallenge', name, mutation);
  }
  async deletePasskeyChallenge(name: string) {
    return await this.engine.deleteEntity<entities.PasskeyChallengeEntity>('login-server.dist.app/v1alpha1', 'PasskeyChallenge', name);
  }

  async createPasskeyAssociation(entity: Pick<entities.PasskeyAssociationEntity, 'metadata' | 'spec' | 'status'>) {
    return await this.engine.insertEntity<entities.PasskeyAssociationEntity>({
      ...entity,
      apiVersion: 'login-server.dist.app/v1alpha1',
      kind: 'PasskeyAssociation',
    });
  }
  async listPasskeyAssociations() {
    return await this.engine.listEntities<entities.PasskeyAssociationEntity>('login-server.dist.app/v1alpha1', 'PasskeyAssociation');
  }
  observePasskeyAssociations(signal: AbortSignal) {
    return this.engine.observeEntities<entities.PasskeyAssociationEntity>('login-server.dist.app/v1alpha1', 'PasskeyAssociation', { signal });
  }
  async getPasskeyAssociation(name: string) {
    return await this.engine.getEntity<entities.PasskeyAssociationEntity>('login-server.dist.app/v1alpha1', 'PasskeyAssociation', name);
  }
  async updatePasskeyAssociation(entity: Pick<entities.PasskeyAssociationEntity, 'metadata' | 'spec' | 'status'>) {
    return await this.engine.updateEntity<entities.PasskeyAssociationEntity>({
      ...entity,
      apiVersion: 'login-server.dist.app/v1alpha1',
      kind: 'PasskeyAssociation',
    });
  }
  async mutatePasskeyAssociation(name: string, mutation: MutationOptions<entities.PasskeyAssociationEntity>) {
    return await this.engine.mutateEntity<entities.PasskeyAssociationEntity>('login-server.dist.app/v1alpha1', 'PasskeyAssociation', name, mutation);
  }
  async deletePasskeyAssociation(name: string) {
    return await this.engine.deleteEntity<entities.PasskeyAssociationEntity>('login-server.dist.app/v1alpha1', 'PasskeyAssociation', name);
  }

  async createOpenidConnectFlow(entity: Pick<entities.OpenidConnectFlowEntity, 'metadata' | 'spec'>) {
    return await this.engine.insertEntity<entities.OpenidConnectFlowEntity>({
      ...entity,
      apiVersion: 'login-server.dist.app/v1alpha1',
      kind: 'OpenidConnectFlow',
    });
  }
  async listOpenidConnectFlows() {
    return await this.engine.listEntities<entities.OpenidConnectFlowEntity>('login-server.dist.app/v1alpha1', 'OpenidConnectFlow');
  }
  observeOpenidConnectFlows(signal: AbortSignal) {
    return this.engine.observeEntities<entities.OpenidConnectFlowEntity>('login-server.dist.app/v1alpha1', 'OpenidConnectFlow', { signal });
  }
  async getOpenidConnectFlow(name: string) {
    return await this.engine.getEntity<entities.OpenidConnectFlowEntity>('login-server.dist.app/v1alpha1', 'OpenidConnectFlow', name);
  }
  async updateOpenidConnectFlow(entity: Pick<entities.OpenidConnectFlowEntity, 'metadata' | 'spec'>) {
    return await this.engine.updateEntity<entities.OpenidConnectFlowEntity>({
      ...entity,
      apiVersion: 'login-server.dist.app/v1alpha1',
      kind: 'OpenidConnectFlow',
    });
  }
  async mutateOpenidConnectFlow(name: string, mutation: MutationOptions<entities.OpenidConnectFlowEntity>) {
    return await this.engine.mutateEntity<entities.OpenidConnectFlowEntity>('login-server.dist.app/v1alpha1', 'OpenidConnectFlow', name, mutation);
  }
  async deleteOpenidConnectFlow(name: string) {
    return await this.engine.deleteEntity<entities.OpenidConnectFlowEntity>('login-server.dist.app/v1alpha1', 'OpenidConnectFlow', name);
  }

  async createOpenidConnectCode(entity: Pick<entities.OpenidConnectCodeEntity, 'metadata' | 'spec'>) {
    return await this.engine.insertEntity<entities.OpenidConnectCodeEntity>({
      ...entity,
      apiVersion: 'login-server.dist.app/v1alpha1',
      kind: 'OpenidConnectCode',
    });
  }
  async listOpenidConnectCodes() {
    return await this.engine.listEntities<entities.OpenidConnectCodeEntity>('login-server.dist.app/v1alpha1', 'OpenidConnectCode');
  }
  observeOpenidConnectCodes(signal: AbortSignal) {
    return this.engine.observeEntities<entities.OpenidConnectCodeEntity>('login-server.dist.app/v1alpha1', 'OpenidConnectCode', { signal });
  }
  async getOpenidConnectCode(name: string) {
    return await this.engine.getEntity<entities.OpenidConnectCodeEntity>('login-server.dist.app/v1alpha1', 'OpenidConnectCode', name);
  }
  async updateOpenidConnectCode(entity: Pick<entities.OpenidConnectCodeEntity, 'metadata' | 'spec'>) {
    return await this.engine.updateEntity<entities.OpenidConnectCodeEntity>({
      ...entity,
      apiVersion: 'login-server.dist.app/v1alpha1',
      kind: 'OpenidConnectCode',
    });
  }
  async mutateOpenidConnectCode(name: string, mutation: MutationOptions<entities.OpenidConnectCodeEntity>) {
    return await this.engine.mutateEntity<entities.OpenidConnectCodeEntity>('login-server.dist.app/v1alpha1', 'OpenidConnectCode', name, mutation);
  }
  async deleteOpenidConnectCode(name: string) {
    return await this.engine.deleteEntity<entities.OpenidConnectCodeEntity>('login-server.dist.app/v1alpha1', 'OpenidConnectCode', name);
  }

  async createIssuedToken(entity: Pick<entities.IssuedTokenEntity, 'metadata' | 'spec'>) {
    return await this.engine.insertEntity<entities.IssuedTokenEntity>({
      ...entity,
      apiVersion: 'login-server.dist.app/v1alpha1',
      kind: 'IssuedToken',
    });
  }
  async listIssuedTokens() {
    return await this.engine.listEntities<entities.IssuedTokenEntity>('login-server.dist.app/v1alpha1', 'IssuedToken');
  }
  observeIssuedTokens(signal: AbortSignal) {
    return this.engine.observeEntities<entities.IssuedTokenEntity>('login-server.dist.app/v1alpha1', 'IssuedToken', { signal });
  }
  async getIssuedToken(name: string) {
    return await this.engine.getEntity<entities.IssuedTokenEntity>('login-server.dist.app/v1alpha1', 'IssuedToken', name);
  }
  async updateIssuedToken(entity: Pick<entities.IssuedTokenEntity, 'metadata' | 'spec'>) {
    return await this.engine.updateEntity<entities.IssuedTokenEntity>({
      ...entity,
      apiVersion: 'login-server.dist.app/v1alpha1',
      kind: 'IssuedToken',
    });
  }
  async mutateIssuedToken(name: string, mutation: MutationOptions<entities.IssuedTokenEntity>) {
    return await this.engine.mutateEntity<entities.IssuedTokenEntity>('login-server.dist.app/v1alpha1', 'IssuedToken', name, mutation);
  }
  async deleteIssuedToken(name: string) {
    return await this.engine.deleteEntity<entities.IssuedTokenEntity>('login-server.dist.app/v1alpha1', 'IssuedToken', name);
  }

}
