let lang: string = document.documentElement.lang
/*
==============
PATHS
==============
*/
const phonemeJsonPath: string = `/engine/speech/${lang}/phonemes/`

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

function setAudioSource(audioEl: HTMLAudioElement, path: string, filename: string): void {
    audioEl.src = `${path}${filename}`
    audioEl.load()
}

function getRandomItem<T>(item: T[]): T {
    return item[Math.floor(Math.random() * item.length)]
}

function flattenFile<T>(file: Record<string, T>) {
    return Object.entries(file)
        .map(([id, entry]) => ({
            id,
            ...entry
        }))
}

function flattenNestedFile<T>(file: Record<string, Record<string, T>>) {
    return Object.entries(file).flatMap(([category, group]) => 
            Object.entries(group).map(([id, entry]) => ({
                id, category, ...entry
            }))
        )
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

const phonemeFile = async function phonemes(): Promise<PhonemeFile> {
    return await getPromise<PhonemeFile>(phonemeJsonPath, "phonemes.json")
}

async function populatePrimer(): Promise<void> {
    const phonemeData = await phonemeFile()
    const vowels: [string, PhonemeEntry][] = [...Object.entries(phonemeData.vowels)]
    const consonants: [string, PhonemeEntry][] = [...Object.entries(phonemeData.consonants)]
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

        if (!sound.audio.default) {
            return
        }

        cloneAudioEl.src = 
            `/engine/speech/${lang}/phonemes/${sound.category}/${sound.audio.default}`
            
        cloneAudioEl.load()
        soundPrimer.append(clone)
    })
}
populatePrimer()

// button

/*
==============
TEST AREA
==============
*/
// true-false
const vocabPath: string = `/engine/vocab/${lang}/audio/`
const vocabJsonPath: string = `/engine/vocab/${lang}/`

type VocabAudio = {
    filename: string,
    gender: string
}[]
type VocabImage = {
    filename: string,
    type: string
}[]
type VocabEntry = {
    vocab: string,
    image: VocabImage,
    audio: VocabAudio,
    syllables: number
    phonemes: string[]
}
type VocabFile = Record<string, VocabEntry>

const tfQuestion: HTMLAudioElement = 
    document.querySelector(".true_false-question") as HTMLAudioElement
const candidatePhoneme: HTMLAudioElement = 
    document.querySelector(".candidate-phoneme") as HTMLAudioElement

async function popTFquestion(): Promise<boolean> {
    const vocabFile = await getPromise<VocabFile>(vocabJsonPath, "labels.json")

    const listAudio = Object.entries(vocabFile)
        .filter(([,entry]) => entry.syllables === 1)
        .map(([id, entry]) => ({
            id,
            ...entry
        }))
    const randIndex: number = Math.floor(Math.random()*listAudio.length)
    const audioListLen: number = listAudio[randIndex].audio.length
    const randAudio: string = listAudio[randIndex].audio[Math.floor(Math.random()*audioListLen)].filename
    console.log(listAudio)

    tfQuestion.src = `${vocabPath}${randAudio}`
    tfQuestion.load()

    const phonemeData = await phonemeFile()
    const phonemeList: [string, Record<string, PhonemeEntry>][] = 
        Object.entries(phonemeData)
    const phonemeIDs = phonemeList.flatMap(([category, entry]) => 
            Object.entries(entry).map(([id, sound]) => ({
                id, category, ...sound
            }))
        )
    console.log(phonemeIDs)

    const randAnsIndex: number = Math.floor(Math.random()*phonemeIDs.length)
    const randAnsAudio: string = phonemeIDs[randAnsIndex].audio.default

    candidatePhoneme.src = `/engine/speech/${lang}/phonemes/${phonemeIDs[randAnsIndex].category}/${randAnsAudio}`
    candidatePhoneme.load()

    // find if answer matches question
    const tfQuestionPhonemes: string[] = listAudio[randIndex].phonemes
    const candidateAns: string = phonemeIDs[randAnsIndex].id
    
    const isMatch: boolean = tfQuestionPhonemes.includes(candidateAns)

    return isMatch
}

function checkTFquestion(answer: boolean) {
    const tfRadio: HTMLInputElement = 
        document.querySelector('input[name="true_false-answer"]:checked') as HTMLInputElement
    
    if (!tfRadio) {
        console.log("No answer selected")
        return
    }

    const userAnswer = tfRadio.value === "true"

    if (userAnswer === answer) {
        console.log(`That's correct! The answer is ${answer}!`)
    } else {
        console.log(`That's wrong! The answer is ${answer}!`)
    }
}

async function initTFquestion(): Promise<void> {
    const tfTestAns: boolean = await popTFquestion()
    const form: HTMLFormElement = document.querySelector("#true-false") as HTMLFormElement

    if (!form) return

    form.addEventListener("change", () => {
        checkTFquestion(tfTestAns)
    })
}

initTFquestion()

// matching test
