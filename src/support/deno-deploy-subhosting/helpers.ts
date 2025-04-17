import {
  type DatabaseRecord,
  type ProjectRecord,
  type DomainRecord,
  type SubhostingApiClient,
} from "./client.ts";

export async function selectOrCreateProject(
  client: SubhostingApiClient,
  desiredDescription: string,
  desiredProjectName?: string,
): Promise<ProjectRecord> {
  // TODO: as http optimization
  // if (desiredProjectName) {
  //   const project = client.getProject();
  // }
  const projects = await client.listProjects();

  const existingProject = projects.find(x => desiredProjectName
    ? x.name == desiredProjectName
    : x.description == desiredDescription);
  if (existingProject) {

    // TODO: update description?
    // if (existingProject.description !== desiredDescription)
    console.log('Using existing project', existingProject.name, ':', existingProject.description);
    return existingProject;
  }

  const newProject = await client.createProject({
    name: desiredProjectName ?? null,
    description: desiredDescription,
  });
  console.log('Created new project', newProject.name, ':', newProject.description);
  return newProject;
}

export async function selectOrCreateDatabase(
  client: SubhostingApiClient,
  desiredDescription: string,
): Promise<DatabaseRecord> {
  // TODO: as http optimization
  // if (desiredProjectName) {
  //   const project = client.getProject();
  // }
  const databases = await client.listDatabases();

  const existingDatabase = databases.find(x =>
    x.description == desiredDescription);
  if (existingDatabase) {
    console.log('Using existing database', existingDatabase.id, ':', existingDatabase.description);
    return existingDatabase;
  }

  const newDatabase = await client.createDatabase({
    description: desiredDescription,
  });
  console.log('Created new database', newDatabase.id, ':', newDatabase.description);
  return newDatabase;
}

export async function selectOrCreateDomain(
  client: SubhostingApiClient,
  desiredDomain: string,
): Promise<DomainRecord> {
  // TODO: as http optimization
  // if (desiredProjectName) {
  //   const project = client.getProject();
  // }
  const domains = await client.listDomains();

  const existingDomain = domains.find(x =>
    x.domain == desiredDomain);
  if (existingDomain) {
    console.log('Using existing domain', existingDomain.id, ':', existingDomain.domain);
    return existingDomain;
  }

  const newDatabase = await client.createDomain({
    domain: desiredDomain,
  });
  console.log('Created new domain', newDatabase.id, ':', newDatabase.domain);
  return newDatabase;
}
