import fs from "node:fs";

/**
 * Optional metrics collector when ENABLE_MONITORING=true.
 * Persists counters to a JSON file on an interval and on demand.
 */
export default class ServerMonitor {
  /** @param {string} metricsPath */
  constructor(metricsPath) {
    this.metricsPath = metricsPath;
    this.io = null;
    this.timer = null;
    this.metrics = {
      connections: 0,
      messagesReceived: 0,
      messagesSent: 0,
      disconnections: 0,
      startedAt: Date.now(),
    };
  }

  trackConnection() {
    this.metrics.connections += 1;
  }

  trackMessageReceived() {
    this.metrics.messagesReceived += 1;
  }

  trackMessageSent() {
    this.metrics.messagesSent += 1;
  }

  trackDisconnection() {
    this.metrics.disconnections += 1;
  }

  /** @param {boolean} [_force] */
  saveMetrics(_force) {
    const payload = {
      ...this.metrics,
      connectedSockets: this.io?.engine?.clientsCount ?? null,
      savedAt: Date.now(),
    };
    try {
      fs.writeFileSync(this.metricsPath, JSON.stringify(payload, null, 2), "utf8");
    } catch (err) {
      console.error("Failed to save metrics:", err);
    }
  }

  /** @param {number} intervalMs @param {import("socket.io").Server} io */
  start(intervalMs, io) {
    this.io = io;
    this.timer = setInterval(() => this.saveMetrics(true), intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.saveMetrics(true);
  }
}
