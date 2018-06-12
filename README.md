# Jest Angular Schematic

## Development

### Test schematic changes against this repositories test-app

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

⚠ **Be careful not to check in changes to the test-app directory unless necessary.**

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