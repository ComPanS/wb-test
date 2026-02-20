import env from "#config/env/env.js";
import { getSpreadsheetIds } from "#services/spreadsheets/repository.js";
import { getLatestTariffRows } from "#services/wb/repository.js";
import { google } from "googleapis";

type CellValue = string | number;
const RU_HEADER_MAP: Record<string, string> = {
    tariff_date: "Дата тарифа",
    warehouse_name: "Склад",
    coefficient: "Коэффициент",
    warehouseName: "Склад",
    geoName: "Федеральный округ",
    boxDeliveryBase: "Доставка (база)",
    boxDeliveryCoefExpr: "Коэффициент доставки",
    boxDeliveryLiter: "Доставка за литр",
    boxDeliveryMarketplaceBase: "Маркетплейс доставка (база)",
    boxDeliveryMarketplaceCoefExpr: "Коэффициент доставки маркетплейс",
    boxDeliveryMarketplaceLiter: "Маркетплейс доставка за литр",
    boxStorageBase: "Хранение (база)",
    boxStorageCoefExpr: "Коэффициент хранения",
    boxStorageLiter: "Хранение за литр",
};

function stringifyCell(value: unknown): CellValue {
    if (value === null || value === undefined) {
        return "";
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "boolean") {
        return value ? "true" : "false";
    }
    return JSON.stringify(value);
}

function toRuHeader(field: string): string {
    return RU_HEADER_MAP[field] ?? field;
}

function buildRows(): Promise<CellValue[][]> {
    return getLatestTariffRows().then((tariffRows) => {
        if (tariffRows.length === 0) {
            return [["tariff_date", "warehouse_name", "coefficient"]];
        }

        const payloadKeys = new Set<string>();
        for (const row of tariffRows) {
            for (const key of Object.keys(row.payload)) {
                payloadKeys.add(key);
            }
        }

        const orderedPayloadKeys = Array.from(payloadKeys).sort((left, right) => left.localeCompare(right));
        const header = ["tariff_date", "warehouse_name", "coefficient", ...orderedPayloadKeys].map((field) => toRuHeader(field));
        const values: CellValue[][] = [header];

        for (const row of tariffRows) {
            const payloadCells = orderedPayloadKeys.map((key) => stringifyCell(row.payload[key]));
            values.push([row.tariffDate, row.warehouseName, row.coefficient ?? "", ...payloadCells]);
        }

        return values;
    });
}

function quoteSheetName(sheetName: string): string {
    return `'${sheetName.replace(/'/g, "''")}'`;
}

async function ensureSheetExists(params: {
    sheets: ReturnType<typeof google.sheets>;
    spreadsheetId: string;
    sheetName: string;
}): Promise<void> {
    const spreadsheet = await params.sheets.spreadsheets.get({
        spreadsheetId: params.spreadsheetId,
        fields: "sheets.properties.title",
    });

    const existingTitles =
        spreadsheet.data.sheets
            ?.map((sheet) => sheet.properties?.title)
            .filter((title): title is string => Boolean(title)) ?? [];

    if (existingTitles.includes(params.sheetName)) {
        return;
    }

    await params.sheets.spreadsheets.batchUpdate({
        spreadsheetId: params.spreadsheetId,
        requestBody: {
            requests: [
                {
                    addSheet: {
                        properties: {
                            title: params.sheetName,
                        },
                    },
                },
            ],
        },
    });
}

export async function syncLatestTariffsToGoogleSheets(): Promise<void> {
    const spreadsheetIds = await getSpreadsheetIds();
    if (spreadsheetIds.length === 0) {
        console.log("No spreadsheet IDs provided in DB/env, skipping Google Sheets sync");
        return;
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: env.GOOGLE_CREDENTIALS_PATH ?? "./credentials.json",
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });
    const values = await buildRows();
    const sheetName = env.GOOGLE_SHEET_NAME ?? "stocks_coefs";
    const rangePrefix = quoteSheetName(sheetName);

    for (const spreadsheetId of spreadsheetIds) {
        await ensureSheetExists({
            sheets,
            spreadsheetId,
            sheetName,
        });

        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: `${rangePrefix}!A:ZZ`,
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${rangePrefix}!A1`,
            valueInputOption: "RAW",
            requestBody: {
                values,
            },
        });

        console.log(`Synced Google Sheet ${spreadsheetId}`);
    }
}
