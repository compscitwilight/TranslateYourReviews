import { franc } from "franc";
import striptags from "striptags";

export async function translateReview(content: string, targetLang: string = "EN") {
    const rawContent = striptags(content);
    const detectedLanguage = franc(rawContent);
    if (rawContent.length > 1000)
        throw new Error("The raw content of the review text provided exceeds the trial character limit");

    if (detectedLanguage.slice(0, 2) === targetLang.toLowerCase())
        return content;

    const response = await fetch("https://api-free.deepl.com/v2/translate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `DeepL-Auth-Key ${process.env.DEEPL_KEY}`
        },
        body: JSON.stringify({
            text: [content],
            target_lang: targetLang,
            tag_handling: "xml"
        })
    });

    return response;
}