import env from "#config/env/env.js";
import knex, { migrate, seed } from "#postgres/knex.js";
import { runPipelineOnce } from "#services/pipeline/run.js";

let isRunning = false;
const intervalMinutes = env.SYNC_INTERVAL_MINUTES ?? 60;

async function runCycle(): Promise<void> {
    if (isRunning) {
        console.log("Previous cycle is still running, skipping this tick");
        return;
    }

    isRunning = true;
    try {
        await runPipelineOnce();
    } catch (error) {
        console.error("Pipeline cycle failed", error);
    } finally {
        isRunning = false;
    }
}

await migrate.latest();
await seed.run();
console.log("All migrations and seeds have been run");

await runCycle();
setInterval(runCycle, intervalMinutes * 60_000);
console.log(`Scheduler started. Interval: ${intervalMinutes} min`);

async function shutdown(signal: string): Promise<void> {
    console.log(`Received ${signal}, shutting down...`);
    await knex.destroy();
    process.exit(0);
}

process.on("SIGINT", () => {
    void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});