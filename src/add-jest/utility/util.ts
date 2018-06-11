
import { JsonParseMode, experimental, parseJson, join, Path } from '@angular-devkit/core';
import { SchematicsException, Tree } from '@angular-devkit/schematics';

export type WorkspaceSchema = experimental.workspace.WorkspaceSchema;

export interface JestOptions {
  updateTests?: boolean
}

export function getWorkspacePath(host: Tree): string {
  const possibleFiles = [ '/angular.json', '/.angular.json' ];
  const path = possibleFiles.filter(path => host.exists(path))[0];

  return path;
}

export function getWorkspace(host: Tree): WorkspaceSchema {
  const path = getWorkspacePath(host);
  const configBuffer = host.read(path);
  if (configBuffer === null) {
    throw new SchematicsException(`Could not find (${path})`);
  }
  const content = configBuffer.toString();

  return parseJson(content, JsonParseMode.Loose) as {} as WorkspaceSchema;
}

export function getSourcePath(tree: Tree, options: any): String {
  const workspace = getWorkspace(tree);

  if (!options.project) {
    throw new SchematicsException('Option "project" is required.');
  }

  const project = workspace.projects[options.project];

  if (project.projectType !== 'application') {
    throw new SchematicsException(`AddJest requires a project type of "application".`);
  }

  // const assetPath = join(project.root as Path, 'src', 'assets');
  const sourcePath = join(project.root as Path, 'src');

  return sourcePath;
}
