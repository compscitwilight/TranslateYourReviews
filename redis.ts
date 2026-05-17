import { Redis } from "@upstash/redis";
import * as crypto from "node:crypto";

interface TrialInfo {
    count: number; // translations count
    firstSeen: number; // unix ms
}

const client = new Redis({
    url: process.env.REDIS_URL,
    token: process.env.REDIS_TOKEN
});

export async function getTrialInfo(trialId: string): Promise<TrialInfo | null> {
    const count = await client.get<number>(`ext:${trialId}:count`);
    const firstSeen = await client.get<number>(`ext:${trialId}:firstSeen`);
    return (count !== null && firstSeen !== null) ? {
        count, firstSeen
    } : null;
}

export async function registerTrial(): Promise<string> {
    const trialId = crypto.randomBytes(16).toString("hex");
    await client.set<number>(`ext:${trialId}:count`, 0);
    await client.set<number>(`ext:${trialId}:firstSeen`, Date.now());
    return trialId;
}

export async function incrementTrialTranslations(trialId: string) {
    return await client.incr(`ext:${trialId}:count`);
}

export async function cacheReview(reviewText: string) {
    const hash = crypto.createHash("md5").update(reviewText).digest().toString();

}