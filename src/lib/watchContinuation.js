/** Presentation helpers for the existing subscription_funnel_law / WatchButton.
 * No identity, consent, topic registry, persistence or delivery owner lives here.
 */
export function normalizeFollowTopic(value) {
  if (typeof value !== 'string') return '';
  const topic = value.trim();
  // Existing resolve_topics('category', id) uses cat:. Forward-only alias fix.
  if (topic.startsWith('category:')) return `cat:${topic.slice(9)}`;
  return topic;
}

export function watchContinuation({ following = false, userId = null,
  authLoading = false, justFollowed = false, noPush = false,
  pushReady = false, pushOn = false } = {}) {
  if (authLoading || !following) return 'none';
  // A returning anonymous follower needs the same continuation as a new follower.
  // Variant deliberately is NOT an input: it changes presentation only.
  if (!userId) return 'register';
  if (justFollowed && !noPush && pushReady && !pushOn) return 'push';
  return 'none';
}

export function assertWatchResult(result, topic, expectedFollowing) {
  if (!result || result.following !== expectedFollowing || result.topic !== topic) {
    throw new Error('Follow persistence was not confirmed');
  }
  return result;
}

export function requireVerifiedEmailSession(data) {
  if (!data?.session?.access_token || !data?.user?.id || !data.user.email_confirmed_at) {
    throw new Error('Verified email session was not returned');
  }
  return data;
}
