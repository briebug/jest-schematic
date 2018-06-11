import {
  Rule,
  SchematicContext,
  Tree,
  chain,
  externalSchematic,
} from '@angular-devkit/schematics';

const licenseText = `
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
`;

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function addJest(options: any): Rule {
  return chain([
    externalSchematic('@schematics/angular', 'component', options),
    writeLicenseToHeader(options),
  ]);
}

function writeLicenseToHeader(options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {

    const workspace = getWorkspace(tree);
    if (!options.project) {
      throw new SchematicsException('Option "project" is required.');
    }
    const project = workspace.projects[options.project];
    if (project.projectType !== 'application') {
      throw new SchematicsException(`PWA requires a project type of "application".`);
    }

    // const assetPath = join(project.root as Path, 'src', 'assets');
    const sourcePath = join(project.root as Path, 'src');;

    console.log('sourcePath -> ', sourcePath);

    tree.getDir(`${sourcePath}/app/${options.name}`).visit((filePath) => {
      if (!filePath.endsWith('.ts')) {
        return;
      }
      const content = tree.read(filePath);
      if (!content) {
        return;
      }
      // Prevent from writing license to files tha already have one
      if (content.indexOf(licenseText) == -1) {
        tree.overwrite(filePath, licenseText + content);
      }
    });
    return tree;
  };
}

// -------------------------

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonParseMode, experimental, parseJson, join, Path } from '@angular-devkit/core';
import { SchematicsException } from '@angular-devkit/schematics';


export type WorkspaceSchema = experimental.workspace.WorkspaceSchema;

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
