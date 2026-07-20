import { franc } from "franc";
import striptags from "striptags";
import type { DeepLTranslation } from "./background";

const CACHED_TRANSLATIONS_KEY = "cached_translations";

const apiKey = localStorage.getItem("_tyr_deepl_key");
const targetLang = localStorage.getItem("_tyr_lang") || navigator.language.slice(3).toLowerCase();
const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

async function markTranslationCached(reviewId: string) {
    const result = await browser.storage.local.get(CACHED_TRANSLATIONS_KEY);
    const array = result[CACHED_TRANSLATIONS_KEY] || [];
    await browser.storage.local.set({
        [CACHED_TRANSLATIONS_KEY]: Array.from(new Set([...array, reviewId])),
    });
    console.log(`marked ${reviewId} as cached`);
}

async function isCached(reviewId: string): Promise<boolean> {
    const result = await browser.storage.local.get(CACHED_TRANSLATIONS_KEY);
    const array = result[CACHED_TRANSLATIONS_KEY] || [];
    return array.includes(reviewId);
}

async function translateReview(reviewBodyHTML: string) {
    const res = await browser.runtime.sendMessage({
        action: "translate",
        text: reviewBodyHTML,
        targetLang,
        apiKey,
    });

    if (res.error) throw new Error(res.error);

    const translation = res["translations"][0];
    return translation;
}

function escapeXML(unsafeXml: string) {
    return unsafeXml.replace(/[<>&"']/g, (c) => {
        switch (c) {
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case "&":
                return "&amp;";
            case '"':
                return "&quot;";
            case "'":
                return "&apos;";
            default:
                return c;
        }
    });
}

function unescapeXML(safeXml: string) {
    const doc = new DOMParser().parseFromString(safeXml, "text/html");
    return doc.documentElement.textContent || "";
}

// adds a translate button for reviews
async function injectStandardTranslateButton(review: HTMLDivElement) {
    const reviewHeader = review.querySelector<HTMLDivElement>(".review_header");
    const reviewBody = review.querySelector<HTMLDivElement>(".review_body");
    const publishStatus = review.querySelector<HTMLDivElement>(".review_publish_status");
    if (!reviewBody) {
        console.warn("Failed to retrieve reviewBody");
        return;
    }

    const reviewTitle = reviewBody.querySelector<HTMLDivElement>(":scope > div.review_title");

    const renderedText = reviewBody.querySelector<HTMLDivElement>(":scope > span > span.rendered_text");
    if (!renderedText) {
        console.warn("renderedText wasn't found for this review");
        return;
    }

    const reviewContent = `<title>${escapeXML(reviewTitle?.innerHTML || "")}</title><body>${escapeXML(renderedText?.innerHTML || "")}</body>`;
    const language = franc(striptags(reviewContent));
    const reviewId = publishStatus?.querySelector("input")?.value as string;
    if (language.slice(0, 2) === targetLang?.toLowerCase()) return;

    const translateButton = document.createElement("span");
    translateButton.style.float = "right";
    translateButton.style.marginRight = "4px";
    translateButton.id = "tyr_translate";
    translateButton.title = "Translate this review";
    translateButton.classList.add("review_vote_down"); // <-- mimics the hover style of rate buttons

    const icon = document.createElement("i");
    icon.classList.add("fa", "fa-globe");
    translateButton.appendChild(icon);
    reviewHeader?.appendChild(translateButton);

    function displayReviewTranslation(translation: DeepLTranslation) {
        if (!renderedText) {
            console.warn("renderedText could not be retrieved");
            return;
        }

        const titleMatch = translation.text.match(/<title>(.*?)<\/title>/s);
        const bodyMatch = translation.text.match(/<body>(.*?)<\/body>/s);
        let translatedTitle = titleMatch ? titleMatch[1].trim() : "";
        let translatedBody = bodyMatch ? bodyMatch[1].trim() : translation.text;

        if (reviewTitle && translatedTitle) {
            reviewTitle.innerHTML = unescapeXML(translatedTitle);
        }

        renderedText.innerHTML = unescapeXML(translatedBody);

        const originalReview = document.createElement("div");
        const sourceLanguage = languageNames.of(translation.detected_source_language.toLowerCase());
        originalReview.innerHTML = `Original review (Translated from ${sourceLanguage}):<br />${unescapeXML(reviewContent)}`;
        originalReview.style.marginTop = "4px";
        originalReview.style.backgroundColor = "var(--btn-expand-background-default)";
        originalReview.style.padding = "2px";
        originalReview.style.margin = "2px";
        originalReview.style.borderRadius = "6px";
        originalReview.classList.add("small");
        reviewBody?.insertBefore(originalReview, publishStatus);
        translateButton.remove();
    }

    let waiting: boolean = false;
    function onTranslate() {
        if (waiting) return;

        waiting = true;
        translateButton.style.cursor = "not-allowed";
        translateButton.title = "Translating...";
        translateReview(reviewContent)
            .then((translation: DeepLTranslation) => {
                displayReviewTranslation(translation);
                markTranslationCached(reviewId);
            })
            .catch((err) => alert(`Failed to translate review!:\n\n${(err as Error).message}`))
            .finally(() => {
                waiting = false;
                translateButton.style.cursor = "pointer";
                translateButton.title = "";
            });
    }

    if (await isCached(reviewId)) onTranslate();
    translateButton.addEventListener("click", onTranslate);
}

// adds a translate button for reviews on the front page or displayed via the [Reviewxxxxx] shortcut
function injectShortcutTranslateButton(review: HTMLDivElement) {
    // todo: add functionality
}

const reviewElements = document.querySelectorAll<HTMLDivElement>(".review, .page_feature_review");
if (reviewElements.length > 0) {
    reviewElements.forEach((review, index: number) => {
        if (review.classList.contains("review") && index === 0) return;
        const injectionMethod = review.classList.contains("review") ? injectStandardTranslateButton : injectShortcutTranslateButton;
        injectionMethod(review);
    });
}
