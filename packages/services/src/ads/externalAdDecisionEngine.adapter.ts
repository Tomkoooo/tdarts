import type { AdDecisionEnginePort, AdDecisionRequest, AdDecisionResult } from './adDecisionEngine.port';

/**
 * Placeholder adapter for future third-party ad decision infrastructure.
 * Keep this contract-compatible with InternalAdDecisionEngineService.
 */
export class ExternalAdDecisionEngineAdapter implements AdDecisionEnginePort {
  async decide(_request: AdDecisionRequest): Promise<AdDecisionResult> {
    return {
      decisionId: crypto.randomUUID(),
      ad: null,
      reasonCode: 'engine_error',
      latencyMs: 0,
    };
  }
}
