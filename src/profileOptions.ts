// specifically for https://rateyourmusic.com/account/account_edit to detect site language modification 
// see options.ts for actual preferences page configuration

const languageSelection = document.querySelector<HTMLSelectElement>("select[name=\"language\"]");
if (languageSelection) {
    languageSelection.addEventListener("change", () => {
        localStorage.setItem("_tyr_lang", languageSelection.value.toUpperCase());
    })
}