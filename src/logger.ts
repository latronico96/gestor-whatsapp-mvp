
export type ConversationEvent = {
  timestamp: string;
  phone: string;
  direction: "in" | "out";
  type?: string;
  text: string;
};

// Almacenamiento temporal en memoria para el PoC.
const logs: ConversationEvent[] = [];

const MAX_LOGS = 1000;

export async function logEvent(
  event: Omit<ConversationEvent, "timestamp">
) {
  logs.push({
    ...event,
    timestamp: new Date().toISOString()
  });

  // Evitamos que el historial crezca indefinidamente.
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
}

export async function readLogs(): Promise<ConversationEvent[]> {
  return [...logs];
}
