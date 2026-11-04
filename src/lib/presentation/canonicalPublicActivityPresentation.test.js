// node --test src/lib/presentation/canonicalPublicActivityPresentation.test.js
import test from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_PUBLIC_UI_COPY,
  PUBLIC_ACTIVITY_KIND,
  canonicalPublicActivityPresentation,
} from "./canonicalPresentation.js";

test("canonical public activity distinguishes source publication from source update", () => {
  const published = canonicalPublicActivityPresentation({
    kind: "source",
    sourcePublishedAt: "2026-10-20T10:00:00Z",
    sourceUpdatedAt: "2026-10-20T10:00:00Z",
  });
  assert.equal(published.key, PUBLIC_ACTIVITY_KIND.SOURCE_PUBLISHED);
  assert.equal(published.label, "מקור פורסם");
  assert.equal(published.at, "2026-10-20T10:00:00.000Z");

  const updated = canonicalPublicActivityPresentation({
    kind: "source",
    sourcePublishedAt: "2026-09-01T10:00:00Z",
    sourceUpdatedAt: "2026-10-21T12:00:00Z",
  });
  assert.equal(updated.key, PUBLIC_ACTIVITY_KIND.SOURCE_UPDATED);
  assert.equal(updated.label, "מקור עודכן");
  assert.equal(updated.at, "2026-10-21T12:00:00.000Z");
});

test("canonical public activity keeps source, writer, topic and finding states separate", () => {
  assert.equal(canonicalPublicActivityPresentation({ kind: "source", sourceKind: "group_message", arrivalAt: "2026-10-22" }).key,
    PUBLIC_ACTIVITY_KIND.SOURCE_RECEIVED);
  assert.equal(canonicalPublicActivityPresentation({ kind: "writer", updatedAt: "2026-10-22" }).key,
    PUBLIC_ACTIVITY_KIND.WRITER_UPDATED);
  assert.equal(canonicalPublicActivityPresentation({ kind: "convergence", approvedAt: "2026-10-22" }).key,
    PUBLIC_ACTIVITY_KIND.TOPIC_APPROVED);
  assert.equal(canonicalPublicActivityPresentation({ kind: "finding", createdAt: "2026-10-22" }).key,
    PUBLIC_ACTIVITY_KIND.FINDING_ADDED);
});

test("missing activity time stays missing and canonical public copy is reusable", () => {
  const state = canonicalPublicActivityPresentation({ kind: "finding" });
  assert.equal(state.at, null);
  assert.equal(CANONICAL_PUBLIC_UI_COPY.search.subjectSourceNumber, "חיפוש לפי נושא, מקור או מספר");
  assert.equal(CANONICAL_PUBLIC_UI_COPY.action.source, "למקור");
  assert.equal(CANONICAL_PUBLIC_UI_COPY.action.writer, "לדף הכתב");
});
