let language: string = document.documentElement.lang
/*
==============
PATHS
==============
*/
const vowelPath: string = `/lang_engine/speech/langs/${language}/phonemes/vowels`
const consonantPath: string = `/lang_engine/speech/langs/${language}/phonemes/consonants`

/*
==============
UNIVERSAL FUNCTIONS
==============
*/

/*
==============
SOUND PRIMER
==============
*/
const soundTemplate: HTMLTemplateElement = 
    document.querySelector<HTMLTemplateElement>("#sound-template")!
const soundPrimer: HTMLUListElement = 
    document.querySelector<HTMLUListElement>("#sound-primer")!
async function populatePrimer(): void {
    
}