const apiKey = localStorage.getItem("_tyr_deepl_key");
const targetLang = localStorage.getItem("_tyr_lang");
const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

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
    const translatedText = translation["text"];
    return translation;
}

// adds a translate button for reviews 
function injectStandardTranslateButton(review: HTMLDivElement) {
    const reviewHeader = review.querySelector<HTMLDivElement>(".review_header");
    const reviewBody = review.querySelector<HTMLDivElement>(".review_body");
    if (!reviewBody) {
        console.warn("Failed to retrieve reviewBody");
        return;
    }

    const renderedText = reviewBody.querySelector<HTMLDivElement>(":scope > span > span.rendered_text");
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

    translateButton.addEventListener("mousedown", () => {
        if (!renderedText) {
            console.warn("renderedText wasn't found for this review");
            return;
        }

        // console.log(renderedText.innerHTML);

        translateReview(renderedText.innerHTML)
            .then((translation: { text: string, detected_source_language: string }) => {
                const originalReview = document.createElement("div");
                const sourceLanguage = languageNames.of(translation.detected_source_language.toLowerCase());
                originalReview.innerHTML = `Original review (Translated from ${sourceLanguage}):<br />${renderedText.innerHTML}`;
                originalReview.style.marginTop = "4px";
                originalReview.style.backgroundColor = "var(--btn-expand-background-default)";
                originalReview.style.padding = "2px";
                originalReview.style.margin = "2px";
                originalReview.style.borderRadius = "6px";
                originalReview.classList.add("small");
                reviewBody.insertBefore(originalReview, reviewBody.querySelector(".review_publish_status"));

                renderedText.innerHTML = translation.text;
                translateButton.remove();
            })
            .catch((err: string) => alert(`Failed to translate review! ${err}`))
    })
}

// adds a translate button for reviews on the front page or displayed via the [Reviewxxxxx] shortcut
function injectShortcutTranslateButton(review: HTMLDivElement) {

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