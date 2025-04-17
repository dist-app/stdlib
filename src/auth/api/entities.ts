import { type ApiKindEntity } from "../../engine/types.ts";

export interface UserEntity extends ApiKindEntity {
  apiVersion: 'login-server.dist.app/v1alpha1';
  kind: 'User';
  spec: {
    lifecycle: 'Pending' | 'Active' | 'Inactive';
    profile: {
      contactEmail?: string;
      displayName?: string;
    };
    foreignIdentity?: {
      issuer: string;
      subject: string;
      username?: string;
      lastSeen?: Date;
    };
  };
}

export interface UserSessionEntity extends ApiKindEntity {
  apiVersion: 'login-server.dist.app/v1alpha1';
  kind: 'UserSession';
  spec: {
    userName: string;
    passkeyAssociationName?: string;
    bearerToken?: string;
    expiresAfter?: Date;
    deviceInfo?: {
      ipAddress: string;
      // TODO: use the newer structured api for user agent info
      userAgent: string;
    },
  };
}

export interface PasskeyChallengeEntity extends ApiKindEntity {
  apiVersion: 'login-server.dist.app/v1alpha1';
  kind: 'PasskeyChallenge';
  spec: {
    userName?: string;
    challenge: string;
    type: 'webauthn.create' | 'webauthn.get';
  };
}

export interface PasskeyAssociationEntity extends ApiKindEntity {
  apiVersion: 'login-server.dist.app/v1alpha1';
  kind: 'PasskeyAssociation';
  spec: {
    userName: string;
    aaguid: string;
    credential: {
      id: Uint8Array;
      publicKey: Uint8Array;
      deviceType: 'singleDevice' | 'multiDevice';
      backedUp: boolean;
      transports?: Array<'usb' | 'ble' | 'nfc' | 'internal'>;
    };
    details: {
      fmt: string;
      origin: string;
      rpID: string;
      json: string;
    },
  };
  status?: {
    lastSeen?: Date;
    counter?: number;
  };
}

export interface OpenidConnectFlowEntity extends ApiKindEntity {
  apiVersion: 'login-server.dist.app/v1alpha1';
  kind: 'OpenidConnectFlow';
  spec: {
    requestedUrl: string;
    callbackUrl: string;
    issuer: string;
    audience: string;
    state: string;
    expiresAfter: Date;
  };
}

export interface OpenidConnectCodeEntity extends ApiKindEntity {
  apiVersion: 'login-server.dist.app/v1alpha1';
  kind: 'OpenidConnectCode';
  spec: {
    callbackUrl: string;
    issuer: string;
    audience: string;
    state: string;
    expiresAfter: Date;
    claimsJson: string;
    userName: string;
  };
}

export interface IssuedTokenEntity extends ApiKindEntity {
  apiVersion: 'login-server.dist.app/v1alpha1';
  kind: 'IssuedToken';
  spec: {
    tokenType: 'JWT';
    standardClaims: {
      iss: string;
      aud: string;
    };
    userName: string;
    extraClaimsJson: string;
  };
}
