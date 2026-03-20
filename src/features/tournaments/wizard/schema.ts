export const WIZARD_STEPS = [
  "details",
  "boards",
  "settings",
  "billing",
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];

export interface WizardBoardInput {
  boardNumber: number;
  name: string;
}

export interface WizardBillingInfo {
  type: string;
  name: string;
  country: string;
  city: string;
  zip: string;
  address: string;
  email: string;
}

export interface WizardFormState {
  name: string;
  description: string;
  location: string;
  startDate: Date;
  registrationDeadline: Date;
  entryFee: number;
  maxPlayers: number;
  format: string;
  startingScore: number;
  tournamentPassword: string;
  type: string;
  participationMode: string;
  boardCount: number;
  boards: WizardBoardInput[];
  isSandbox?: boolean;
  billingInfo?: WizardBillingInfo;
  saveBillingInfo?: boolean;
}

export const DEFAULT_WIZARD_STATE: WizardFormState = {
  name: "",
  description: "",
  location: "",
  startDate: new Date(),
  registrationDeadline: new Date(),
  entryFee: 0,
  maxPlayers: 16,
  format: "group_knockout",
  startingScore: 501,
  tournamentPassword: "",
  type: "amateur",
  participationMode: "individual",
  boardCount: 1,
  boards: [],
};

export function getNextStep(current: WizardStep): WizardStep | null {
  const idx = WIZARD_STEPS.indexOf(current);
  if (idx < 0 || idx >= WIZARD_STEPS.length - 1) return null;
  return WIZARD_STEPS[idx + 1];
}

export function getPrevStep(current: WizardStep): WizardStep | null {
  const idx = WIZARD_STEPS.indexOf(current);
  if (idx <= 0) return null;
  return WIZARD_STEPS[idx - 1];
}

export function canProceedFromStep(
  step: WizardStep,
  state: Partial<WizardFormState>
): boolean {
  switch (step) {
    case "details":
      return !!(state.name?.trim());
    case "boards":
      return (
        Array.isArray(state.boards) &&
        state.boards.length > 0 &&
        state.boards.every((b) => b.name?.trim())
      );
    case "settings":
      return true;
    case "billing":
      return true;
    default:
      return false;
  }
}
