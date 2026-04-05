import type { Page, TestInfo } from '@playwright/test';
import {
  appendDiagnosticInventory,
  writeDiagnosticReport,
  type DiagnosticReport,
} from './reporter';

type ConsoleEvent = { type: string; text: string; location?: string };
type PageErrorEvent = { message: string; stack?: string };
type RequestFailureEvent = { method: string; url: string; errorText: string };
type ResponseFailureEvent = { method: string; url: string; status: number };

type DiagnosticsOptions = {
  ignoreResponseUrlPatterns?: RegExp[];
};

export type DiagnosticsCollector = {
  context: string;
  console: ConsoleEvent[];
  pageErrors: PageErrorEvent[];
  requestFailures: RequestFailureEvent[];
  responseFailures: ResponseFailureEvent[];
  stop: () => Promise<{
    report: DiagnosticReport;
    jsonPath: string;
    markdownPath: string;
      inventoryPath: string;
  }>;
};

function shouldIgnoreResponse(url: string, ignorePatterns: RegExp[]): boolean {
  return ignorePatterns.some((pattern) => pattern.test(url));
}

export async function attachDiagnostics(
  page: Page,
  testInfo: TestInfo,
  context: string,
  options: DiagnosticsOptions = {}
): Promise<DiagnosticsCollector> {
  const consoleEvents: ConsoleEvent[] = [];
  const pageErrors: PageErrorEvent[] = [];
  const requestFailures: RequestFailureEvent[] = [];
  const responseFailures: ResponseFailureEvent[] = [];
  const ignorePatterns = options.ignoreResponseUrlPatterns ?? [];

  const onConsole = (msg: { type: () => string; text: () => string; location: () => { url?: string; lineNumber?: number } }) => {
    const type = msg.type();
    if (type !== 'error' && type !== 'warning' && type !== 'warn') return;
    const location = msg.location();
    const locationLabel = location?.url
      ? `${location.url}:${location.lineNumber ?? 0}`
      : undefined;
    consoleEvents.push({ type, text: msg.text(), location: locationLabel });
  };

  const onPageError = (error: Error) => {
    pageErrors.push({ message: error.message, stack: error.stack });
  };

  const onRequestFailed = (request: {
    method: () => string;
    url: () => string;
    failure: () => { errorText?: string } | null;
  }) => {
    requestFailures.push({
      method: request.method(),
      url: request.url(),
      errorText: request.failure()?.errorText ?? 'Unknown request failure',
    });
  };

  const onResponse = (response: { status: () => number; url: () => string; request: () => { method: () => string } }) => {
    const status = response.status();
    if (status < 400) return;
    const url = response.url();
    if (shouldIgnoreResponse(url, ignorePatterns)) return;
    responseFailures.push({
      method: response.request().method(),
      url,
      status,
    });
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);
  page.on('response', onResponse);

  return {
    context,
    console: consoleEvents,
    pageErrors,
    requestFailures,
    responseFailures,
    async stop() {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
      page.off('requestfailed', onRequestFailed);
      page.off('response', onResponse);

      const report: DiagnosticReport = {
        context,
        timestamp: new Date().toISOString(),
        url: page.url(),
        console: consoleEvents,
        pageErrors,
        requestFailures,
        responseFailures,
      };

      const { jsonPath, markdownPath } = await writeDiagnosticReport(
        testInfo,
        report
      );
      const inventoryPath = await appendDiagnosticInventory(report);
      await testInfo.attach(`${context}-diagnostics-json`, {
        path: jsonPath,
        contentType: 'application/json',
      });
      await testInfo.attach(`${context}-diagnostics-md`, {
        path: markdownPath,
        contentType: 'text/markdown',
      });
      await testInfo.attach(`${context}-diagnostics-inventory`, {
        path: inventoryPath,
        contentType: 'application/json',
      });

      return { report, jsonPath, markdownPath, inventoryPath };
    },
  };
}
