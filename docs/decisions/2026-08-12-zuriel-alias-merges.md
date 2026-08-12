# [ZURIEL-DECISION] Writer identity merges + סלי מור page — 2026-08-12

**Provenance chain:** RESEARCHED_BY=CLAUDE → PROPOSED_BY=CLAUDE (Alias Candidates Report) → APPROVED_BY=ZURIEL → BUILT_BY=CLAUDE.

Identity mapping only. No provenance deleted or rewritten. `gematria_words` untouched — the 9 סלי-מור words keep their existing status (source/CORE per their own row); this only connects them to an identity/page, **no promotion to Core/Canonical**.

Verified against the live schema before writing: `contributors.wa_names` is `text[]` (append, not overwrite); the three variants are **not** separate contributor rows, so the correct tool is `wa_names`, not `merged_into`.

## Applied SQL (live DB — data changes take effect immediately, independent of deploy)

```sql
-- (א) צבי (OPOC): append «צבי (OPOC1)» + «צבי» to existing wa_names (["OPOC1 OPOC1"])
update contributors
set wa_names = array['OPOC1 OPOC1','צבי (OPOC1)','צבי'], updated_at = now()
where slug = 'tzvi-opoc' and wa_names = array['OPOC1 OPOC1'];

-- (ב) יצחק שחר קנדרו: append «שחר יצחק קנדרו» (was empty)
update contributors
set wa_names = array['שחר יצחק קנדרו'], updated_at = now()
where slug = 'shachar-kandro' and coalesce(array_length(wa_names,1),0) = 0;

-- (ג) open a full contributor page for סלי מור (identity + page; does NOT touch the 9 words)
insert into contributors (display_name, slug, kind, vip, active, source, role, on_whatsapp, specialty_label, accent, emblem, engaged)
select 'סלי מור','sali-mor','vip',true,true,'whatsapp-vip','חוקר רמזים · VIP',true,'חוקר רמזים · קוד המציאות','#8a6a1c','✦',false
where not exists (select 1 from contributors where slug='sali-mor');
```

## Verified result

| slug | wa_names | note |
|------|----------|------|
| `tzvi-opoc` | `["OPOC1 OPOC1","צבי (OPOC1)","צבי"]` | existing preserved + 2 appended |
| `shachar-kandro` | `["שחר יצחק קנדרו"]` | added |
| `sali-mor` | `[]` | new page, vip=true, active=true |

## Effect (via the CC-1.2 `VerifiedGematrias` vip_source lens, once deployed)

- צבי: +62 (`vip_source='OPOC1 OPOC1'`) +5 (`vip_source='צבי (OPOC1)'`) engine-verified words surface on his page.
- יצחק: +3 (`vip_source='שחר יצחק קנדרו'`) engine-verified.
- סלי מור: 9 engine-verified words (`vip_source='סלי מור'`) surface on the new page.

Engine-verification (`is_verified`) ≠ human approval / canonical — the distinction is preserved.

work_log id: `a7556197-c1cf-41e0-a8af-119381dd3eef`.
