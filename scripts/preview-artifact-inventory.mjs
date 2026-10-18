import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

export const PREVIEW_RECEIPT_PATH = "preview-build.json";
export const PREVIEW_INVENTORY_PATH = "preview-artifacts.json";
export const PREVIEW_INVENTORY_VERSION = 1;
export const ZERO_SHA256 = "0".repeat(64);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const comparePath = (left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right));

async function walkFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => comparePath(a.name, b.name))) {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(root, absolute));
    else if (entry.isFile()) files.push(relative(root, absolute).split(sep).join("/"));
    else throw new Error(`Unsupported deployed artifact type: ${relative(root, absolute)}`);
  }
  return files.sort(comparePath);
}

function normalizeReceiptBytes(bytes) {
  let text = Buffer.from(bytes).toString("utf8");
  for (const key of ["artifactInventorySha256", "identitySha256"]) {
    const pattern = new RegExp(`(\\"${key}\\"\\s*:\\s*\\")[a-f0-9]{64}(\\")`);
    if (!pattern.test(text)) throw new Error(`Receipt is missing normalized field ${key}`);
    text = text.replace(pattern, `$1${ZERO_SHA256}$2`);
  }
  return Buffer.from(text);
}

function normalizeInventoryBytes(bytes) {
  const text = Buffer.from(bytes).toString("utf8");
  const pattern = /(\"path\"\s*:\s*\"preview-artifacts\.json\"[\s\S]*?\"sha256\"\s*:\s*\")[a-f0-9]{64}(\")/;
  if (!pattern.test(text)) throw new Error("Inventory is missing its normalized self entry");
  return Buffer.from(text.replace(pattern, `$1${ZERO_SHA256}$2`));
}

export function previewReceiptIdentity(receipt) {
  return {
    commit: receipt.commit,
    branch: receipt.branch,
    host: receipt.host,
    buildTarget: receipt.buildTarget,
    vercelEnv: receipt.vercelEnv,
    sourceClean: receipt.sourceClean,
    workerScript: receipt.workerScript,
    workerContentSha256: receipt.workerContentSha256,
    guardProtocol: receipt.guardProtocol,
    guardIdentitySha256: receipt.guardIdentitySha256,
    manifestSha256: receipt.manifestSha256,
    htmlSha256: receipt.htmlSha256,
    indexHtmlSha256: receipt.indexHtmlSha256,
    workerSha256: receipt.workerSha256,
    fallbackWorkerSha256: receipt.fallbackWorkerSha256,
    artifactInventoryPath: receipt.artifactInventoryPath,
    artifactInventorySha256: receipt.artifactInventorySha256,
    artifactCount: receipt.artifactCount,
  };
}

export async function createPreviewArtifactInventory(output, receiptFields) {
  const existing = await walkFiles(output);
  if (existing.includes(PREVIEW_RECEIPT_PATH) || existing.includes(PREVIEW_INVENTORY_PATH)) {
    throw new Error("Receipt or inventory existed before final artifact sealing");
  }

  const artifactCount = existing.length + 2;
  const receipt = {
    ...receiptFields,
    artifactInventoryPath: PREVIEW_INVENTORY_PATH,
    artifactInventorySha256: ZERO_SHA256,
    artifactCount,
    inventoryHashConvention: "ordinary files use exact bytes; preview-build.json hashes exact bytes after its artifactInventorySha256 and identitySha256 values are replaced by 64 zeroes; preview-artifacts.json hashes exact bytes after only its own sha256 value is replaced by 64 zeroes",
    identitySha256: ZERO_SHA256,
  };
  const receiptPlaceholder = jsonBytes(receipt);
  const receiptEntry = {
    path: PREVIEW_RECEIPT_PATH,
    size: receiptPlaceholder.byteLength,
    sha256: sha256(normalizeReceiptBytes(receiptPlaceholder)),
    digestConvention: "receipt-normalized-v1",
  };

  const artifacts = [];
  for (const path of existing) {
    const bytes = await readFile(resolve(output, path));
    artifacts.push({ path, size: bytes.byteLength, sha256: sha256(bytes), digestConvention: "exact-bytes-v1" });
  }
  artifacts.push(receiptEntry);
  const selfEntry = {
    path: PREVIEW_INVENTORY_PATH,
    size: 0,
    sha256: ZERO_SHA256,
    digestConvention: "inventory-self-normalized-v1",
  };
  artifacts.push(selfEntry);
  artifacts.sort((a, b) => comparePath(a.path, b.path));

  const inventory = {
    version: PREVIEW_INVENTORY_VERSION,
    algorithm: "sha256",
    pathOrder: "UTF-8 path ascending",
    artifacts,
  };
  for (;;) {
    const candidate = jsonBytes(inventory);
    if (selfEntry.size === candidate.byteLength) break;
    selfEntry.size = candidate.byteLength;
  }
  const inventoryPlaceholder = jsonBytes(inventory);
  selfEntry.sha256 = sha256(normalizeInventoryBytes(inventoryPlaceholder));
  const inventoryBytes = jsonBytes(inventory);
  if (inventoryBytes.byteLength !== selfEntry.size) throw new Error("Inventory self size did not stabilize");

  receipt.artifactInventorySha256 = selfEntry.sha256;
  receipt.identitySha256 = sha256(JSON.stringify(previewReceiptIdentity(receipt)));
  const receiptBytes = jsonBytes(receipt);
  if (receiptBytes.byteLength !== receiptEntry.size) throw new Error("Receipt size changed after sealing");
  if (sha256(normalizeReceiptBytes(receiptBytes)) !== receiptEntry.sha256) throw new Error("Receipt normalized digest changed after sealing");

  await writeFile(resolve(output, PREVIEW_RECEIPT_PATH), receiptBytes);
  await writeFile(resolve(output, PREVIEW_INVENTORY_PATH), inventoryBytes);
  await verifyPreviewArtifactInventory(output);
  return { receipt, inventory };
}

export async function verifyPreviewArtifactInventory(output) {
  const inventoryBytes = await readFile(resolve(output, PREVIEW_INVENTORY_PATH));
  const receiptBytes = await readFile(resolve(output, PREVIEW_RECEIPT_PATH));
  const inventory = JSON.parse(inventoryBytes);
  const receipt = JSON.parse(receiptBytes);
  if (inventory.version !== PREVIEW_INVENTORY_VERSION || inventory.algorithm !== "sha256") {
    throw new Error("Unsupported Preview artifact inventory");
  }
  if (!Array.isArray(inventory.artifacts)) throw new Error("Preview artifact inventory is malformed");

  const actualPaths = await walkFiles(output);
  const listedPaths = inventory.artifacts.map((entry) => entry.path);
  const sortedListed = [...listedPaths].sort(comparePath);
  if (new Set(listedPaths).size !== listedPaths.length || JSON.stringify(listedPaths) !== JSON.stringify(sortedListed)) {
    throw new Error("Preview artifact inventory paths are duplicated or unsorted");
  }
  if (JSON.stringify(actualPaths) !== JSON.stringify(listedPaths)) {
    const extras = actualPaths.filter((path) => !listedPaths.includes(path));
    const missing = listedPaths.filter((path) => !actualPaths.includes(path));
    throw new Error(`Preview artifact set mismatch; extra=${extras.join(",") || "none"}; missing=${missing.join(",") || "none"}`);
  }

  for (const entry of inventory.artifacts) {
    if (!entry || typeof entry.path !== "string" || !Number.isSafeInteger(entry.size) || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
      throw new Error(`Malformed Preview artifact entry: ${entry?.path || "unknown"}`);
    }
    const absolute = resolve(output, entry.path);
    if (absolute !== output && !absolute.startsWith(`${output}${sep}`)) throw new Error(`Unsafe Preview artifact path: ${entry.path}`);
    const info = await stat(absolute);
    if (info.size !== entry.size) throw new Error(`Preview artifact size mismatch: ${entry.path}`);
    const bytes = entry.path === PREVIEW_INVENTORY_PATH ? inventoryBytes
      : entry.path === PREVIEW_RECEIPT_PATH ? receiptBytes
        : await readFile(absolute);
    const digest = entry.digestConvention === "exact-bytes-v1" ? sha256(bytes)
      : entry.digestConvention === "receipt-normalized-v1" ? sha256(normalizeReceiptBytes(bytes))
        : entry.digestConvention === "inventory-self-normalized-v1" ? sha256(normalizeInventoryBytes(bytes))
          : "";
    if (digest !== entry.sha256) throw new Error(`Preview artifact digest mismatch: ${entry.path}`);
  }

  const selfEntry = inventory.artifacts.find((entry) => entry.path === PREVIEW_INVENTORY_PATH);
  if (!selfEntry || receipt.artifactInventoryPath !== PREVIEW_INVENTORY_PATH || receipt.artifactInventorySha256 !== selfEntry.sha256) {
    throw new Error("Preview receipt is not bound to the artifact inventory");
  }
  if (receipt.artifactCount !== inventory.artifacts.length) throw new Error("Preview receipt artifact count mismatch");
  if (receipt.identitySha256 !== sha256(JSON.stringify(previewReceiptIdentity(receipt)))) {
    throw new Error("Preview receipt identity mismatch");
  }
  return { receipt, inventory };
}
