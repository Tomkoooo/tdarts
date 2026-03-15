import {
  WIZARD_STEPS,
  type WizardStep,
  type WizardFormState,
  getNextStep,
  getPrevStep,
  canProceedFromStep,
} from "./schema";

export interface WizardMachineState {
  currentStep: WizardStep;
  formState: Partial<WizardFormState>;
}

export type WizardAction =
  | { type: "NEXT"; payload?: Partial<WizardFormState> }
  | { type: "PREV" }
  | { type: "GO_TO"; step: WizardStep }
  | { type: "UPDATE"; payload: Partial<WizardFormState> }
  | { type: "RESET"; payload?: Partial<WizardFormState> };

export function wizardReducer(
  state: WizardMachineState,
  action: WizardAction
): WizardMachineState {
  switch (action.type) {
    case "NEXT": {
      const merged = { ...state.formState, ...action.payload };
      if (!canProceedFromStep(state.currentStep, merged)) {
        return { ...state, formState: merged };
      }
      const next = getNextStep(state.currentStep);
      if (!next) return { ...state, formState: merged };
      return { currentStep: next, formState: merged };
    }
    case "PREV": {
      const prev = getPrevStep(state.currentStep);
      if (!prev) return state;
      return { ...state, currentStep: prev };
    }
    case "GO_TO": {
      const targetIdx = WIZARD_STEPS.indexOf(action.step);
      const currentIdx = WIZARD_STEPS.indexOf(state.currentStep);
      if (targetIdx < 0 || targetIdx > currentIdx) return state;
      return { ...state, currentStep: action.step };
    }
    case "UPDATE":
      return {
        ...state,
        formState: { ...state.formState, ...action.payload },
      };
    case "RESET":
      return {
        currentStep: WIZARD_STEPS[0],
        formState: action.payload ?? {},
      };
    default:
      return state;
  }
}

export function createInitialWizardState(
  overrides?: Partial<WizardFormState>
): WizardMachineState {
  return {
    currentStep: WIZARD_STEPS[0],
    formState: overrides ?? {},
  };
}
