#!/usr/bin/env -S deno run --allow-env --allow-net=api.deno.com --allow-run=deno,kubectl --allow-read=. --no-prompt

import * as base64 from "https://deno.land/std@0.208.0/encoding/base64.ts";

import { type RestClient } from "https://deno.land/x/kubernetes_client@v0.5.0/mod.ts";
import { CoreV1Api } from "https://deno.land/x/kubernetes_apis@v0.4.0/builtin/core@v1/mod.ts";
import { ExternaldnsV1alpha1Api } from "https://deno.land/x/kubernetes_apis@v0.4.0/external-dns/externaldns.k8s.io@v1alpha1/mod.ts";
import { DomainRecord, SubhostingApiClient } from "./client.ts";

interface CertificateEntry {
  altNames: string[];
  cert: string;
  key: string;
}

export class CertificateIndex {
  constructor(
    private readonly tlsEntries: Array<CertificateEntry>,
  ) {}

  static async fromCertManager(kubernetes: RestClient) {
    const tlsSecrets = await new CoreV1Api(kubernetes)
      .getSecretListForAllNamespaces({
        labelSelector: 'controller.cert-manager.io/fao=true',
      });
    const tlsEntries = tlsSecrets.items
      .filter(x => x.type == 'kubernetes.io/tls')
      .map<CertificateEntry>(x => ({
        altNames: x.metadata?.annotations?.['cert-manager.io/alt-names']?.split(',') ?? [],
        cert: new TextDecoder().decode(base64.decodeBase64(x.data?.['tls.crt'] ?? '')),
        key: new TextDecoder().decode(base64.decodeBase64(x.data?.['tls.key'] ?? '')),
      }))
      .filter(x => x.altNames?.[0] && x.cert && x.key);
    return new this(tlsEntries);
  }

  selectByFqdn(fqdn: string) {
    for (const tls of this.tlsEntries) {
      for (const altName of tls.altNames ?? []) {
        const pattern = new URLPattern({ hostname: altName });
        if (pattern.exec({ hostname: fqdn })) {
          return tls;
        }
      }
    }
    return null;
  }
}

export async function ensureDomainProvisioning(props: {
  subhostingApi: SubhostingApiClient;
  kubernetes: RestClient;
  domain: DomainRecord;
  dnsNamespace: string;
  certificateMode: "skip" | "upload" | "provision";
  dnsEndpointAnnotations?: Record<string,string>;
}) {

  const endpointName = `denodeploy-${props.domain.domain}`;
  const externaldnsApi = new ExternaldnsV1alpha1Api(props.kubernetes).namespace(props.dnsNamespace);
  async function applyDnsEndpoint(withCNAME: boolean) {
    if (!props.domain.dnsRecords.length) return; // Try to avoid .deno.dev domains
    let endpoint = await externaldnsApi.patchDNSEndpoint(endpointName, 'apply-patch', {
      metadata: {
        name: endpointName,
        labels: {
          'managed-by': 'dist-app-deno-subhosting',
        },
        annotations: props.dnsEndpointAnnotations,
      },
      spec: {
        endpoints: [{
          dnsName: props.domain.domain,
          recordTTL: 600,
          recordType: 'A',
          targets: props.domain.dnsRecords.filter(x => x.type == 'A').map(x => x.content),
        }, {
          dnsName: props.domain.domain,
          recordTTL: 600,
          recordType: 'AAAA',
          targets: props.domain.dnsRecords.filter(x => x.type == 'AAAA').map(x => x.content),
        }, ...withCNAME ? [{
          dnsName: `_acme-challenge.${props.domain.domain}`,
          recordTTL: 600,
          recordType: 'CNAME',
          targets: props.domain.dnsRecords.filter(x => x.type == 'CNAME').map(x => x.content),
        }] : []],
      },
    }, {
      fieldManager: 'dist-app-deno-subhosting',
    });
    console.log(`Applied DNSEndpoint/${props.dnsNamespace}/${endpointName}`);

    let firstRun = true;
    while (true) {
      if (!endpoint.metadata?.generation) throw new Error('BUG: no generation?');
      if (endpoint.status && endpoint.status.observedGeneration == endpoint.metadata.generation) {
        if (!firstRun) console.log('DNS update has been acknowledged.');
        break;
      }
      firstRun = false;
      console.log('Waiting for DNS update to be acknowledged...');
      await new Promise(ok => setTimeout(ok, 5_000));
      endpoint = await externaldnsApi.getDNSEndpoint(endpointName);
    }
  }

  await applyDnsEndpoint(props.certificateMode == 'provision' || !props.domain.isValidated);

  if (!props.domain.isValidated) {
    // console.log('waiting 5s for DNS to set up...');
    // await new Promise(ok => setTimeout(ok, 5_000));

    let attempt = 0;
    while (++attempt <= 3) {
      if (attempt > 1) {
        console.log('waiting another 15s before another try...');
        await new Promise(ok => setTimeout(ok, 15_000));
      }

      console.log('attempting domain verification for', props.domain.domain);
      try {
        await props.subhostingApi.verifyDomain(props.domain.id);
        console.log('domain was verified');
        break;
      } catch (thrown: unknown) {
        const err = thrown as Error;
        console.log('domain verification rejected:', err.message)
      }
    }
  }

  if (props.certificateMode == 'upload') {
    await applyDnsEndpoint(false); // No DNS challenge needed after verification is done

    // TODO: cert refreshing
    if (props.domain.certificates.length > 0) return;
    // TODO: is it better to parse the PEM or fetch the Certificate CR?
    // if (props.domain.certificates.every(x => new Date(x.expiresAt)))

    const certIndex = await CertificateIndex.fromCertManager(props.kubernetes);
    const certificate = certIndex.selectByFqdn(props.domain.domain);
    if (!certificate) {
      throw new Error(`No TLS certificate found in cluster for ${props.domain.domain}`);
    }

    console.log('Attempting certificate upload');
    await props.subhostingApi.uploadCertificate(props.domain.id, {
      privateKey: certificate.key,
      certificateChain: certificate.cert,
    });
    console.log('Certificate was accepted');

  } else if (props.certificateMode == 'provision') {
    await props.subhostingApi.provisionCertificate(props.domain.id);
    console.log('Certificate was provisioned');
  }
}
