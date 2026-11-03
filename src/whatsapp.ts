
import { logEvent } from "./logger";

const GRAPH_VERSION = "v22.0";

type Button = { id: string; title: string };

function config() {
  return {
    token: process.env.WHATSAPP_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID
  };
}

async function registerOutgoing(
  phone: string,
  type: string,
  text: string
) {
  try {
    await logEvent({
      phone,
      direction: "out",
      type,
      text
    });
  } catch (error) {
    console.error("Error registrando mensaje saliente:", error);
  }
}

async function send(payload: any) {
  const { token, phoneNumberId } = config();

  const loggedText =
    payload.type === "text"
      ? payload.text?.body ?? ""
      : payload.interactive?.body?.text ?? "";

  if (!token || !phoneNumberId) {
    console.log("[WhatsApp simulado]");
    console.dir(payload, { depth: null });

    await registerOutgoing(payload.to, payload.type, loggedText);
    return;
  }

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(`WhatsApp API ${response.status}: ${responseBody}`);
  }

  await registerOutgoing(payload.to, payload.type, loggedText);
}

export async function sendText(to: string, body: string) {
  await send({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body }
  });
}

export async function sendButtons(
  to: string,
  body: string,
  buttons: Button[]
) {
  if (buttons.length < 1 || buttons.length > 3) {
    throw new Error("WhatsApp permite entre 1 y 3 botones de respuesta por mensaje.");
  }

  await send({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body },
      action: {
        buttons: buttons.map((button) => ({
          type: "reply",
          reply: { id: button.id, title: button.title.slice(0, 20) }
        }))
      }
    }
  });
}

export async function sendList(
  to: string,
  body: string,
  buttonText: string,
  rows: { id: string; title: string; description?: string }[]
) {
  if (rows.length < 1 || rows.length > 10) {
    throw new Error("La lista debe tener entre 1 y 10 opciones.");
  }

  await send({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: body },
      action: {
        button: buttonText.slice(0, 20),
        sections: [{
          title: "Opciones",
          rows: rows.map((row) => ({
            id: row.id,
            title: row.title.slice(0, 24),
            ...(row.description ? { description: row.description.slice(0, 72) } : {})
          }))
        }]
      }
    }
  });
}
