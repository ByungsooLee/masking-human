import OpenAI from "openai";
import { safeErrorMessage } from "@/lib/logging/safe-log";

export type MonthlyCostsResult = {
  monthlyUsd: number | null;
  available: boolean;
  detail?: string;
};

function monthStartUnix(): number {
  const now = new Date();
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000);
}

function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

export async function fetchMonthlyCostsUsd(): Promise<MonthlyCostsResult> {
  const adminKey = process.env.OPENAI_ADMIN_KEY?.trim();
  if (!adminKey) {
    return { monthlyUsd: null, available: false };
  }

  try {
    const client = new OpenAI({ apiKey: adminKey, adminAPIKey: adminKey });
    let total = 0;
    let page: string | undefined;

    do {
      const res = await client.admin.organization.usage.costs({
        start_time: monthStartUnix(),
        end_time: nowUnix(),
        bucket_width: "1d",
        limit: 31,
        page,
      });

      for (const bucket of res.data) {
        for (const row of bucket.results) {
          if (row.object === "organization.costs.result") {
            const amount = row.amount?.value;
            if (typeof amount === "number") total += amount;
          }
        }
      }

      page = res.has_more ? (res.next_page ?? undefined) : undefined;
    } while (page);

    return { monthlyUsd: total, available: true };
  } catch (err) {
    return {
      monthlyUsd: null,
      available: false,
      detail: safeErrorMessage(err),
    };
  }
}
