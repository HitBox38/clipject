# Building ClipJect for store review

Read this file first when reviewing the source archive. The source is bundled
and minified with Vite/CRXJS, not obfuscated. All extension code and fonts are
included locally; no remote service, account, key, or environment file is needed.

## Reproduce the uploaded package

Automated releases build on GitHub Actions `ubuntu-latest`, Node.js 24, and
pnpm 11.19.0. The workflow log records the exact runner and Node patch version.
Local validation also supports the Node versions listed in `package.json`.

Install Node.js 24 and pnpm 11.19.0 before building.
Extract the source archive into an empty directory, then run:

```sh
pnpm install --frozen-lockfile
pnpm run release
```

Installation downloads locked dependencies from the package registry. The
build itself needs no external services. The included `pnpm-workspace.yaml`
allows the dependency build scripts needed for installation.

Tailwind scans only `src/`, keeping reviewer output independent of surrounding
files. The release source ZIP contains the stamped package and manifest versions.
A checkout from the release tag contains the base version; to reproduce the
release from that checkout, first run `GITHUB_RUN_NUMBER=<release-run-number>
node scripts/release-version.mjs` on one line. Do not stamp the source ZIP again.
Cross-platform byte-for-byte equality is not guaranteed.

Outputs:

- `dist/`: Chrome production build.
- `dist-firefox/`: Firefox production build.
- `release/<version>/clipject-<version>-chrome.zip`: Chrome upload.
- `release/<version>/clipject-<version>-firefox.zip`: Firefox upload.
- `release/<version>/clipject-<version>-source.zip`: reviewer source archive.
- `release/<version>/SHA256SUMS.txt`: SHA-256 archive checksums.

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
pnpm run format:check
pnpm run typecheck
pnpm test
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
