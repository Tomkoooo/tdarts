import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { TestInfo } from '@playwright/test';

export type DiagnosticReport = {
  context: string;
  timestamp: string;
  url: string;
  console: Array<{ type: string; text: string; location?: string }>;
  pageErrors: Array<{ message: string; stack?: string }>;
  requestFailures: Array<{ method: string; url: string; errorText: string }>;
  responseFailures: Array<{ method: string; url: string; status: number }>;
};

function toMarkdown(report: DiagnosticReport): string {
  const lines: string[] = [];
  lines.push(`# Diagnostic Report: ${report.context}`);
  lines.push('');
  lines.push(`- timestamp: ${report.timestamp}`);
  lines.push(`- url: ${report.url}`);
  lines.push(`- console events: ${report.console.length}`);
  lines.push(`- page errors: ${report.pageErrors.length}`);
  lines.push(`- request failures: ${report.requestFailures.length}`);
  lines.push(`- response failures: ${report.responseFailures.length}`);
  lines.push('');

  if (report.console.length > 0) {
    lines.push('## Console');
    for (const event of report.console) {
      lines.push(`- [${event.type}] ${event.text}`);
    }
    lines.push('');
  }

  if (report.pageErrors.length > 0) {
    lines.push('## Page Errors');
    for (const event of report.pageErrors) {
      lines.push(`- ${event.message}`);
    }
    lines.push('');
  }

  if (report.requestFailures.length > 0) {
    lines.push('## Request Failures');
    for (const event of report.requestFailures) {
      lines.push(`- ${event.method} ${event.url}: ${event.errorText}`);
    }
    lines.push('');
  }

  if (report.responseFailures.length > 0) {
    lines.push('## Response Failures');
    for (const event of report.responseFailures) {
      lines.push(`- ${event.status} ${event.method} ${event.url}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export async function writeDiagnosticReport(
  testInfo: TestInfo,
  report: DiagnosticReport
): Promise<{ jsonPath: string; markdownPath: string }> {
  const baseName = report.context.replace(/[^a-zA-Z0-9_-]/g, '_');
  const jsonPath = testInfo.outputPath(`${baseName}.diagnostics.json`);
  const markdownPath = testInfo.outputPath(`${baseName}.diagnostics.md`);

  await fs.mkdir(dirname(jsonPath), { recursive: true });
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  await fs.writeFile(markdownPath, toMarkdown(report), 'utf8');

  return { jsonPath, markdownPath };
}

type InventoryIssue = {
  context: string;
  url: string;
  category: 'console' | 'pageerror' | 'requestfailure' | 'responsefailure';
  message: string;
};

type InventoryDocument = {
  generatedAt: string;
  issuesByContext: Record<string, InventoryIssue[]>;
};

function toInventoryIssues(report: DiagnosticReport): InventoryIssue[] {
  const issues: InventoryIssue[] = [];
  for (const entry of report.console) {
    issues.push({
      context: report.context,
      url: report.url,
      category: 'console',
      message: `[${entry.type}] ${entry.text}`,
    });
  }
  for (const entry of report.pageErrors) {
    issues.push({
      context: report.context,
      url: report.url,
      category: 'pageerror',
      message: entry.message,
    });
  }
  for (const entry of report.requestFailures) {
    issues.push({
      context: report.context,
      url: report.url,
      category: 'requestfailure',
      message: `${entry.method} ${entry.url} - ${entry.errorText}`,
    });
  }
  for (const entry of report.responseFailures) {
    issues.push({
      context: report.context,
      url: report.url,
      category: 'responsefailure',
      message: `${entry.status} ${entry.method} ${entry.url}`,
    });
  }
  return issues;
}

export async function appendDiagnosticInventory(
  report: DiagnosticReport
): Promise<string> {
  const inventoryPath = resolve(
    process.cwd(),
    process.env.E2E_DIAGNOSTIC_REPORT_PATH ||
      'e2e/artifacts/diagnostic-inventory.json'
  );
  await fs.mkdir(dirname(inventoryPath), { recursive: true });

  let existing: InventoryDocument = {
    generatedAt: new Date().toISOString(),
    issuesByContext: {},
  };

  try {
    const raw = await fs.readFile(inventoryPath, 'utf8');
    existing = JSON.parse(raw) as InventoryDocument;
  } catch {
    // No existing report yet.
  }

  existing.generatedAt = new Date().toISOString();
  const issues = toInventoryIssues(report);
  existing.issuesByContext[report.context] = issues;

  await fs.writeFile(inventoryPath, JSON.stringify(existing, null, 2), 'utf8');
  return inventoryPath;
}
