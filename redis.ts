import { Redis } from "@upstash/redis";
import { franc } from "franc";
import * as crypto from "node:crypto";

interface TrialInfo {
    count: number; // translations count
    firstSeen: number; // unix ms
}

const client = new Redis({
    url: process.env.REDIS_URL,
    token: process.env.REDIS_TOKEN
});

const CACHED_REVIEW_EXPIRY: number = 60 * 60 * 24 * 30;

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
    console.log(`created trial with ID ${trialId}`);
    return trialId;
}

export async function billTrial(trialId: string, tokens: number) {
    return await client.incrby(`ext:${trialId}:count`, tokens);
}

export async function cacheReview(originalReview: string, translatedReview: string, targetLanguage: string) {
    const hash = crypto.createHash("md5").update(`${originalReview}\x00${targetLanguage}`).digest("hex");
    const sourceLanguage = franc(originalReview).slice(0, 2);
    await client.set<string>(`review:${hash}`, translatedReview, { ex: CACHED_REVIEW_EXPIRY });
    await client.set<string>(`review:${hash}:source_lang`, sourceLanguage, { ex: CACHED_REVIEW_EXPIRY });
    console.log(`cached review:${hash}`);
}

export async function getCachedReview(originalReview: string, targetLanguage: string) {
    const hash = crypto.createHash("md5").update(`${originalReview}\x00${targetLanguage}`).digest("hex");
    const translatedReview = await client.get<string>(`review:${hash}`);
    const sourceLanguage = await client.get<string>(`review:${hash}:source_lang`);
    return (translatedReview !== null && sourceLanguage !== null) ? {
        // mimics DeepL API response
        hash,
        text: translatedReview,
        detected_source_language: sourceLanguage
    } : null;
}