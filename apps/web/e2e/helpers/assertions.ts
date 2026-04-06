import { expect } from '@playwright/test';
import type { DiagnosticReport } from './reporter';

type AssertionOptions = {
  allowConsolePatterns?: RegExp[];
  allowResponsePatterns?: RegExp[];
  allowRequestFailurePatterns?: RegExp[];
};

const knownCriticalPatterns = [
  /Only plain objects can be passed to Client Components/i,
  /Cannot serialize/i,
];

const knownNonCriticalConsolePatterns = [
  /A tree hydrated but some attributes of the server rendered HTML didn't match the client properties/i,
];

function formatItems(items: string[]): string {
  if (items.length === 0) return 'none';
  return items.map((item) => `- ${item}`).join('\n');
}

export function assertNoCriticalDiagnostics(
  report: DiagnosticReport,
  options: AssertionOptions = {}
): void {
  const allowConsolePatterns = options.allowConsolePatterns ?? [];
  const allowResponsePatterns = options.allowResponsePatterns ?? [];
  const allowRequestFailurePatterns = options.allowRequestFailurePatterns ?? [
    /ERR_ABORTED/i,
  ];

  const blockedConsole = report.console.filter((event) => {
    if (allowConsolePatterns.some((pattern) => pattern.test(event.text))) {
      return false;
    }
    if (knownNonCriticalConsolePatterns.some((pattern) => pattern.test(event.text))) {
      return false;
    }
    if (event.type === 'error') return true;
    return knownCriticalPatterns.some((pattern) => pattern.test(event.text));
  });

  const blockedResponses = report.responseFailures.filter((event) => {
    if (allowResponsePatterns.some((pattern) => pattern.test(event.url))) {
      return false;
    }
    return true;
  });

  const blockedRequestFailures = report.requestFailures.filter((event) => {
    const combined = `${event.url} ${event.errorText}`;
    return !allowRequestFailurePatterns.some((pattern) =>
      pattern.test(combined)
    );
  });

  const diagnosticsSummary = [
    `context: ${report.context}`,
    `url: ${report.url}`,
    `consoleEvents: ${blockedConsole.length}`,
    `pageErrors: ${report.pageErrors.length}`,
    `requestFailures: ${blockedRequestFailures.length}`,
    `responseFailures: ${blockedResponses.length}`,
    '',
    'blocked console:',
    formatItems(blockedConsole.map((item) => item.text)),
    '',
    'page errors:',
    formatItems(report.pageErrors.map((item) => item.message)),
    '',
    'request failures:',
    formatItems(
      blockedRequestFailures.map(
        (item) => `${item.method} ${item.url} - ${item.errorText}`
      )
    ),
    '',
    'response failures:',
    formatItems(
      blockedResponses.map((item) => `${item.status} ${item.method} ${item.url}`)
    ),
  ].join('\n');

  expect(
    blockedConsole.length,
    `Unexpected console diagnostics.\n${diagnosticsSummary}`
  ).toBe(0);
  expect(
    report.pageErrors.length,
    `Unexpected page errors.\n${diagnosticsSummary}`
  ).toBe(0);
  expect(
    blockedRequestFailures.length,
    `Unexpected request failures.\n${diagnosticsSummary}`
  ).toBe(0);
  expect(
    blockedResponses.length,
    `Unexpected response failures.\n${diagnosticsSummary}`
  ).toBe(0);
}
