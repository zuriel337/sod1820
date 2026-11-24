// #1514: deterministic PRE-PUBLICATION review plan for gilui-yomi.
// This function only reports eligibility/evidence gaps. It never writes,
// grants permission, establishes identity, or authorizes publication.
// All input must be assembled on the trusted server from canonical tables.
// The final write must recheck all source/author/parent conditions atomically.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WA_ID=/^[A-Za-z0-9_-]{16,128}$/;
const mailId=Number.isSafeInteger;
const hold=(reason)=>Object.freeze({state:"held",reason,sourceRef:null,parentRef:null});
export function planGiluiCommunitySource({source, proof, writer, parent, existing}={}) {
  if (source?.channel!=="gilui-yomi") return hold("wrong_channel");
  if (!UUID.test(String(source.id||""))) return hold("missing_source_identity");
  if (existing?.sameSource===true) return Object.freeze({state:"existing",reason:"already_imported",sourceRef:`channel_updates:${source.id}`,parentRef:null});
  if (source.source==="auto") {
    if (!WA_ID.test(String(source.ext_msg_id||"")) || source.group_source_intake_public!==true)
      return hold("unqualified_source");
    if (!proof || proof.update_id!==source.id || proof.channel!=="gilui-yomi"
      || proof.ext_msg_id!==source.ext_msg_id || proof.incoming!==true
      || proof.held_at!=null || proof.identity_basis!=="verified_phone_unique"
      || proof.identity_contributor_id==null)
      return hold("unverified_group_proof");
    if (writer?.id!==proof.identity_contributor_id)
      return hold("writer_identity_mismatch");
    if (writer.active!==true || writer.locked===true || writer.building===true
      || writer.visibility!=="public" || writer.editoriallyApproved!==true)
      return hold("writer_not_approved");
  } else if (source.source==="resend") {
    if (!mailId(source.inbound_email_id) || source.inbound_email_id<=0
      || source.verified_webhook!==true || source.senderMatchesContributor!==true
      || writer?.id!==source.contributor_id || writer.active!==true
      || writer.visibility!=="public" || writer.editoriallyApproved!==true)
      return hold("unverified_email_source");
  } else return hold("unknown_source_type");
  if (source.safePublicBody!==true || !String(source.body||"").trim())
    return hold("body_not_admitted");
  const parentId=source.quoted_parent_ext_msg_id||source.in_reply_to;
  const sourceRef=source.source==="auto" ? `channel_updates:${source.id}` : `inbound_emails:${source.inbound_email_id}`;
  if (!parentId) return Object.freeze({state:"candidate_root",reason:"source_reviewed",sourceRef,parentRef:null});
  if (source.source==="auto" && !WA_ID.test(String(parentId))) return hold("invalid_parent_id");
  if (!parent || parent.group_chat_id!==proof?.group_chat_id && source.source==="auto"
      || !UUID.test(String(parent.community_id||"")) || parent.publiclyAdmitted!==true
      || parent.cycleSafe!==true)
    return hold("parent_not_proven");
  return Object.freeze({state:"candidate_reply",reason:"parent_proven",sourceRef,parentRef:parent.community_id});
}
