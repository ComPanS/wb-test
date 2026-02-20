import { Command } from "commander";
import knex, { migrate, seed } from "#postgres/knex.js";
import { fetchAndStoreTariffs, runPipelineOnce, syncTariffsToSheets } from "#services/pipeline/run.js";

const program = new Command();

program.name("service").description("WB tariffs service command line");

program
    .command("migrate")
    .description("Run latest migrations")
    .action(async () => {
        await migrate.latest();
        await knex.destroy();
    });

program
    .command("seed")
    .description("Run seeds")
    .action(async () => {
        await seed.run();
        await knex.destroy();
    });

program
    .command("fetch")
    .description("Fetch WB tariffs and save to DB")
    .option("-d, --date <date>", "tariff date in YYYY-MM-DD format")
    .action(async (options: { date?: string }) => {
        await fetchAndStoreTariffs({ date: options.date });
        await knex.destroy();
    });

program
    .command("sync")
    .description("Sync latest DB tariffs to Google Sheets")
    .action(async () => {
        await syncTariffsToSheets();
        await knex.destroy();
    });

program
    .command("run-once")
    .description("Fetch from WB and sync to Google Sheets")
    .option("-d, --date <date>", "tariff date in YYYY-MM-DD format")
    .action(async (options: { date?: string }) => {
        await runPipelineOnce({ date: options.date });
        await knex.destroy();
    });

program.parseAsync().catch(async (error) => {
    console.error(error);
    await knex.destroy();
    process.exit(1);
});
