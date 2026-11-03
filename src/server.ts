
import "dotenv/config";
import express from "express";
import path from "node:path";
import { handleIncoming } from "./engine";
import { logEvent, readLogs } from "./logger";

const app = express();
app.use(express.json());

// PANEL PRINCIPAL
app.get("/", (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), "public", "index.html"));
});

// HISTORIAL DE CONVERSACIONES
app.get("/api/logs", async (_req, res) => {
  try {
    const logs = await readLogs();
    res.json(logs.reverse());
  } catch (error) {
    console.error("Error leyendo logs:", error);
    res.status(500).json({ error: "No se pudo leer el historial" });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// SIMULADOR LOCAL
if (process.env.NODE_ENV !== "production") {
  app.post("/dev/message", async (req, res) => {
    const {
      phone = "5492210000000",
      text,
      replyId
    } = req.body ?? {};

    if (!text && !replyId) {
      res.status(400).json({ error: "Enviá text o replyId" });
      return;
    }

    try {
      await logEvent({
        phone: String(phone),
        direction: "in",
        type: replyId ? "interactive" : "text",
        text: String(text ?? replyId)
      });

      await handleIncoming(
        String(phone),
        String(text ?? replyId),
        replyId ? String(replyId) : undefined
      );

      res.json({
        ok: true,
        phone,
        message: "Mensaje procesado"
      });
    } catch (error) {
      console.error("Error en simulador:", error);

      res.status(500).json({
        error: "No se pudo procesar el mensaje",
        detail: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

// VERIFICACIÓN DEL WEBHOOK DE META
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    res.status(200).send(challenge);
    return;
  }

  res.sendStatus(403);
});

// RECEPCIÓN DE MENSAJES REALES
app.post("/webhook", async (req, res) => {
  // Respondemos rápido a Meta.
  res.sendStatus(200);

  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const messages = value?.messages ?? [];

    for (const message of messages) {
      const phone = message.from as string | undefined;

      const text = message.text?.body as string | undefined;
      const interactive = message.interactive;

      const buttonReply = interactive?.button_reply;
      const listReply = interactive?.list_reply;

      const replyId = buttonReply?.id ?? listReply?.id;
      const replyTitle = buttonReply?.title ?? listReply?.title;

      const body = text ?? replyTitle ?? "";

      if (!phone || !body) continue;

      await logEvent({
        phone,
        direction: "in",
        type: message.type ?? "text",
        text: body
      });

      await handleIncoming(phone, body, replyId);
    }
  } catch (error) {
    console.error("Error procesando webhook:", error);
  }
});

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Gestor WhatsApp MVP escuchando en http://localhost:${port}`);
});
