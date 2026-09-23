# Building ClipJect 1.0.0 for store review

Read this file first when reviewing the source archive. The source is bundled
and minified with Vite/CRXJS, not obfuscated. All extension code and fonts are
included locally; no remote service, account, key, or environment file is needed.

## Reproduce the uploaded package

Release environment: Windows x64, Node.js 24.20.0, pnpm 11.19.0.
The scripts use Node APIs and also support Linux/macOS, but a cross-OS byte-for-
byte comparison has not been performed. Use the stated release environment
if a different environment produces a difference.

Install Node.js 24.20.0 from the official Node.js distribution. Install the
package manager with `npm install --global pnpm@11.19.0` if it is unavailable.
Extract the source archive into an empty directory, then run:

```sh
pnpm install --frozen-lockfile
pnpm run release
```

Installation downloads locked dependencies from the package registry. The
build itself needs no external services. The included `pnpm-workspace.yaml`
allows the dependency build scripts needed for installation.

Tailwind scans only `src/`, keeping reviewer output independent of surrounding
files. Both extension ZIPs have been reproduced byte-for-byte from an isolated
source extraction on the stated Windows environment.

Outputs:

- `dist/`: Chrome production build.
- `dist-firefox/`: Firefox production build.
- `release/1.0.0/clipject-1.0.0-chrome.zip`: Chrome upload.
- `release/1.0.0/clipject-1.0.0-firefox.zip`: Firefox upload.
- `release/1.0.0/clipject-1.0.0-source.zip`: reviewer source archive.
- `release/1.0.0/SHA256SUMS.txt`: SHA-256 archive checksums.

The packaged extension is an allowlisted subset of the build output with the
project LICENSE added. This excludes unused scaffold graphics. The packaging
script verifies manifest references, icon sizes, versions, browser-specific
fields, and absence of development loaders. It uses standard ZIP compression
with fixed timestamps. Compare the generated **Firefox ZIP's contents** with
the submitted Firefox ZIP, rather than comparing the unfiltered build folder.

## Individual commands

```sh
pnpm run build
pnpm run build:firefox
pnpm run lint
node --test tests/*.test.cjs
pnpm dlx web-ext@10.7.0 lint --source-dir dist-firefox
```

Chrome uses an MV3 module service worker; Firefox uses MV3 module background
scripts. `vite.config.ts` selects the CRXJS browser target and Firefox manifest
settings. The Firefox ID is `clipject@tomer-norman.dev` (an identifier, not a
contact email); keep it unchanged for later releases. Desktop Firefox 140+
is the declared target. Android is not part of this release's tested scope.

`store/` holds submission copy and graphics, not extension runtime code.
The source archive deliberately excludes developer browser profiles, local
sample-data stores, credentials, caches, dependencies, and Git metadata.
