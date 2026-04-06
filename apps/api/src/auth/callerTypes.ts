export type CallerKind = 'mobile_app' | 'integration';

export interface Caller {
  kind: CallerKind;
  clientId: string;
}
