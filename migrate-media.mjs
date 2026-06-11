#!/usr/bin/env node
import { Client as FtpClient } from "basic-ftp";
import { createClient } from "@supabase/supabase-js";
import mime from "mime-types";
import { Writable } from "stream";
import fs from "fs";
import path from "path";

const FTP_HOST = process.env.FTP_HOST || "176.9.237.55";
const FTP_PORT = Number(process.env.FTP_PORT || 21);
const FTP_USER = process.env.FTP_USER;
const FTP_PASS = process.env.FTP_PASS;
const FTP_SECURE = process.env.FTP_SECURE === "true";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.BUCKET || "media";
const REMOTE_BASE = process.env.REMOTE_BASE || "httpdocs/wp-content/uploads";
// כל השנים 2013→היום (ניתן לעקוף עם YEAR_FOLDERS="2013,2014,..." במשתנה סביבה)
const YEAR_FOLDERS = process.env.YEAR_FOLDERS
  ? process.env.YEAR_FOLDERS.split(",").map((s) => s.trim()).filter(Boolean)
  : Array.from({ length: new Date().getFullYear() - 2013 + 1 }, (_, i) => String(2013 + i));
const SKIP_FOLDERS = new Set(["elementor","woocommerce_uploads","wpforms","mailpoet","redux"]);
const LOG_FILE = "migration-log.json";

function requireEnv() {
  const missing = [];
  if (!FTP_USER) missing.push("FTP_USER");
  if (!FTP_PASS) missing.push("FTP_PASS");
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_KEY) missing.push("SUPABASE_SERVICE_KEY");
  if (missing.length) { console.error("חסר:", missing.join(", ")); process.exit(1); }
}
const supabase = () => createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
function loadLog() { try { return JSON.parse(fs.readFileSync(LOG_FILE, "utf8")); } catch { return { done: {}, failed: {} }; } }
function saveLog(log) { fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2)); }

async function existsInStorage(sb, remotePath) {
  const dir = path.posix.dirname(remotePath);
  const base = path.posix.basename(remotePath);
  const { data, error } = await sb.storage.from(BUCKET).list(dir, { search: base, limit: 1 });
  if (error) return false;
  return Array.isArray(data) && data.some((f) => f.name === base);
}
async function downloadToBuffer(ftp, remoteFile) {
  const chunks = [];
  const sink = new Writable({ write(c,_e,cb){ chunks.push(c); cb(); } });
  await ftp.downloadTo(sink, remoteFile);
  return Buffer.concat(chunks);
}
async function uploadBuffer(sb, storagePath, buffer) {
  const contentType = mime.lookup(storagePath) || "application/octet-stream";
  const { error } = await sb.storage.from(BUCKET).upload(storagePath, buffer, { contentType, upsert: false });
  if (error && !/already exists/i.test(error.message)) throw error;
}
async function walkAndMigrate(ftp, sb, remoteDir, log, stats) {
  let list;
  try { list = await ftp.list(remoteDir); } catch (e) { console.warn("דילוג:", remoteDir, e.message); return; }
  for (const item of list) {
    const remotePath = path.posix.join(remoteDir, item.name);
    if (item.isDirectory) {
      if (SKIP_FOLDERS.has(item.name)) { console.log("skip", item.name); continue; }
      await walkAndMigrate(ftp, sb, remotePath, log, stats); continue;
    }
    const rel = remotePath.slice(remotePath.indexOf("uploads/"));
    if (!rel.startsWith("uploads/")) continue;
    if (log.done[rel]) { stats.skipped++; continue; }
    if (await existsInStorage(sb, rel)) { log.done[rel] = { skippedExisting: true }; stats.skipped++; continue; }
    try {
      const buf = await downloadToBuffer(ftp, remotePath);
      await uploadBuffer(sb, rel, buf);
      log.done[rel] = { size: buf.length, at: new Date().toISOString() };
      stats.uploaded++; stats.bytes += buf.length;
      console.log("OK " + rel + " (" + (buf.length/1024).toFixed(0) + " KB)");
    } catch (e) { log.failed[rel] = { error: e.message }; stats.errors++; console.error("ERR " + rel + " - " + e.message); }
    stats.processed++;
    if (stats.processed % 25 === 0) saveLog(log);
  }
}
async function main() {
  requireEnv();
  const sb = supabase();
  const log = loadLog();
  const stats = { processed: 0, uploaded: 0, skipped: 0, errors: 0, bytes: 0 };
  const ftp = new FtpClient(0);
  ftp.ftp.verbose = false;
  try {
    await ftp.access({ host: FTP_HOST, port: FTP_PORT, user: FTP_USER, password: FTP_PASS, secure: FTP_SECURE });
    console.log("connected FTP:", FTP_HOST);
    for (const year of YEAR_FOLDERS) {
      const dir = path.posix.join(REMOTE_BASE, year);
      console.log("folder " + year);
      await walkAndMigrate(ftp, sb, dir, log, stats);
      saveLog(log);
    }
    saveLog(log);
    console.log("DONE uploaded:" + stats.uploaded + " skipped:" + stats.skipped + " errors:" + stats.errors + " MB:" + (stats.bytes/1024/1024).toFixed(1));
  } catch (e) { console.error("error:", e.message); saveLog(log); process.exit(1); }
  finally { ftp.close(); }
}
main();
