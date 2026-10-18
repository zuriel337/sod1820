export const NUMBER_DEPTH_INTENT_MIN_DELTA = 32;
export const NUMBER_DEPTH_INTENT_MAX_AGE_MS = 900;

const KEY_DELTAS = Object.freeze({
  ArrowDown: 40,
  ArrowUp: 40,
  PageDown: 640,
  PageUp: 640,
  Home: 640,
  End: 640,
  " ": 640,
  Spacebar: 640,
});

const finiteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/**
 * A small input-intent gate for the Number depth sentinel.
 *
 * Scroll position is deliberately not an input. Only an explicit wheel, scrolling key, touch
 * movement, or primary pointer drag can accumulate intent. Navigation/restoration callers can
 * clear pending intent without re-enabling a consumed gate.
 */
export function createNumberDepthIntentState({
  minDelta = NUMBER_DEPTH_INTENT_MIN_DELTA,
  maxAgeMs = NUMBER_DEPTH_INTENT_MAX_AGE_MS,
} = {}) {
  const threshold = Math.max(1, Number(minDelta) || NUMBER_DEPTH_INTENT_MIN_DELTA);
  const lifetime = Math.max(1, Number(maxAgeMs) || NUMBER_DEPTH_INTENT_MAX_AGE_MS);
  let accumulatedDelta = 0;
  let lastInputAt = null;
  let touchY = null;
  let pointer = null;
  let consumed = false;

  const fresh = (now) => (
    lastInputAt != null
    && Number.isFinite(now)
    && now >= lastInputAt
    && now - lastInputAt <= lifetime
  );

  const expireIfNeeded = (now) => {
    if (lastInputAt != null && !fresh(now)) {
      accumulatedDelta = 0;
      lastInputAt = null;
    }
  };

  const addDelta = (delta, now = Date.now()) => {
    if (consumed) return false;
    const amount = finiteNumber(delta);
    const at = finiteNumber(now);
    if (amount == null || at == null || Math.abs(amount) < 1) return false;
    expireIfNeeded(at);
    accumulatedDelta = Math.min(threshold * 8, accumulatedDelta + Math.abs(amount));
    lastInputAt = at;
    return accumulatedDelta >= threshold;
  };

  const clearPending = () => {
    accumulatedDelta = 0;
    lastInputAt = null;
    touchY = null;
    pointer = null;
  };

  return Object.freeze({
    wheel(deltaY, now = Date.now()) {
      return addDelta(deltaY, now);
    },

    key(key, { viewportHeight = 0, now = Date.now() } = {}) {
      if (!Object.hasOwn(KEY_DELTAS, key)) return false;
      const viewport = Math.max(0, finiteNumber(viewportHeight) || 0);
      const estimated = key.startsWith("Arrow") ? KEY_DELTAS[key] : Math.max(KEY_DELTAS[key], viewport * 0.8);
      return addDelta(estimated, now);
    },

    touchStart(clientY) {
      touchY = finiteNumber(clientY);
      return false;
    },

    touchMove(clientY, now = Date.now()) {
      const nextY = finiteNumber(clientY);
      if (nextY == null) return false;
      if (touchY == null) {
        touchY = nextY;
        return false;
      }
      const delta = nextY - touchY;
      touchY = nextY;
      return addDelta(delta, now);
    },

    touchEnd() {
      touchY = null;
    },

    pointerStart({ pointerId = null, clientY = null, pointerType = "mouse", button = 0, isPrimary = true } = {}) {
      const y = finiteNumber(clientY);
      if (y == null || isPrimary === false || button !== 0 || !["mouse", "pen"].includes(pointerType)) {
        pointer = null;
        return false;
      }
      pointer = { pointerId, clientY: y, pointerType };
      return false;
    },

    pointerMove({ pointerId = null, clientY = null, buttons = 1 } = {}, now = Date.now()) {
      const y = finiteNumber(clientY);
      if (!pointer || pointer.pointerId !== pointerId || y == null || (Number(buttons) & 1) !== 1) return false;
      const delta = y - pointer.clientY;
      pointer = { ...pointer, clientY: y };
      return addDelta(delta, now);
    },

    pointerEnd(pointerId = null) {
      if (pointer && (pointerId == null || pointer.pointerId === pointerId)) pointer = null;
    },

    clearPending,

    ready(now = Date.now()) {
      const at = finiteNumber(now);
      if (consumed || at == null) return false;
      expireIfNeeded(at);
      return fresh(at) && accumulatedDelta >= threshold;
    },

    consumeIfNear(isNear, now = Date.now()) {
      const at = finiteNumber(now);
      if (consumed || isNear !== true || at == null) return false;
      expireIfNeeded(at);
      if (!fresh(at) || accumulatedDelta < threshold) return false;
      consumed = true;
      clearPending();
      return true;
    },

    snapshot(now = Date.now()) {
      const at = finiteNumber(now);
      if (at != null) expireIfNeeded(at);
      return Object.freeze({
        accumulatedDelta,
        fresh: at != null && fresh(at),
        ready: !consumed && at != null && fresh(at) && accumulatedDelta >= threshold,
        consumed,
        trackingTouch: touchY != null,
        trackingPointer: pointer != null,
      });
    },
  });
}
