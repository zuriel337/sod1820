// A reaction is saved only after the existing RPC confirms its canonical map.
const EMOJIS = ["👍", "💡", "🔥", "🙏", "✨"];
const objectMap = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export const isReactionMap = (value) => objectMap(value) && EMOJIS.every((emoji) => !Object.hasOwn(value, emoji) || (Array.isArray(value[emoji]) && value[emoji].every((key) => typeof key === "string")));
export const isReactionBoostMap = (value) => objectMap(value) && EMOJIS.every((emoji) => !Object.hasOwn(value, emoji) || (Number.isFinite(value[emoji]) && value[emoji] >= 0));

export async function commitReactionMutation({ previous, optimistic, request, apply, isValid = isReactionMap }) {
  apply(optimistic);
  try {
    const response = await request();
    if (response?.error != null || response?.data == null || !isValid(response.data)) {
      throw new Error("reaction_not_saved");
    }
    apply(response.data);
    return true;
  } catch {
    apply(previous);
    return false;
  }
}
