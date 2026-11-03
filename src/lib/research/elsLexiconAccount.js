// Account-only attachments to existing private saved matrices. No local/session storage,
// ResearchProvider cache, offline journal, public publication or schema/permission changes.
import { readElsSavedScan } from './elsLexiconSavedScan.js';

// Scope no-store to these SDK requests. Retain the SDK's existing authenticated fetch;
// never replace global fetch or create another auth client. Fail closed if SDK changes.
function noStore(query) {
  if (typeof query.fetch !== 'function') throw new Error('account_transport_unavailable');
  query.abortSignal(AbortSignal.timeout(15000));
  const authenticatedFetch = query.fetch;
  query.fetch = (url, init) => authenticatedFetch(url, { ...init, cache: 'no-store' });
  return query;
}

const requireCurrent = current => { if (!current()) throw new Error('account_changed'); };
const privateRow = (row, userId) => row?.owner_user_id === userId && row.visibility === 'private'
  && !row.self_published && row.status !== 'published';
const canonicalJson = value => JSON.stringify(value, (_key, v) => v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);

export async function listElsAccountScans(client, userId, current = () => true) {
  if (!userId) return [];
  requireCurrent(current);
  const { data, error } = await noStore(client.from('els_records')
    .select('id,title,positions->lexiconScanIndex')
    .eq('owner_user_id', userId).eq('visibility', 'private')
    .not('positions->lexiconScanIndex', 'is', null).order('created_at', { ascending: false }).limit(100));
  requireCurrent(current); if (error) throw error;
  return (data || []).flatMap(row => (Array.isArray(row.lexiconScanIndex) ? row.lexiconScanIndex : [])
    .filter(s => typeof s.id === 'string' && typeof s.savedAt === 'number')
    .map(s => ({ recordId: row.id, title: row.title, id: s.id, savedAt: s.savedAt, mode: s.mode }))).sort((a, b) => b.savedAt - a.savedAt);
}

export async function getElsAccountMatrix(client, userId, recordId, current = () => true) {
  if (!userId) throw new Error('auth_required');
  requireCurrent(current);
  const { data: row, error } = await noStore(client.from('els_records').select('*')
    .eq('id', recordId).eq('owner_user_id', userId).maybeSingle());
  requireCurrent(current); if (error) throw error;
  if (!privateRow(row, userId)) throw new Error('scan_unavailable');
  return row;
}

export async function loadElsAccountScan(client, userId, recordId, scanId, current = () => true) {
  const row = await getElsAccountMatrix(client, userId, recordId, current);
  const scan = row.positions?.lexiconScans?.find(s => s.id === scanId);
  const checked = readElsSavedScan({ type: 'els', elsLexiconScan: scan });
  if (!checked) throw new Error('scan_invalid');
  return checked;
}

export async function saveElsAccountScan(client, userId, entity, current = () => true) {
  const scan = readElsSavedScan(entity);
  if (!userId || !scan) throw new Error('scan_invalid');
  const o = scan.origin;
  requireCurrent(current);
  const { data: row, error } = await noStore(client.from('els_records')
    .select('id,owner_user_id,visibility,status,self_published,positions')
    .eq('owner_user_id', userId).eq('visibility', 'private').eq('self_published', false).neq('status', 'published')
    .eq('search_term', scan.returnSnapshot.term).eq('scope', o.corpus).eq('corpus_id', o.corpusId)
    .eq('skip_distance', o.skip).eq('direction', o.dir === 1 ? 'fwd' : 'back').eq('start_index', o.start)
    .order('created_at', { ascending: false }).limit(1).maybeSingle());
  requireCurrent(current); if (error) throw error;
  if (!privateRow(row, userId)) throw new Error('save_matrix_first');
  const old = row.positions;
  if (old !== null && (typeof old !== 'object' || Array.isArray(old))) throw new Error('matrix_format_unavailable');
  const previous = old?.lexiconScans || [];
  if (!Array.isArray(previous)) throw new Error('scan_invalid');
  const existing = previous.find(s => s.id === scan.id);
  if (existing) {
    if (canonicalJson(existing) !== canonicalJson(scan)) throw new Error('scan_id_conflict');
    return { recordId: row.id, scanId: scan.id };
  }
  const scans = [...previous, scan];
  const positions = { ...old, lexiconScans: scans,
    lexiconScanIndex: scans.map(s => ({ id: s.id, savedAt: s.savedAt, mode: s.data.plan?.mode || 'words' })) };
  if (new TextEncoder().encode(JSON.stringify(positions)).length > 3000000) throw new Error('archive_full');
  const ack = await compareAndSetElsAccountMatrix(client, userId, row, { positions }, current);
  if (!ack.lexiconScanIndex?.some(s => s.id === scan.id)) throw new Error('scan_save_conflict');
  return { recordId: row.id, scanId: scan.id };
}

// The updated private editor uses the same guard once an archive is attached.
// Only the existing editable fields are accepted; public/foreign records are refused.
export async function compareAndSetElsAccountMatrix(client, userId, row, changes, current = () => true) {
  if (!privateRow(row, userId) || !changes || Object.keys(changes).some(k => !['positions', 'image_url', 'description', 'engine_detail'].includes(k))) throw new Error('scan_unavailable');
  requireCurrent(current);
  const old = row.positions;
  if (!changes.positions || (old !== null && (typeof old !== 'object' || Array.isArray(old)))) throw new Error('matrix_format_unavailable');
  for (const scan of old?.lexiconScans || []) {
    const kept = changes.positions.lexiconScans?.find(s => s.id === scan.id);
    if (!kept || canonicalJson(kept) !== canonicalJson(scan)) throw new Error('archive_preservation_required');
  }
  let update = client.from('els_records').update(changes).eq('id', row.id)
    .eq('owner_user_id', userId).eq('visibility', 'private').eq('self_published', false).neq('status', 'published');
  if (old === null) update = update.is('positions', null);
  else {
    // Snapshots are immutable and every append changes the index. Compare that
    // small index plus the matrix fields, not megabytes of archive in a URL.
    const keys = new Set([...Object.keys(old).filter(k => k !== 'lexiconScans'), 'lexiconScanIndex',
      'findings', 'postUrl', 'postTitle', 'quality', 'shapeUrl', 'hideMain', 'searchWindow', 'view']);
    for (const key of keys) {
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) throw new Error('matrix_format_unavailable');
      update = old[key] == null ? update.is(`positions->>${key}`, null)
        : update.eq(`positions->${key}`, JSON.stringify(old[key]));
    }
    if (!update.url || update.url.href.length > 7000) throw new Error('matrix_guard_too_large');
  }
  requireCurrent(current);
  const ack = await noStore(update.select('id,positions->lexiconScanIndex').maybeSingle());
  requireCurrent(current); if (ack.error) throw ack.error;
  if (ack.data?.id !== row.id) throw new Error('scan_save_conflict');
  return ack.data;
}
