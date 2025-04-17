#!/usr/bin/env -S deno run --allow-env --allow-net=api.deno.com --allow-run=deno --allow-read=.

import { SubhostingApiClient } from "./client.ts";

export async function deleteOldDeployments(client: SubhostingApiClient) {
  const projects = await client.listProjects();

  for (const project of projects) {
    console.log(project.description, '...');

    const deployments = await client.listDeployments(project.id);
    const latestSuccess = deployments.findLast(x => x.status == 'success');
    if (!latestSuccess) {
      console.log('WARN: no successful deployments found for', project.description);
      break;
    }
    for (const deployment of deployments) {
      // Stop when we get to the most recent successful build
      if (deployment == latestSuccess) break;
      const domains = deployment.domains ?? [];
      if (domains.length < 2) {
        await client.deleteDeployment(deployment.id);
        console.log("Deleted", domains[0] ?? deployment.id, "from", new Date(deployment.createdAt));
      }
    }
  }
}
