import { buildResearchIntakeTransport } from "./researchIntakeTransport.js";
import { emailIntakeDescriptor } from "./sourceIntake.js";
import { supabase } from '../supabase.js';

// Same private inbox/RLS and existing Supabase session as legacy admin.
export async function loadEmailIntake({ offset = 0, limit = 50 } = {}) {
  const size = Math.max(1, Math.min(100, limit));
  const { data, error } = await supabase.from('inbound_emails')
    .select('id,from_email,from_name,to_email,subject,body_text,message_id,in_reply_to,received_at,read,replied_at,reply_count,meta')
    .order('received_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + size - 1);
  if (error) throw error;
  return { rows: data || [], hasMore: (data || []).length === size };
}

export async function saveEmailIntakeRoute(row, destinations) {
  const { data, error } = await supabase.rpc('admin_email_intake_route_v1', {
    p_inbound_id: row.id,
    p_destinations: destinations,
    p_expected_revision: row.meta?.intake_projection_v1?.revision || 0,
  });
  if (error) throw error;
  return data;
}

export async function resolveIntakeFollow(subject) {
  if (!subject) return null;
  const { data, error } = await supabase.rpc('canonical_follow_subject', {
    p_entity_type: subject.entityType, p_stable_id: subject.stableId,
  });
  if (error) throw error;
  return data || null;
}

export async function getIntakeCapabilities() {
  try {
    const { data, error } = await supabase.rpc('admin_email_intake_capabilities_v1');
    if (!error) return { routing:data?.routing === true, publication:false };
  } catch { /* fail closed, never leave an unhandled capability request */ }
  return { routing:false, publication:false, reason:'unavailable' };
}

export const emailIntakeToResearchTransport = row => buildResearchIntakeTransport(emailIntakeDescriptor(row));
