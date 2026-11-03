
import { mkdir, appendFile, readFile } from "node:fs/promises";
import path from "node:path";

const LOG_DIR = path.resolve(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "conversations.jsonl");

export type ConversationEvent = {
  timestamp: string;
  phone: string;
  direction: "in" | "out";
  type?: string;
  text: string;
};

export async function logEvent(
  event: Omit<ConversationEvent, "timestamp">
) {
  await mkdir(LOG_DIR, { recursive: true });

  const entry: ConversationEvent = {
    ...event,
    timestamp: new Date().toISOString()
  };

  await appendFile(LOG_FILE, JSON.stringify(entry) + "\n", "utf8");
}

export async function readLogs(): Promise<ConversationEvent[]> {
  try {
    const content = await readFile(LOG_FILE, "utf8");

    return content
      .split("\n")
      .filter(Boolean)
      .map(line => JSON.parse(line) as ConversationEvent);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
