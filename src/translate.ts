import { franc } from "franc";
import type { DeepLTranslation, CachedTranslation } from "./background";

const apiKey = localStorage.getItem("_tyr_deepl_key");
const targetLang = localStorage.getItem("_tyr_lang");
const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

async function cacheTranslation(reviewId: string, translation: DeepLTranslation) {
    const entry = {
        t: translation.text,
        lang: translation.detected_source_language,
        ts: Date.now()
    } as CachedTranslation;

    browser.storage.local.set({
        [`${reviewId}_${targetLang}`]: entry
    });

    console.log(`cached translation for ${reviewId}`);
}

async function getCachedTranslation(reviewId: string): Promise<CachedTranslation | null> {
    const key = `${reviewId}_${targetLang}`;
    const data = await browser.storage.local.get(key);
    if (!data[key]) return null;
    return data[key];
}

async function translateReview(reviewBodyHTML: string) {
    const res = await browser.runtime.sendMessage({
        action: "translate",
        text: reviewBodyHTML,
        targetLang,
        apiKey
    });
    console.log(res);

    if (res.error) throw new Error(res.error);

    const translation = res["translations"][0];
    return translation;
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

    const renderedText = reviewBody.querySelector<HTMLDivElement>(":scope > span > span.rendered_text");
    if (!renderedText) {
        console.warn("renderedText wasn't found for this review");
        return;
    }

    const language = franc(renderedText?.innerText);
    const reviewId = publishStatus?.querySelector("input")?.value as string;

    function displayReviewTranslation(translation: DeepLTranslation) {
        if (!renderedText) {
            console.warn("renderedText could not be retrieved");
            return;
        }

        const originalReview = document.createElement("div");
        const sourceLanguage = languageNames.of(translation.detected_source_language.toLowerCase());
        originalReview.innerHTML = `Original review (Translated from ${sourceLanguage}):<br />${renderedText.innerHTML}`;
        originalReview.style.marginTop = "4px";
        originalReview.style.backgroundColor = "var(--btn-expand-background-default)";
        originalReview.style.padding = "2px";
        originalReview.style.margin = "2px";
        originalReview.style.borderRadius = "6px";
        originalReview.classList.add("small");
        reviewBody?.insertBefore(originalReview, publishStatus);

        renderedText.innerHTML = translation.text;
        translateButton.remove();
    }

    const cachedTranslation = await getCachedTranslation(reviewId);
    if (cachedTranslation) {
        displayReviewTranslation({
            text: cachedTranslation.t,
            detected_source_language: cachedTranslation.lang
        });
    }

    if (language.slice(0, 2) === targetLang?.toLowerCase()) return;

    const translateButton = document.createElement("span");
    translateButton.style.float = "right";
    translateButton.style.marginRight = "4px";
    translateButton.id = "tyr_translate";
    translateButton.title = "Translate this review";
    translateButton.classList.add("review_vote_down"); // <-- mimics the hover style of rate buttons

    const icon = document.createElement("i");
    icon.classList.add("fa", "fa-globe");
    // icon.style.cssText = document.querySelector<HTMLLIElement>(".review_vote_up .fa-caret-up")?.style.cssText as string;
    translateButton.appendChild(icon);
    reviewHeader?.appendChild(translateButton);

    translateButton.addEventListener("click", () => {
        translateReview(renderedText?.innerHTML)
            .then((translation: DeepLTranslation) => {
                displayReviewTranslation(translation);
                cacheTranslation(reviewId, translation);
            })
            .catch((err: string) => alert(`Failed to translate review! ${err}`))
    })
}

// adds a translate button for reviews on the front page or displayed via the [Reviewxxxxx] shortcut
function injectShortcutTranslateButton(review: HTMLDivElement) {
    // todo: add functionality
}

if (apiKey && targetLang) {
    const reviewElements = document.querySelectorAll<HTMLDivElement>(".review, .page_feature_review");
    if (reviewElements.length > 0) {
        reviewElements.forEach((review, index: number) => {
            if (review.classList.contains("review") && index === 0) return;
            const injectionMethod = review.classList.contains("review") ? injectStandardTranslateButton : injectShortcutTranslateButton;
            injectionMethod(review);
        })
    }
} else {
    console.warn("TranslateYourReviews has not been configured properly. Please visit https://rateyourmusic.com/account/preferences");
}