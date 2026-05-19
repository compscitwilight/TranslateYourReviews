import { franc } from "franc";
import striptags from "striptags";
import { getTrialInfo } from "./redis.js";

export const TRIAL_CHARACTER_LIMIT: number = 5000;
const REVIEW_CHARACTER_LIMIT: number = 1000;

export async function translateReview(content: string, targetLang: string = "EN", key: string, isTrial?: boolean): Promise<[Response, number]> {
    const rawContent = striptags(content);
    const detectedLanguage = franc(rawContent);
    const tokens = rawContent.length;
    if (tokens > REVIEW_CHARACTER_LIMIT)
        throw new Error("The raw content of the review text provided exceeds the trial character limit");

    if (isTrial) {
        const info = await getTrialInfo(key);
        if (!info) throw new Error("Failed to retrieve trial key information");

        if (tokens + info.count > TRIAL_CHARACTER_LIMIT)
            throw new Error("You have exceeded the limit for your TranslateYourReviews trial. Please provide an API key at https://rateyourmusic.com/account/preferences");
    }

    if (detectedLanguage.slice(0, 2) === targetLang.toLowerCase())
        throw new Error("The target language provided matches the detected language of the review");

    const response = await fetch("https://api-free.deepl.com/v2/translate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `DeepL-Auth-Key ${key}`
        },
        body: JSON.stringify({
            text: [content],
            target_lang: targetLang,
            tag_handling: "xml"
        })
    });

    return [response, tokens];
}