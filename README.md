# Jest Angular Schematic

## Getting started

```shell
npm install && npm run link
```

## Development

### Test schematic changes against this repositories Angular CLI test-app

Schematic changes will be applied to the test app in the `./test-app` directory

Compile the typescript in watch mode in one shell:

```shell
npm run build
```

Run the following in another shell every time a schematic change is made:

```shell
npm run clean:launch
```

`clean:launch` will reset the test-app to is current version controlled state, removing un-tracked files, and run the schematic against the test-app. This will be your main development command.

⚠ **Be careful not to check in changes to the test-app directory unless necessary.** ⚠

### Test schematics against a local project

- run `npm run build` to compile the schematic
- in another shell, cd into the repo and run `npm link ../PATH_TO_THIS_PROJECT`
  - this will link the projects so that the schematic command runs from you're local filesystem
- in the repo you want to run the schematic against, run `ng g add-jest:add-jest`

### Dev tips

while developing, comment out the following line to avoid npm installing dependencies

```ts
context.addTask(new NodePackageInstallTask());
```

### Reset test-app to its version controlled state

This will reset the test-app folder to its `HEAD` commit and remove untracked files.

```shell
npm run clean:testApp
```

### Compile the schematics

Compile the typescript files in watch mode

```shell
npm run build
```

Compile the typescript files once

```shell
npm run build:once
```

## Getting Started With Schematics

This repository is a basic Schematic implementation that serves as a starting point to create and publish Schematics to NPM.

### Testing

To test locally, install `@angular-devkit/schematics` globally and use the `schematics` command line tool. That tool acts the same as the `generate` command of the Angular CLI, but also has a debug mode.

Check the documentation with

```bash
schematics --help
```

### Unit Testing

`npm run test` will run the unit tests, using Jasmine as a runner and test framework.

### Publishing

To publish, simply do:

```bash
npm run build
npm publish
```

That's it!
