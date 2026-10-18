import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import {
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { basename, join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';

const root = new URL('..', import.meta.url).pathname;
const templatePath = join(root, 'tools/els/els-code.template.html');
const generatedPath = join(root, 'public/tzofen.html');
const sourcePath = join(root, 'tools/els/data/tk-vtext.txt');
const letters = readFileSync(join(root, 'tools/els/data/tk-letters.txt'), 'utf8');
const TORAH_LEN = 304805;

const sha256 = value => createHash('sha256').update(value).digest('hex');
const generatedText = () => readFileSync(generatedPath, 'utf8');
const build = (args = [], env = {}, repositoryRoot = root) => spawnSync('python3', ['tools/els/build.py', ...args], {
  cwd: repositoryRoot,
  encoding: 'utf8',
  env: { ...process.env, ...env },
  timeout: 120000,
});
const assetMetadata = (html, repositoryRoot = root) => {
  const url = html.match(/const VERSE_TEXT_ASSET="([^"]+)"/i)?.[1];
  const sourceSha = html.match(/VERSE_TEXT_SHA256="([0-9a-f]{64})"/i)?.[1];
  const sourceBytes = Number(html.match(/VERSE_TEXT_BYTES=(\d+)/i)?.[1]);
  assert.ok(url && sourceSha && Number.isSafeInteger(sourceBytes), 'generated engine declares the verse display asset contract');
  return { url, sourceSha, sourceBytes, path: join(repositoryRoot, 'public', url.replace(/^\/+/, '')) };
};

const lstatOrNull = path => {
  try { return lstatSync(path); } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
};

const hostedSnapshot = (repositoryRoot = root) => ({
  html: sha256(readFileSync(join(repositoryRoot, 'public/tzofen.html'))),
  assets: readdirSync(join(repositoryRoot, 'public/els-data')).sort().map(name => {
    const path = join(repositoryRoot, 'public/els-data', name);
    const metadata = lstatSync(path);
    if (metadata.isFile()) return [name, 'file', metadata.size, sha256(readFileSync(path))];
    if (metadata.isSymbolicLink()) return [name, 'symlink', readlinkSync(path)];
    if (metadata.isDirectory()) return [name, 'directory'];
    if (metadata.isFIFO()) return [name, 'fifo'];
    return [name, 'special', metadata.mode];
  }),
});

const assertHostedPairUsable = (allowedSources, repositoryRoot = root) => {
  const html = readFileSync(join(repositoryRoot, 'public/tzofen.html'), 'utf8');
  const metadata = assetMetadata(html, repositoryRoot);
  const assetStat = lstatSync(metadata.path);
  assert.ok(assetStat.isFile() && !assetStat.isSymbolicLink(), 'hosted HTML references a regular asset');
  const source = gunzipSync(readFileSync(metadata.path));
  assert.equal(source.length, metadata.sourceBytes, 'hosted asset expands to the declared byte length');
  assert.equal(sha256(source), metadata.sourceSha, 'hosted asset expands to the declared SHA-256');
  assert.equal(basename(metadata.path), `tk-vtext.${metadata.sourceSha.slice(0, 16)}.gzdata`);
  if (allowedSources) {
    assert.ok(allowedSources.some(candidate => candidate.equals(source)), 'hosted pair is one complete allowed snapshot');
  }
  return { metadata, source };
};

test('generator hardens asset preservation, standalone paths, source validation, publication failures and concurrency',
  { timeout: 300000 }, async () => {
  const source = readFileSync(sourcePath);
  const historicalSourceRaw = execFileSync(
    'git',
    ['show', '8d871b50ccd0f0fd11459eb748035c5c8622cc10:tools/els/data/tk-vtext.txt'],
    { cwd: root, maxBuffer: 8 * 1024 * 1024 },
  );
  const historicalSource = historicalSourceRaw.at(-1) === 0x0a
    ? historicalSourceRaw
    : Buffer.concat([historicalSourceRaw, Buffer.from('\n')]);
  assert.notEqual(sha256(historicalSource), sha256(source), 'repository history provides a different real source snapshot');

  // All destructive fixtures and concurrent publishers run against a copied
  // repository. The canonical worktree remains browser-test input only.
  const canonicalHostedBefore = hostedSnapshot(root);
  const testTempRoot = mkdtempSync(join(root, '..', 'sod1820-els-payload-test-'));
  const sandboxRoot = join(testTempRoot, 'repository');
  mkdirSync(join(sandboxRoot, 'tools/els'), { recursive: true });
  mkdirSync(join(sandboxRoot, 'src/lib/presentation'), { recursive: true });
  mkdirSync(join(sandboxRoot, 'public/els-data'), { recursive: true });
  copyFileSync(join(root, 'tools/els/build.py'), join(sandboxRoot, 'tools/els/build.py'));
  copyFileSync(templatePath, join(sandboxRoot, 'tools/els/els-code.template.html'));
  cpSync(join(root, 'tools/els/data'), join(sandboxRoot, 'tools/els/data'), { recursive: true });
  copyFileSync(
    join(root, 'src/lib/presentation/tanakhReferenceParts.js'),
    join(sandboxRoot, 'src/lib/presentation/tanakhReferenceParts.js'),
  );
  copyFileSync(generatedPath, join(sandboxRoot, 'public/tzofen.html'));
  const canonicalMeta = assetMetadata(generatedText(), root);
  copyFileSync(canonicalMeta.path, join(sandboxRoot, 'public/els-data', basename(canonicalMeta.path)));

  const sandboxGeneratedPath = join(sandboxRoot, 'public/tzofen.html');
  const sandboxSourcePath = join(sandboxRoot, 'tools/els/data/tk-vtext.txt');
  const sandboxTemplatePath = join(sandboxRoot, 'tools/els/els-code.template.html');
  const sandboxBuild = (args = [], env = {}) => build(args, env, sandboxRoot);
  const assertCanonicalHostedUntouched = () => assert.deepEqual(
    hostedSnapshot(root),
    canonicalHostedBefore,
    'isolated generator fixtures never mutate the canonical public tree',
  );

  const beforeHtml = readFileSync(sandboxGeneratedPath);
  const beforeMeta = assetMetadata(beforeHtml.toString('utf8'), sandboxRoot);
  const beforeAsset = readFileSync(beforeMeta.path);
  const assetDir = join(sandboxRoot, 'public/els-data');
  const historicalAssetPath = join(assetDir, `tk-vtext.${sha256(historicalSource).slice(0, 16)}.gzdata`);
  const standaloneDir = join(testTempRoot, 'standalone');
  const pathGuardDir = join(testTempRoot, 'path-guard');
  mkdirSync(standaloneDir);
  mkdirSync(pathGuardDir);
  const standalonePath = join(standaloneDir, 'tzofen-offline.html');
  const standaloneSecondPath = join(standaloneDir, 'tzofen-offline-second.html');
  const createdAssetFixtures = [];
  const activeChildren = new Set();
  const forbiddenRelativePath = join(sandboxRoot, 'public', `forbidden-relative-${process.pid}.html`);
  const forbiddenDotdotPath = join(sandboxRoot, 'public', `forbidden-dotdot-${process.pid}.html`);
  const forbiddenNewPaths = [
    join(sandboxRoot, 'public', `forbidden-standalone-${process.pid}.html`),
    join(sandboxRoot, 'dist', `forbidden-standalone-${process.pid}.html`),
    join(sandboxRoot, 'inputs', `forbidden-standalone-${process.pid}.html`),
    forbiddenRelativePath,
    forbiddenDotdotPath,
  ];

  const removeAssetFixtures = () => {
    for (const path of [...createdAssetFixtures].reverse()) rmSync(path, { recursive: true, force: true });
    createdAssetFixtures.length = 0;
  };
  const ownedRegularNames = () => readdirSync(assetDir).filter(name => {
    const match = name.match(/^tk-vtext\.([0-9a-f]{16})\.gzdata$/);
    if (!match) return false;
    const path = join(assetDir, name);
    if (!lstatSync(path).isFile()) return false;
    try {
      const expanded = gunzipSync(readFileSync(path));
      return expanded.at(-1) === 0x0a && sha256(expanded).startsWith(match[1]);
    } catch {
      return false;
    }
  }).sort();
  const temporaryPublishFiles = () => [
    ...readdirSync(join(sandboxRoot, 'public')).filter(name => /^\.tzofen\.html\..+\.tmp$/.test(name)),
    ...readdirSync(assetDir).filter(name => /^\.tk-vtext\..+\.tmp$/.test(name)),
  ];

  const startPausedBuild = (phase = 'inputs_validated', args = []) => {
    const child = spawn('python3', ['tools/els/build.py', ...args], {
      cwd: sandboxRoot,
      env: { ...process.env, SOD1820_ELS_TEST_PAUSE_PHASE: phase },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    activeChildren.add(child);
    let stdout = '';
    let stderr = '';
    let readyFinished = false;
    let resolveReady;
    let rejectReady;
    const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
    const timer = setTimeout(() => {
      if (!readyFinished) {
        readyFinished = true;
        child.kill('SIGKILL');
        rejectReady(new Error(`timed out waiting for generator checkpoint\n${stdout}\n${stderr}`));
      }
    }, 60000);
    child.stdout.on('data', chunk => {
      stdout += chunk;
      if (!readyFinished && stdout.includes(`ELS_TEST_CHECKPOINT ${phase}`)) {
        readyFinished = true;
        clearTimeout(timer);
        resolveReady();
      }
    });
    child.stderr.on('data', chunk => { stderr += chunk; });
    const closed = new Promise((resolve, reject) => {
      child.once('error', error => {
        if (!readyFinished) {
          readyFinished = true;
          clearTimeout(timer);
          rejectReady(error);
        }
        reject(error);
      });
      child.once('close', (status, signal) => {
        activeChildren.delete(child);
        if (!readyFinished) {
          readyFinished = true;
          clearTimeout(timer);
          rejectReady(new Error(`generator exited before checkpoint (${status ?? signal})\n${stdout}\n${stderr}`));
        }
        resolve({ status, signal, stdout, stderr });
      });
    });
    return {
      child,
      ready,
      closed,
      release: () => child.stdin.end('\n'),
    };
  };

  try {
    // Standalone destinations are resolved and rejected before input rendering or hosted mutation.
    const realParent = join(pathGuardDir, 'real-parent');
    const symlinkParent = join(pathGuardDir, 'symlink-parent');
    const externalTarget = join(pathGuardDir, 'external-target.html');
    const outputSymlink = join(pathGuardDir, 'output-symlink.html');
    const outputDirectory = join(pathGuardDir, 'output-directory');
    const outputFifo = join(pathGuardDir, 'output-fifo');
    mkdirSync(realParent);
    mkdirSync(outputDirectory);
    writeFileSync(externalTarget, 'external-target');
    symlinkSync(realParent, symlinkParent, 'dir');
    symlinkSync(externalTarget, outputSymlink, 'file');
    const fifoResult = spawnSync('mkfifo', [outputFifo], { encoding: 'utf8' });
    assert.equal(fifoResult.status, 0, fifoResult.stderr);

    const hostedBeforePathMatrix = hostedSnapshot(sandboxRoot);
    const rejectedPaths = [
      forbiddenNewPaths[0],
      `public/${basename(forbiddenRelativePath)}`,
      `${sandboxRoot}/tools/els/../../public/${basename(forbiddenDotdotPath)}`,
      forbiddenNewPaths[1],
      forbiddenNewPaths[2],
      sandboxGeneratedPath,
      beforeMeta.path,
      join(symlinkParent, 'blocked.html'),
      externalTarget,
      outputSymlink,
      outputDirectory,
      outputFifo,
      join(pathGuardDir, 'missing-parent', 'blocked.html'),
    ];
    for (const rejectedPath of rejectedPaths) {
      const result = sandboxBuild(['--standalone-out', rejectedPath]);
      assert.notEqual(result.status, 0, `standalone path must be rejected: ${rejectedPath}`);
      assert.deepEqual(hostedSnapshot(sandboxRoot), hostedBeforePathMatrix, 'standalone rejection leaves every hosted artifact unchanged');
    }
    for (const forbiddenPath of forbiddenNewPaths) {
      assert.equal(lstatOrNull(forbiddenPath), null, `rejected standalone destination is never created: ${forbiddenPath}`);
    }
    assert.equal(readFileSync(externalTarget, 'utf8'), 'external-target', 'create-new mode preserves an existing regular file and symlink target');
    assert.equal(readlinkSync(outputSymlink), externalTarget, 'existing output symlink is preserved');
    assert.ok(lstatSync(outputDirectory).isDirectory(), 'existing output directory is preserved');
    assert.ok(lstatSync(outputFifo).isFIFO(), 'ambiguous FIFO destination is preserved');

    const firstStandalone = sandboxBuild(['--standalone-out', standalonePath]);
    assert.equal(firstStandalone.status, 0, firstStandalone.stderr || firstStandalone.stdout);
    const standaloneOne = readFileSync(standalonePath);
    const refusedOverwrite = sandboxBuild(['--standalone-out', standalonePath]);
    assert.notEqual(refusedOverwrite.status, 0, 'standalone publication refuses to overwrite its own existing regular output');
    assert.ok(readFileSync(standalonePath).equals(standaloneOne), 'refused overwrite preserves the existing standalone bytes');
    const secondStandalone = sandboxBuild(['--standalone-out', standaloneSecondPath]);
    assert.equal(secondStandalone.status, 0, secondStandalone.stderr || secondStandalone.stdout);
    const standaloneTwo = readFileSync(standaloneSecondPath);
    assert.ok(standaloneTwo.equals(standaloneOne), 'two create-new external destinations are byte-deterministic');
    assert.deepEqual(hostedSnapshot(sandboxRoot), hostedBeforePathMatrix, 'successful standalone generation does not mutate hosted output');

    // Swapping the requested parent pathname after validation cannot redirect a bound-dirfd write.
    const parentRacePath = join(pathGuardDir, 'parent-race');
    const boundParentPath = join(pathGuardDir, 'parent-race-bound');
    const parentRaceBasename = 'parent-race-offline.html';
    const parentRaceOutput = join(parentRacePath, parentRaceBasename);
    mkdirSync(parentRacePath);
    const parentRaceWorker = startPausedBuild(
      'standalone_parent_bound',
      ['--standalone-out', parentRaceOutput],
    );
    await parentRaceWorker.ready;
    renameSync(parentRacePath, boundParentPath);
    symlinkSync(join(sandboxRoot, 'public'), parentRacePath, 'dir');
    parentRaceWorker.release();
    const parentRaceResult = await parentRaceWorker.closed;
    assert.equal(parentRaceResult.status, 0, parentRaceResult.stderr || parentRaceResult.stdout);
    assert.ok(
      readFileSync(join(boundParentPath, parentRaceBasename)).equals(standaloneOne),
      'standalone publication stays in the originally bound external directory',
    );
    assert.equal(
      lstatOrNull(join(sandboxRoot, 'public', parentRaceBasename)),
      null,
      'replacement parent symlink cannot redirect standalone bytes into fixture public',
    );
    assert.ok(lstatSync(parentRacePath).isSymbolicLink(), 'replacement parent symlink remains untouched');
    assert.deepEqual(hostedSnapshot(sandboxRoot), hostedBeforePathMatrix, 'parent swap leaves hosted output unchanged');

    // A final basename planted after validation wins; no-clobber publication fails without replacing it.
    const basenameRaceParent = join(pathGuardDir, 'basename-race');
    const basenameRaceOutput = join(basenameRaceParent, 'basename-race-offline.html');
    mkdirSync(basenameRaceParent);
    const basenameRaceWorker = startPausedBuild(
      'before_standalone_publish',
      ['--standalone-out', basenameRaceOutput],
    );
    await basenameRaceWorker.ready;
    symlinkSync(sandboxGeneratedPath, basenameRaceOutput, 'file');
    basenameRaceWorker.release();
    const basenameRaceResult = await basenameRaceWorker.closed;
    assert.notEqual(basenameRaceResult.status, 0, 'raced standalone basename fails explicitly');
    assert.ok(lstatSync(basenameRaceOutput).isSymbolicLink(), 'raced output symlink is preserved');
    assert.equal(readlinkSync(basenameRaceOutput), sandboxGeneratedPath, 'raced output symlink target is unchanged');
    assert.deepEqual(
      readdirSync(basenameRaceParent).filter(name => name.startsWith('.basename-race-offline.html.') && name.endsWith('.tmp')),
      [],
      'raced standalone publication removes its dirfd-scoped temporary file',
    );
    assert.deepEqual(hostedSnapshot(sandboxRoot), hostedBeforePathMatrix, 'basename race leaves hosted output unchanged');
    assertCanonicalHostedUntouched();

    // Malformed source snapshots fail before any hosted write.
    const sourceText = source.toString('utf8');
    const firstLineEnd = sourceText.indexOf('\n');
    const invalidSources = [
      ['invalid UTF-8', Buffer.concat([source.subarray(0, -1), Buffer.from([0xff, 0x0a])])],
      ['missing trailing LF', source.subarray(0, -1)],
      ['wrong verse row count', Buffer.from(sourceText.slice(firstLineEnd + 1))],
      ['shorter than VLENS alignment', Buffer.from(`א${sourceText.slice(firstLineEnd)}`)],
    ];
    for (const [label, invalidSource] of invalidSources) {
      writeFileSync(sandboxSourcePath, invalidSource);
      const result = sandboxBuild();
      writeFileSync(sandboxSourcePath, source);
      assert.notEqual(result.status, 0, `${label} must fail the build`);
      assert.deepEqual(hostedSnapshot(sandboxRoot), hostedBeforePathMatrix, `${label} fails before hosted mutation`);
    }
    assertCanonicalHostedUntouched();

    // Hosted publication never scans or deletes any pre-existing asset entry.
    const fixtureToken = sha256(Buffer.from(`${process.pid}-${Date.now()}-${sandboxRoot}`));
    const namedFixture = offset => join(assetDir, `tk-vtext.${fixtureToken.slice(offset, offset + 16)}.gzdata`);
    const staleOwnedPath = historicalAssetPath;
    const invalidMatchingRegularPath = namedFixture(0);
    const matchingDirectoryPath = namedFixture(4);
    const internalSymlinkPath = namedFixture(8);
    const externalSymlinkPath = namedFixture(12);
    const fifoAssetPath = namedFixture(16);
    const socketAssetPath = namedFixture(24);
    const nearPatternForeignPath = `${namedFixture(20)}.bak`;
    const foreignPath = join(assetDir, `foreign-verse-fixture-${fixtureToken.slice(0, 16)}.keep`);
    const externalAssetTarget = join(pathGuardDir, 'external-asset-target.keep');
    for (const path of [
      invalidMatchingRegularPath,
      matchingDirectoryPath,
      internalSymlinkPath,
      externalSymlinkPath,
      fifoAssetPath,
      socketAssetPath,
      nearPatternForeignPath,
      foreignPath,
    ]) {
      assert.equal(lstatOrNull(path), null, `fixture path must be unused: ${path}`);
      createdAssetFixtures.push(path);
    }
    assert.equal(lstatOrNull(staleOwnedPath), null, 'copied repository starts without the stale historical asset');
    createdAssetFixtures.push(staleOwnedPath);

    writeFileSync(beforeMeta.path, beforeAsset); // Plant the current regular payload explicitly.
    const historicalAssetBytes = gzipSync(historicalSource, { level: 9, mtime: 0 });
    writeFileSync(staleOwnedPath, historicalAssetBytes);
    writeFileSync(invalidMatchingRegularPath, Buffer.from('not-a-generator-owned-gzip'));
    mkdirSync(matchingDirectoryPath);
    writeFileSync(nearPatternForeignPath, Buffer.from('foreign-near-pattern'));
    writeFileSync(foreignPath, Buffer.from('foreign-payload'));
    writeFileSync(externalAssetTarget, 'external-link-target');
    symlinkSync(basename(foreignPath), internalSymlinkPath);
    symlinkSync(externalAssetTarget, externalSymlinkPath);
    const assetFifoResult = spawnSync('mkfifo', [fifoAssetPath], { encoding: 'utf8' });
    assert.equal(assetFifoResult.status, 0, assetFifoResult.stderr);
    const assetSocketResult = spawnSync('python3', [
      '-c',
      'import socket,sys; sock=socket.socket(socket.AF_UNIX); sock.bind(sys.argv[1]); sock.close()',
      socketAssetPath,
    ], { encoding: 'utf8' });
    assert.equal(assetSocketResult.status, 0, assetSocketResult.stderr);

    const firstBuild = sandboxBuild();
    assert.equal(firstBuild.status, 0, firstBuild.stderr || firstBuild.stdout);
    const secondBuild = sandboxBuild();
    assert.equal(secondBuild.status, 0, secondBuild.stderr || secondBuild.stdout);

    const afterHtml = readFileSync(sandboxGeneratedPath);
    const afterMeta = assetMetadata(afterHtml.toString('utf8'), sandboxRoot);
    const afterAsset = readFileSync(afterMeta.path);
    assert.ok(afterHtml.equals(beforeHtml), 'tzofen.html is byte-deterministic across rebuilds');
    assert.ok(afterAsset.equals(beforeAsset), 'current verse display asset is retained byte-identically');
    assert.equal(afterMeta.url, `/els-data/tk-vtext.${sha256(source).slice(0, 16)}.gzdata`);
    assert.equal(afterMeta.sourceSha, sha256(source));
    assert.equal(afterMeta.sourceBytes, source.length);
    assert.ok(gunzipSync(afterAsset).equals(source), 'decompressed asset equals tk-vtext.txt byte-for-byte');
    assert.equal(afterAsset.readUInt32LE(4), 0, 'gzip mtime is zero');
    assert.ok(!afterMeta.url.startsWith('http'), 'asset stays on the current origin');
    assert.match(afterMeta.url, /\.gzdata$/, 'custom binary suffix does not ask the server to apply Content-Encoding');
    assert.ok(readFileSync(staleOwnedPath).equals(historicalAssetBytes), 'stale regular content-addressed payload is preserved byte-identically');
    assert.equal(readFileSync(invalidMatchingRegularPath, 'utf8'), 'not-a-generator-owned-gzip', 'matching foreign regular file is preserved');
    assert.equal(readFileSync(nearPatternForeignPath, 'utf8'), 'foreign-near-pattern', 'near-pattern foreign file is untouched');
    assert.equal(readFileSync(foreignPath, 'utf8'), 'foreign-payload', 'unrelated foreign file is untouched');
    assert.ok(lstatSync(matchingDirectoryPath).isDirectory(), 'matching directory is preserved');
    assert.ok(lstatSync(internalSymlinkPath).isSymbolicLink(), 'matching internal symlink is preserved');
    assert.ok(lstatSync(externalSymlinkPath).isSymbolicLink(), 'matching external symlink is preserved');
    assert.equal(readFileSync(externalAssetTarget, 'utf8'), 'external-link-target', 'hosted publication never traverses the external symlink');
    assert.ok(lstatSync(fifoAssetPath).isFIFO(), 'matching FIFO is preserved');
    assert.ok(lstatSync(socketAssetPath).isSocket(), 'matching socket entry is preserved');
    assert.deepEqual(
      ownedRegularNames(),
      [basename(afterMeta.path), basename(staleOwnedPath)].sort(),
      'same-source rebuild adds no asset and preserves the prior content-addressed regular file',
    );

    // Reproduce the former cleanup TOCTOU: replace the stale regular entry after HTML publication.
    // With automatic cleanup removed, the generator never stats or unlinks the raced entry.
    const retiredCleanupRace = startPausedBuild('after_html_publish');
    await retiredCleanupRace.ready;
    rmSync(staleOwnedPath);
    symlinkSync(externalAssetTarget, staleOwnedPath, 'file');
    retiredCleanupRace.release();
    const retiredCleanupResult = await retiredCleanupRace.closed;
    assert.equal(retiredCleanupResult.status, 0, retiredCleanupResult.stderr || retiredCleanupResult.stdout);
    assert.ok(lstatSync(staleOwnedPath).isSymbolicLink(), 'raced stale symlink is preserved');
    assert.equal(readlinkSync(staleOwnedPath), externalAssetTarget, 'raced stale symlink target is unchanged');
    assert.equal(readFileSync(externalAssetTarget, 'utf8'), 'external-link-target', 'raced stale symlink is never traversed');
    assert.deepEqual(temporaryPublishFiles(), [], 'retired cleanup boundary leaves no atomic-write temporary file');

    const standaloneHtml = standaloneTwo.toString('utf8');
    const standaloneUrl = standaloneHtml.match(/const VERSE_TEXT_ASSET="([^"]+)"/i)?.[1];
    assert.ok(standaloneUrl?.startsWith('data:application/gzip;base64,'), 'standalone payload is embedded as a data URL');
    const embeddedGzip = Buffer.from(standaloneUrl.slice(standaloneUrl.indexOf(',') + 1), 'base64');
    assert.ok(embeddedGzip.equals(afterAsset), 'standalone embeds the exact hosted gzip bytes');
    assert.ok(gunzipSync(embeddedGzip).equals(source), 'standalone payload expands to the exact canonical source bytes');
    assert.match(standaloneHtml, /function standaloneVerifyBatch\(payload\)/, 'standalone includes its bounded offline replay adapter');
    assert.doesNotMatch(afterHtml.toString('utf8'), /function standaloneVerifyBatch\(payload\)/, 'hosted output keeps the server bridge');

    const html = afterHtml.toString('utf8');
    assert.doesNotMatch(html, /id="verse-text"|__VERSE_TEXT_/);
    assert.doesNotMatch(html, /_idle\(\(\)=>\{ensureVerseText\(\);\}\)/, 'no mount/idle verse-text preload remains');
    assert.match(html, /if\(_vtextPending\)return _vtextPending/);
    assert.match(html, /finally\(\(\)=>\{if\(!VTEXT\)_vtextPending=null;\}\)/, 'failed loads release the shared promise for retry');
    assert.match(readFileSync(sandboxTemplatePath, 'utf8'), /cache:!embedded&&attempt\?"reload":"default"/);
    assertCanonicalHostedUntouched();

    removeAssetFixtures();

    // Each hosted transaction failure leaves a complete old/new pair and releases the lock.
    for (const phase of [
      'before_asset_replace',
      'between_asset_and_html',
      'after_html_publish',
    ]) {
      writeFileSync(sandboxSourcePath, historicalSource);
      const failed = sandboxBuild([], { SOD1820_ELS_TEST_FAIL_PHASE: phase });
      writeFileSync(sandboxSourcePath, source);
      assert.notEqual(failed.status, 0, `${phase} exits explicitly`);
      assert.match(failed.stderr, new RegExp(`injected ELS build failure at ${phase}`));
      assertHostedPairUsable([source, historicalSource], sandboxRoot);
      assert.deepEqual(temporaryPublishFiles(), [], `${phase} leaves no atomic-write temporary file`);

      const recovered = sandboxBuild();
      assert.equal(recovered.status, 0, `${phase} must not leave the cross-process lock held: ${recovered.stderr}`);
      const recoveredPair = assertHostedPairUsable([source], sandboxRoot);
      assert.ok(ownedRegularNames().includes(basename(recoveredPair.metadata.path)), `${phase} recovery keeps its referenced current asset`);
      assert.ok(
        ownedRegularNames().every(name => [basename(beforeMeta.path), basename(historicalAssetPath)].includes(name)),
        `${phase} recovery leaves only the real source snapshots published by this isolated test`,
      );
    }
    assertCanonicalHostedUntouched();

    const crashedWorker = startPausedBuild('lock_acquired');
    await crashedWorker.ready;
    crashedWorker.child.kill('SIGKILL');
    const crashed = await crashedWorker.closed;
    assert.equal(crashed.signal, 'SIGKILL', 'abrupt process exit occurs while holding the hosted lock');
    const afterCrash = sandboxBuild();
    assert.equal(afterCrash.status, 0, `kernel lock must release on process exit: ${afterCrash.stderr}`);
    assertHostedPairUsable([source], sandboxRoot);

    // Two different validated source snapshots serialize as complete transactions.
    const currentWorker = startPausedBuild();
    await currentWorker.ready;
    writeFileSync(sandboxSourcePath, historicalSource);
    const historicalWorker = startPausedBuild();
    await historicalWorker.ready;
    writeFileSync(sandboxSourcePath, source);
    currentWorker.release();
    historicalWorker.release();
    const differentResults = await Promise.all([currentWorker.closed, historicalWorker.closed]);
    for (const result of differentResults) {
      assert.equal(result.status, 0, `different-input concurrent build failed: ${result.stderr || result.stdout}`);
    }
    const concurrentPair = assertHostedPairUsable([source, historicalSource], sandboxRoot);
    assert.ok(ownedRegularNames().includes(basename(concurrentPair.metadata.path)), 'different-input concurrency leaves its referenced asset extant');
    assert.deepEqual(
      ownedRegularNames(),
      [basename(beforeMeta.path), basename(historicalAssetPath)].sort(),
      'different-input concurrency preserves both content-addressed source snapshots',
    );
    assert.deepEqual(temporaryPublishFiles(), [], 'different-input concurrency leaves no temporary orphan');

    const canonicalAfterDifferent = sandboxBuild();
    assert.equal(canonicalAfterDifferent.status, 0, canonicalAfterDifferent.stderr || canonicalAfterDifferent.stdout);
    assertHostedPairUsable([source], sandboxRoot);
    const assetsBeforeSameInput = ownedRegularNames();

    // Four same-input publishers all complete and converge on the deterministic pair.
    const sameInputWorkers = Array.from({ length: 4 }, () => startPausedBuild());
    await Promise.all(sameInputWorkers.map(worker => worker.ready));
    for (const worker of sameInputWorkers) worker.release();
    const sameInputResults = await Promise.all(sameInputWorkers.map(worker => worker.closed));
    for (const result of sameInputResults) {
      assert.equal(result.status, 0, `same-input concurrent build failed: ${result.stderr || result.stdout}`);
    }
    const finalPair = assertHostedPairUsable([source], sandboxRoot);
    assert.ok(ownedRegularNames().includes(basename(finalPair.metadata.path)), 'four-way build leaves the deterministic current asset extant');
    assert.deepEqual(ownedRegularNames(), assetsBeforeSameInput, 'four same-source publishers add no content-addressed asset');
    assert.deepEqual(temporaryPublishFiles(), [], 'four-way build leaves no temporary orphan');
    assertCanonicalHostedUntouched();
  } finally {
    for (const child of activeChildren) child.kill('SIGKILL');
    assertCanonicalHostedUntouched();
    rmSync(testTempRoot, { recursive: true, force: true });
  }
});

function loadPlaywright() {
  const req = createRequire(import.meta.url);
  for (const candidate of ['playwright', '/opt/node22/lib/node_modules/playwright', '/usr/lib/node_modules/playwright', '/usr/local/lib/node_modules/playwright']) {
    try { return req(candidate); } catch { /* try the next known installation */ }
  }
  return null;
}

const playwright = loadPlaywright();
const chromiumPath = process.env.CHROMIUM_EXECUTABLE_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : null);
const canRunBrowser = Boolean(playwright && chromiumPath);

test('CI: deferred verse payload browser acceptance must not be skipped when required', () => {
  if (process.env.ELS_REQUIRE_EXECUTABLE) {
    assert.ok(canRunBrowser, 'ELS_REQUIRE_EXECUTABLE=1 requires Playwright and Chromium');
  }
});

const HARNESS = `<!doctype html><meta charset=utf-8><body><iframe id=t src="/tzofen.html?embed=1&bridge=hidden&experience=2029" style="width:1200px;height:900px"></iframe><script>
window.__log=[];const frame=document.getElementById('t');
addEventListener('message',async event=>{const message=event.data;if(!message||message.source!=='tzofen'||event.source!==frame.contentWindow)return;
 window.__log.push(message);
 if(message.type==='ready')frame.contentWindow.postMessage({source:'sod-host',type:'tier',tier:'admin'},location.origin);
 if(message.type==='engine-request'){
  const reply=await fetch('/oracle',{method:'POST',body:JSON.stringify({op:message.op,payload:message.payload})}).then(response=>response.json());
  frame.contentWindow.postMessage({source:'sod-host',type:'engine-result',requestId:message.requestId,...reply},location.origin);
 }
});
</script>`;

function verifyBatch(payload) {
  const limit = payload.scope === 'tanakh' ? letters.length : TORAH_LEN;
  const corpusId = payload.scope === 'tanakh'
    ? '0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b'
    : '0b022e8eef6f9c16';
  if (payload.corpus_id !== corpusId) return { ok: true, result: { status: 'CORPUS_MISMATCH' } };
  const term = payload.term.replace(/[^א-ת]/g, '');
  const verified = [];
  for (const candidate of payload.candidates) {
    let matches = Number.isInteger(candidate.skip) && candidate.skip >= 2 && [1, -1].includes(candidate.dir) && Number.isInteger(candidate.start);
    for (let index = 0; matches && index < term.length; index++) {
      const corpusIndex = candidate.start + candidate.dir * candidate.skip * index;
      if (corpusIndex < 0 || corpusIndex >= limit || letters[corpusIndex] !== term[index]) matches = false;
    }
    if (matches) verified.push({ skip: candidate.skip, dir: candidate.dir, start: candidate.start });
  }
  return { ok: true, result: { status: 'OK', corpus_id: corpusId, verified }, trace_id: `verse-payload-${verified.length}` };
}

async function withBrowser(assetReplies, run, { assetDelayMs = 0 } = {}) {
  const tool = readFileSync(generatedPath);
  const metadata = assetMetadata(tool.toString('utf8'));
  const asset = readFileSync(metadata.path);
  const wrongAsset = gzipSync(Buffer.from('טקסט פסוק שאינו המקור הקנוני\n', 'utf8'), { level: 9, mtime: 0 });
  const assetRequests = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://loopback.test');
    if (url.pathname === metadata.url) {
      const reply = assetReplies[Math.min(assetRequests.length, assetReplies.length - 1)] || 'success';
      assetRequests.push(url.pathname + url.search);
      const finish = () => {
        if (reply === '404') { response.statusCode = 404; response.end('missing'); return; }
        response.setHeader('content-type', 'application/octet-stream');
        response.end(reply === 'corrupt' ? wrongAsset : asset);
      };
      if (assetDelayMs) setTimeout(finish, assetDelayMs); else finish();
      return;
    }
    if (url.pathname === '/oracle' && request.method === 'POST') {
      let body = '';
      request.on('data', chunk => { body += chunk; });
      request.on('end', () => {
        const message = JSON.parse(body);
        const result = message.op === 'verify_batch' ? verifyBatch(message.payload) : { ok: false, error: 'unsupported_test_operation' };
        response.setHeader('content-type', 'application/json'); response.end(JSON.stringify(result));
      });
      return;
    }
    if (url.pathname === '/tzofen.html') {
      response.setHeader('content-type', 'text/html; charset=utf-8'); response.end(tool); return;
    }
    response.setHeader('content-type', 'text/html; charset=utf-8'); response.end(HARNESS);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true, executablePath: chromiumPath });
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(String(error)));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const frame = page.frameLocator('#t');
    await frame.locator('#q').waitFor({ timeout: 60000 });
    await page.waitForFunction(() => window.__log.some(message => message.type === 'ready'), null, { timeout: 60000 });
    await run({ page, frame, assetRequests, sourceRows: readFileSync(sourcePath, 'utf8').split('\n') });
    assert.deepEqual(pageErrors, [], 'no uncaught browser errors');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}

async function withStandaloneBrowser(run) {
  const standaloneDir = mkdtempSync(join(root, '..', 'sod1820-els-file-browser-'));
  const standalonePath = join(standaloneDir, 'tzofen-offline.html');
  const result = spawnSync('python3', ['tools/els/build.py', '--standalone-out', standalonePath], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  let browser;
  let context;
  try {
    browser = await playwright.chromium.launch({ headless: true, executablePath: chromiumPath });
    context = await browser.newContext({ offline: true });
    const page = await context.newPage();
    const documentUrl = 'http://127.0.0.1/standalone-offline.html?bridge=hidden';
    const standaloneHtml = readFileSync(standalonePath);
    const externalRequests = [];
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(String(error)));
    await page.route(/^https?:\/\//i, route => {
      if (route.request().url() === documentUrl) {
        return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: standaloneHtml });
      }
      externalRequests.push(route.request().url());
      return route.abort('internetdisconnected');
    });
    await page.goto(documentUrl, { waitUntil: 'load', timeout: 60000 });
    await page.locator('#q').waitFor({ timeout: 60000 });
    await run({
      page,
      sourceRows: readFileSync(sourcePath, 'utf8').split('\n'),
      verseLengths: readFileSync(join(root, 'tools/els/data/tk-vlens.txt'), 'utf8').trim().split(',').map(Number),
    });
    assert.deepEqual(externalRequests, [], 'strict standalone acceptance attempts no HTTP(S) request beyond its in-process document');
    assert.deepEqual(pageErrors, [], 'standalone produces no uncaught browser errors');
  } finally {
    await context?.close();
    await browser?.close();
    rmSync(standaloneDir, { recursive: true, force: true });
  }
}

async function search(page, frame) {
  await frame.locator('#q').fill('משיח');
  await frame.locator('#go').click();
  await page.waitForFunction(() => window.__log.some(message => message.type === 'state' && message.term === 'משיח' && message.status === 'ok'), null, { timeout: 120000 });
  return page.evaluate(() => window.__log.filter(message => message.type === 'state' && message.term === 'משיח' && message.status === 'ok').at(-1));
}

async function requestSourceLenses(page, state, sequence) {
  const index = state.matrix.marks.find(mark => mark.type === 'main')?.i;
  assert.ok(Number.isInteger(index), 'verified matrix exposes a visible main letter');
  await page.evaluate(({ hitId, index: letterIndex, sequence: seq }) => {
    const target = document.getElementById('t').contentWindow;
    target.postMessage({ source: 'sod-host', type: 'request-lens', lens: 'verse-context', target: { hitId, nativeSeq: seq } }, location.origin);
    target.postMessage({ source: 'sod-host', type: 'request-lens', lens: 'letter-context', target: { i: letterIndex, nativeSeq: seq + 1 } }, location.origin);
  }, { hitId: state.axis.hitId, index, sequence });
}

test('browser: hosted payload stays demand-only and standalone serves exact source bytes without network',
  { skip: !canRunBrowser && 'Playwright/Chromium unavailable', timeout: 300000 }, async () => {
    await withBrowser(['success'], async ({ page, frame, assetRequests, sourceRows }) => {
      await page.waitForTimeout(1200);
      assert.equal(assetRequests.length, 0, 'mount and idle do not request verse display text');
      const state = await search(page, frame);
      assert.equal(assetRequests.length, 0, 'regular ELS search does not request verse display text');

      await requestSourceLenses(page, state, 100);
      await page.waitForFunction(() => [100, 101].every(seq => window.__log.some(message => message.type === 'lens' && message.target?.nativeSeq === seq)), null, { timeout: 60000 });
      assert.equal(assetRequests.length, 1, 'concurrent source actions share one in-flight request');
      const lenses = await page.evaluate(() => window.__log.filter(message => message.type === 'lens' && [100, 101].includes(message.target?.nativeSeq)));
      assert.ok(lenses.every(lens => lens.ok), JSON.stringify(lenses));
      const verseLens = lenses.find(lens => lens.lens === 'verse-context');
      const letterLens = lenses.find(lens => lens.lens === 'letter-context');
      assert.ok(verseLens.verses.every(verse => verse.text === sourceRows[verse.verseIndex]), 'verse lens returns exact canonical source rows');
      assert.equal(letterLens.verse.text, sourceRows[letterLens.location.verseIndex], 'letter lens returns the exact canonical source row');

      await page.evaluate(hitId => document.getElementById('t').contentWindow.postMessage({
        source: 'sod-host', type: 'request-lens', lens: 'verse-context', target: { hitId, nativeSeq: 102 },
      }, location.origin), state.axis.hitId);
      await page.waitForFunction(() => window.__log.some(message => message.type === 'lens' && message.target?.nativeSeq === 102));
      assert.equal(assetRequests.length, 1, 'loaded display text is reused without a second request');
    }, { assetDelayMs: 150 });

    await withStandaloneBrowser(async ({ page, sourceRows, verseLengths }) => {
      await page.locator('#q').fill('משיח');
      await page.locator('#go').click();
      const found = page.locator('.rhead .found');
      await found.waitFor({ timeout: 120000 });
      assert.match(await found.textContent(), /נמצא\s+משיח/, 'ordinary ELS search renders a verified matrix offline');

      const letter = page.locator('.matrix .mc.main[data-i]').first();
      const corpusIndex = Number(await letter.getAttribute('data-i'));
      assert.ok(Number.isInteger(corpusIndex) && corpusIndex >= 0, 'offline matrix exposes a canonical corpus index');
      await letter.click();
      await page.waitForFunction(() => {
        const verse = document.querySelector('#locpop .lp-verse');
        return verse && !verse.classList.contains('lp-vwait') && /^«.+»$/.test(verse.textContent || '');
      }, null, { timeout: 60000 });

      let verseIndex = 0;
      let verseStart = 0;
      while (verseIndex < verseLengths.length && corpusIndex >= verseStart + verseLengths[verseIndex]) {
        verseStart += verseLengths[verseIndex++];
      }
      assert.ok(verseIndex < verseLengths.length, 'clicked letter maps to a canonical verse boundary');
      assert.equal(
        await page.locator('#locpop .lp-verse').textContent(),
        `«${sourceRows[verseIndex]}»`,
        'clicked-letter source popup shows the exact canonical verse row from the embedded payload',
      );
      assert.match(await page.locator('#locpop .lp-ref').textContent(), /📍\s*.+/, 'clicked letter exposes its source reference');
    });
  });

test('browser: missing and corrupt payloads fail closed for display, then a later action retries successfully',
  { skip: !canRunBrowser && 'Playwright/Chromium unavailable', timeout: 300000 }, async () => {
    await withBrowser(['404', 'corrupt', 'success'], async ({ page, frame, assetRequests, sourceRows }) => {
      const state = await search(page, frame);
      assert.equal(assetRequests.length, 0);
      for (const sequence of [200, 202]) {
        await page.evaluate(({ hitId, sequence: seq }) => document.getElementById('t').contentWindow.postMessage({
          source: 'sod-host', type: 'request-lens', lens: 'verse-context', target: { hitId, nativeSeq: seq },
        }, location.origin), { hitId: state.axis.hitId, sequence });
        await page.waitForFunction(seq => window.__log.some(message => message.type === 'lens' && message.target?.nativeSeq === seq), sequence, { timeout: 60000 });
        const failed = await page.evaluate(seq => window.__log.find(message => message.type === 'lens' && message.target?.nativeSeq === seq), sequence);
        assert.equal(failed.ok, false, 'display request fails closed');
        assert.equal(failed.verses, undefined, 'failed display never invents verse content');
        const current = await page.evaluate(() => window.__log.filter(message => message.type === 'state' && message.status === 'ok').at(-1));
        assert.equal(current.axis.hitId, state.axis.hitId, 'display failure does not alter the ELS result');
      }
      assert.deepEqual(assetRequests, [assetRequests[0].replace(/\?.*$/, ''), `${assetRequests[0].replace(/\?.*$/, '')}?retry=1`]);

      await page.evaluate(hitId => document.getElementById('t').contentWindow.postMessage({
        source: 'sod-host', type: 'request-lens', lens: 'verse-context', target: { hitId, nativeSeq: 204 },
      }, location.origin), state.axis.hitId);
      await page.waitForFunction(() => window.__log.some(message => message.type === 'lens' && message.target?.nativeSeq === 204), null, { timeout: 60000 });
      const recovered = await page.evaluate(() => window.__log.find(message => message.type === 'lens' && message.target?.nativeSeq === 204));
      assert.equal(recovered.ok, true);
      assert.ok(recovered.verses.every(verse => verse.text === sourceRows[verse.verseIndex]), 'retry restores exact canonical display text');
      assert.equal(assetRequests.length, 3);
      assert.match(assetRequests[2], /\?retry=2$/);
    });
  });
