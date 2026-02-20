import env from "#config/env/env.js";
import knex from "#postgres/knex.js";

function extractSpreadsheetId(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    const matched = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (matched?.[1]) {
        return matched[1];
    }

    return trimmed;
}

function parseEnvSpreadsheetIds(): string[] {
    const raw = env.GOOGLE_SPREADSHEET_IDS;
    if (!raw) {
        return [];
    }

    return raw
        .split(",")
        .map((item) => extractSpreadsheetId(item))
        .filter((item): item is string => Boolean(item));
}

export async function getSpreadsheetIds(): Promise<string[]> {
    const dbRows = await knex("spreadsheets").select("spreadsheet_id");
    const dbIds = dbRows.map((row) => extractSpreadsheetId(row.spreadsheet_id)).filter((item): item is string => Boolean(item));
    const envIds = parseEnvSpreadsheetIds();

    return Array.from(new Set([...dbIds, ...envIds]));
}
