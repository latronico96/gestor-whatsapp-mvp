import type { ConversationState } from "./types";

// MVP: almacenamiento en memoria. Se pierde al reiniciar el proceso.
// En la siguiente etapa se reemplaza por PostgreSQL sin cambiar el motor.
const conversations = new Map<string, ConversationState>();

export const store = {
  get(phone: string) {
    return conversations.get(phone);
  },
  save(state: ConversationState) {
    conversations.set(state.phone, state);
  },
  delete(phone: string) {
    conversations.delete(phone);
  }
};
