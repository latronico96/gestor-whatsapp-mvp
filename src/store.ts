
import type { ConversationState } from "./types";

const conversations = new Map<string, ConversationState>();

const MAX_AGE = 24 * 60 * 60 * 1000;

export const store = {
  get(phone: string) {
    const state = conversations.get(phone);

    if (!state) return undefined;

    if (Date.now() - state.updatedAt > MAX_AGE) {
      conversations.delete(phone);
      return undefined;
    }

    return state;
  },

  save(state: ConversationState) {
    conversations.set(state.phone, state);
  },

  delete(phone: string) {
    conversations.delete(phone);
  }
};
