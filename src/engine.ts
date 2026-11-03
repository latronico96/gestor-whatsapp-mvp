import rawFlow from "./flows/procedures.json";
import type { FlowConfig, Procedure, Step, ConversationState } from "./types";
import { store } from "./store";
import { sendButtons, sendList, sendText } from "./whatsapp";

const flow = rawFlow as FlowConfig;
const now = () => Date.now();

function newState(phone: string): ConversationState {
  return {
    phone,
    status: "MENU",
    stepIndex: 0,
    answers: {},
    updatedAt: now()
  };
}

function getProcedure(id?: string): Procedure | undefined {
  return flow.procedures.find((procedure) => procedure.id === id);
}

async function showMenu(phone: string) {
  const options = flow.procedures.map((procedure) => ({
    id: `procedure:${procedure.id}`,
    title: procedure.title,
    description: procedure.description
  }));

  await sendText(phone, flow.welcome);

  if (options.length <= 3) {
    await sendButtons(
      phone,
      flow.menuQuestion,
      options.map((option) => ({ id: option.id, title: option.title }))
    );
  } else {
    await sendList(phone, flow.menuQuestion, "Ver trámites", options);
  }
}

async function showCurrentStep(state: ConversationState) {
  const procedure = getProcedure(state.procedureId);
  if (!procedure) {
    await sendText(state.phone, "No encontré ese trámite. Escribí *hola* para comenzar de nuevo.");
    store.delete(state.phone);
    return;
  }

  const step = procedure.steps[state.stepIndex];
  if (!step) {
    state.status = "CONFIRM";
    state.updatedAt = now();
    store.save(state);
    await showSummary(state, procedure);
    return;
  }

  if (step.type === "text") {
    await sendText(state.phone, step.question);
    return;
  }

  const options = step.options;
  if (options.length <= 3) {
    await sendButtons(
      state.phone,
      step.question,
      options.map((option) => ({ id: option.id, title: option.title }))
    );
  } else {
    await sendList(state.phone, step.question, "Elegir opción", options);
  }
}

async function showSummary(state: ConversationState, procedure: Procedure) {
  const lines = procedure.steps.map((step) => {
    const value = state.answers[step.id] ?? "Sin respuesta";
    return `• ${step.saveAs}: ${value}`;
  });

  const summary = [
    `📋 *Resumen de tu consulta*`,
    `Trámite: *${procedure.title}*`,
    "",
    ...lines,
    "",
    "¿Confirmás que los datos son correctos?"
  ].join("\n");

  await sendButtons(state.phone, summary, [
    { id: "summary:confirm", title: "Confirmar" },
    { id: "summary:restart", title: "Volver a empezar" }
  ]);
}

async function notifyManager(state: ConversationState, procedure: Procedure) {
  const managerPhone = process.env.GESTOR_PHONE;
  const lines = procedure.steps.map((step) =>
    `• ${step.saveAs}: ${state.answers[step.id] ?? "Sin respuesta"}`
  );

  const message = [
    "📥 *Nueva solicitud de trámite*",
    `Trámite: ${procedure.title}`,
    `WhatsApp del interesado: ${state.phone}`,
    "",
    ...lines
  ].join("\n");

  if (managerPhone) {
    await sendText(managerPhone, message);
  } else {
    console.log("[Nueva solicitud para el gestor]\n" + message);
  }
}

export async function handleIncoming(phone: string, message: string, replyId?: string) {
  const normalized = message.trim().toLowerCase();
  let state = store.get(phone);

  if (!state || ["hola", "buenas", "buenos dias", "buenas tardes", "menu", "inicio"].includes(normalized)) {
    state = newState(phone);
    store.save(state);
    await showMenu(phone);
    return;
  }

  if (state.status === "MENU") {
    const selectedId = replyId?.startsWith("procedure:")
      ? replyId.slice("procedure:".length)
      : undefined;
    const procedure = getProcedure(selectedId);
    if (!procedure) {
      await sendText(phone, "Por favor, elegí una de las opciones del menú.");
      await showMenu(phone);
      return;
    }

    state.procedureId = procedure.id;
    state.status = "QUESTIONS";
    state.stepIndex = 0;
    state.answers = {};
    state.updatedAt = now();
    store.save(state);
    await sendText(phone, `Perfecto. Vamos con *${procedure.title}*.`);
    await showCurrentStep(state);
    return;
  }

  if (state.status === "QUESTIONS") {
    const procedure = getProcedure(state.procedureId);
    const step = procedure?.steps[state.stepIndex];
    if (!procedure || !step) {
      store.delete(phone);
      await sendText(phone, "La sesión se reinició. Escribí *hola* para comenzar.");
      return;
    }

    let answer = message.trim();
    if (step.type === "buttons") {
      const option = step.options.find((item) => item.id === replyId);
      if (!option) {
        await sendText(phone, "Por favor, seleccioná una de las opciones disponibles.");
        await showCurrentStep(state);
        return;
      }
      answer = option.title;
    }

    if (!answer) {
      await sendText(phone, "No recibí una respuesta. ¿Podés intentarlo nuevamente?");
      await showCurrentStep(state);
      return;
    }

    state.answers[step.id] = answer;
    state.stepIndex += 1;
    state.updatedAt = now();
    store.save(state);
    await showCurrentStep(state);
    return;
  }

  if (state.status === "CONFIRM") {
    const procedure = getProcedure(state.procedureId);
    if (replyId === "summary:confirm" && procedure) {
      await notifyManager(state, procedure);
      state.status = "DONE";
      state.updatedAt = now();
      store.save(state);
      await sendText(phone, flow.finalMessage);
      return;
    }

    if (replyId === "summary:restart") {
      store.delete(phone);
      await handleIncoming(phone, "hola");
      return;
    }

    await sendText(phone, "Elegí *Confirmar* o *Volver a empezar*.");
    if (procedure) await showSummary(state, procedure);
    return;
  }

  if (state.status === "DONE") {
    await sendText(phone, "Tu consulta ya fue enviada al gestor. Si necesitás iniciar otra, escribí *hola*.");
  }
}
