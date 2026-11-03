export type Option = {
  id: string;
  title: string;
  description?: string;
};

export type Step =
  | {
      id: string;
      type: "text";
      question: string;
      saveAs: string;
      next?: string;
    }
  | {
      id: string;
      type: "buttons";
      question: string;
      saveAs: string;
      options: Option[];
      next?: string;
    };

export type Procedure = {
  id: string;
  title: string;
  description?: string;
  steps: Step[];
};

export type FlowConfig = {
  welcome: string;
  menuQuestion: string;
  procedures: Procedure[];
  finalMessage: string;
};

export type ConversationState = {
  phone: string;
  status: "MENU" | "QUESTIONS" | "CONFIRM" | "DONE";
  procedureId?: string;
  stepIndex: number;
  answers: Record<string, string>;
  updatedAt: number;
};
