import env from "#config/env/env.js";
import { z } from "zod";

const wbResponseSchema = z.object({
    response: z.object({
        data: z.unknown(),
    }),
});

const wbErrorSchema = z.object({
    title: z.string().optional(),
    detail: z.string().optional(),
    status: z.number().optional(),
    statusText: z.string().optional(),
    code: z.string().optional(),
    requestId: z.string().optional(),
    origin: z.string().optional(),
    timestamp: z.string().optional(),
});

export type WbTariffsResponse = z.infer<typeof wbResponseSchema>;

function getBaseUrl(): string {
    return env.WB_API_BASE_URL ?? "https://common-api.wildberries.ru";
}

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function parseJsonSafely(value: string): unknown {
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function compactJson(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function describeToken(token: string): string {
    const segments = token.split(".");
    const segmentCount = segments.length;
    const length = token.length;
    return `length=${length}, jwtSegments=${segmentCount}`;
}

export async function fetchBoxTariffs(params: { date: string }): Promise<WbTariffsResponse> {
    const retries = env.WB_REQUEST_RETRIES ?? 3;
    const timeoutMs = env.WB_REQUEST_TIMEOUT_MS ?? 15_000;
    const url = new URL("/api/v1/tariffs/box", getBaseUrl());
    url.searchParams.set("date", params.date);

    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeoutMs);

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: env.WB_API_TOKEN,
                },
                signal: controller.signal,
            });

            const bodyText = await response.text();
            const body = parseJsonSafely(bodyText);

            if (!response.ok) {
                const wbError = wbErrorSchema.safeParse(body);
                const detailMessage = wbError.success
                    ? wbError.data.detail ?? wbError.data.title ?? "WB API error"
                    : `WB API error with status ${response.status}`;
                const diagnostics = {
                    httpStatus: response.status,
                    statusText: response.statusText,
                    wbStatus: wbError.success ? wbError.data.status : undefined,
                    title: wbError.success ? wbError.data.title : undefined,
                    detail: wbError.success ? wbError.data.detail : undefined,
                    code: wbError.success ? wbError.data.code : undefined,
                    requestId: wbError.success ? wbError.data.requestId : undefined,
                    origin: wbError.success ? wbError.data.origin : undefined,
                    timestamp: wbError.success ? wbError.data.timestamp : undefined,
                    responseBody: compactJson(body),
                    request: {
                        url: url.toString(),
                        date: params.date,
                        token: describeToken(env.WB_API_TOKEN),
                    },
                    attempt: `${attempt + 1}/${retries + 1}`,
                };

                console.error("WB API request failed", diagnostics);

                if ((response.status === 429 || response.status >= 500) && attempt < retries) {
                    await wait(500 * Math.pow(2, attempt));
                    continue;
                }

                throw new Error(`${response.status}: ${detailMessage}`);
            }

            const parsed = wbResponseSchema.safeParse(body);
            if (!parsed.success) {
                throw new Error("WB API returned unexpected payload shape");
            }

            return parsed.data;
        } catch (error) {
            lastError = error;
            if (attempt < retries) {
                await wait(500 * Math.pow(2, attempt));
                continue;
            }
        } finally {
            clearTimeout(timeoutId);
        }
    }

    throw new Error(`Failed to fetch WB tariffs after retries: ${String(lastError)}`);
}
