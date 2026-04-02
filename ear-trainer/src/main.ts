let language: string = document.documentElement.lang
/*
==============
PATHS
==============
*/
const vowelPath: string = `/engine/speech/${language}/phonemes/vowels`
const consonantPath: string = `/engine/speech/${language}/phonemes/consonants`
const phonemeJsonPath: string = `/engine/speech/${language}/phonemes/`

/*
==============
UNIVERSAL FUNCTIONS
==============
*/
async function getPromise<T>(path:string, file:string): Promise<T> {
    const response: Response = await fetch(`${path}${file}`)

    if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`)
    }

    return await response.json() as T
}

/*
==============
SOUND PRIMER
==============
*/
const soundTemplate: HTMLTemplateElement = 
    document.querySelector<HTMLTemplateElement>("#sound-template")!
const soundPrimer: HTMLUListElement = 
    document.querySelector<HTMLUListElement>("#sound-primer")!

type PhonemeEntry = {
    ipa: string,
    transcription: {
        pinyin: string,
        zhuyin: string
    },
    audio: {
        default: string
    }
} 
type PhonemeFile = {
    vowels: Record<string, PhonemeEntry>,
    consonants: Record<string, PhonemeEntry>
}   

async function populatePrimer(): Promise<void> {
    const phonemeFile: PhonemeFile = 
        await getPromise<PhonemeFile>(phonemeJsonPath, "phonemes.json")
        
    const vowels: [string, PhonemeEntry][] = [...Object.entries(phonemeFile.vowels)]
    const consonants: [string, PhonemeEntry][] = [...Object.entries(phonemeFile.consonants)]
    const allSounds = [
        ...vowels.map(([id, sound]) => ({
            id,
            category: "vowels" as const,
            ...sound
        })),
        ...consonants.map(([id, sound]) => ({
            id,
            category: "consonants" as const,
            ...sound
        }))
    ]

    soundPrimer.innerHTML = ""

    allSounds.forEach(sound => {
        const clone: DocumentFragment = soundTemplate.content.cloneNode(true) as DocumentFragment
        const cloneAudioEl: HTMLAudioElement = clone.querySelector("audio") as HTMLAudioElement

        if (!cloneAudioEl) {
            return
        }

        cloneAudioEl.src = 
            `/engine/speech/${language}/phonemes/${sound.category}/${sound.audio.default}`
            
        cloneAudioEl.load()
        soundPrimer.append(clone)
    })
    console.log(allSounds)
}
populatePrimer()