import cron from "node-cron";
import { runFullScan } from "./scan";

const expr = process.env.WORKER_SCAN_CRON || "*/15 * * * *";
console.log("Worker cron:", expr);

cron.schedule(expr, async () => {
  console.log("Scan tick:", new Date().toISOString());
  try {
    await runFullScan();
  } catch (e) {
    console.error("Scan failed:", e);
  }
});
