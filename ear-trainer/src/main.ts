let lang: string = document.documentElement.lang
/*
==============
PATHS
==============
*/
const vocabPath: string = `/engine/vocab/${lang}/audio/`
const vocabJsonPath: string = `/engine/vocab/${lang}/`
const phonemeJsonPath: string = `/engine/speech/${lang}/phonemes/`

type PhonemeWithMeta = {
    id: string,
    category: "vowels" | "consonants",
} & PhonemeEntry
type LabelWithMeta = {
    id: string
} & VocabEntry
type BasicVocabQuestion = {
    question: LabelWithMeta,
    choice1: LabelWithMeta,
    choice2: LabelWithMeta,
    correctChoiceClass: "ans-1" | "ans-2"
}
type BasicPhonemeQuestion = {
    question: PhonemeWithMeta,
    choice1: PhonemeWithMeta,
    choice2: PhonemeWithMeta,
    correctChoiceClass: "ans-1" | "ans-2"
}
type VocabtoPhonemeQuestion = {
    question: LabelWithMeta,
    choice1: PhonemeWithMeta,
    choice2: PhonemeWithMeta,
    correctChoiceClass: "ans-1" | "ans-2"
}
type PhonemetoVocabQuestion = {
    question: PhonemeWithMeta,
    choice1: LabelWithMeta,
    choice2: LabelWithMeta,
    correctChoiceClass: "ans-1" | "ans-2"
}
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

function buildVocabQuestion(vocabList: LabelWithMeta[], 
    phonemeList: PhonemeWithMeta[]): VocabtoPhonemeQuestion {
    const question: LabelWithMeta = getRandomItem(vocabList)

    const correctPool: PhonemeWithMeta[] = phonemeList.filter(phoneme => 
        question.phonemes.includes(phoneme.id)
    )
    const wrongPool: PhonemeWithMeta[] = phonemeList.filter(phoneme => 
        !question.phonemes.includes(phoneme.id)
    )

    if (correctPool.length === 0) {
        throw new Error(`No correct phoneme found for ${question.id}`)
    }
    if (wrongPool.length === 0) {
        throw new Error(`No correct phoneme found for ${question.id}`)
    }
 
    const wrongAns: PhonemeWithMeta = getRandomItem(wrongPool)
    const rightAns: PhonemeWithMeta = getRandomItem(correctPool)

    const correctIsFirst = Math.random() < 0.5
    const correctChoiceClass = correctIsFirst ? "ans-1" : "ans-2"

    return {
        question,
        choice1: correctIsFirst? rightAns : wrongAns,
        choice2: correctIsFirst? wrongAns : rightAns,
        correctChoiceClass
    }
}
function renderVocabQuestion(QA: VocabtoPhonemeQuestion, testArea: HTMLDivElement): void {
    const questionArea: HTMLAudioElement = 
        testArea.querySelector(".question") as HTMLAudioElement
    const ans1: HTMLAudioElement = 
        testArea.querySelector(".ans-1_audio") as HTMLAudioElement
    const ans2: HTMLAudioElement = 
        testArea.querySelector(".ans-2_audio") as HTMLAudioElement
    const randomAudio = getRandomItem(QA.question.audio)

    if (!questionArea || !ans1 || !ans2) return

    setAudioSource(questionArea, vocabPath, randomAudio.filename)
    setAudioSource(ans1, `/engine/speech/${lang}/phonemes/${QA.choice1.category}/`, QA.choice1.audio.default)
    setAudioSource(ans2, `/engine/speech/${lang}/phonemes/${QA.choice2.category}/`, QA.choice2.audio.default)
}
function checkVocabQuestion(QA: VocabtoPhonemeQuestion, 
    testArea: HTMLDivElement, inputName: string) {
        const selected: HTMLInputElement = testArea.querySelector(
            `input[name="${inputName}"]:checked`
        ) as HTMLInputElement

        if (!selected) {
            console.log("No answer selected")
            return
        }

        const isCorrect = selected.classList.contains(QA.correctChoiceClass)

        if (isCorrect) {
            console.log("Correct!")
        } else {
            console.log("Wrong!")
        }
}
async function initVocabQuestion(testArea: HTMLDivElement, formID: string,
    formInputName: string): Promise<void> {
    const vocabFile: VocabFile = 
        await getPromise<VocabFile>(vocabJsonPath, "labels.json")
    const phonemeData = await phonemeFile()

    const vocabList = flattenFile(vocabFile).filter(entry => entry.syllables === 1)
    const phonemeList = flattenNestedFile(phonemeData)

    const QA = buildVocabQuestion(vocabList, phonemeList)
    renderVocabQuestion(QA, testArea)

    const form = testArea.querySelector<HTMLFormElement>(formID)

    if (!form) return

    form.addEventListener("change", () => {
        checkVocabQuestion(QA, testArea, formInputName)
    })
}

function renderPhonemeQuestion(): void {

}

function getRandomItem<T>(item: T[]): T {
    return item[Math.floor(Math.random() * item.length)]
}

function flattenFile<T>(file: Record<string, T>): ({id: string} & T)[] {
    // return Object.entries(file)
    //     .map(([id, entry]) => ({
    //         id,
    //         ...entry
    //     }))
    /*
    Plain English:
    For everything in the file,
    take its key,
    take its value,
    combine them into one object,
    and put that object into a new array
    */

    const entries = Object.entries(file)
    /* [
        ["u00-0001", {"vocab": "水", "syllables": 1}],
        ["u00-0002", {"vocab": "貓", "syllables": 1}]
       ] 
    */ 

    const result = []

    for (let i = 0; i < entries.length; i++) {
        const pair = entries[i]

        const id = pair[0]
        const entry = pair[1]

        const newObject = {
            id: id,
            ...entry
            /*
            {
                id: "u00-0001",
                vocab: "水",
                syllables: 1
            }
            */
        }
        /*
            const newObject = {}

            newObject.id = id

            // copy all properties manually
            for (const key in entry) {
                newObject[key] = entry[key]
            }
        */
        result.push(newObject)
    }
    return result
}

function flattenNestedFile<T>(file: Record<string, Record<string, T>>):
    ({id: string; category: "vowels" | "consonants"} & T)[] {
    // return Object.entries(file).flatMap(([category, group]) => 
    //         Object.entries(group).map(([id, entry]) => ({
    //             id, category, ...entry
    //         }))
    //     )
    /*
    for each category
        for each item inside category
            push flattened object
    */
    const outerKeys = Object.entries(file)
    /* [
        ["vowels", {...}],
        ["consonants", {...}]
       ] 
    */ 

    const result = []

    for (let i = 0; i < outerKeys.length; i++) {
        const outerPair = outerKeys[i] // in phonemes.json this is v01, v02, c01...

         const category = outerPair[0] // this is a category like "vowels"
         const group = outerPair[1] // this is an id like "{v01: {...}, v02: {...}}"

         const innerEntries = Object.entries(group)
         /* [
                ["v01", {...}],
                ["v02", {...}]
            ] 
        */ 

         for (let j = 0; j < innerEntries.length; j++) {
            const innerPair = innerEntries[j]

            const id = innerPair[0] // "v01"
            const entry = innerPair[1] // {ipa: "i"}

            const newObject = {
                id: id,
                category: category,
                ...entry
                /*
                iteration 1:
                {
                    id: "v01",
                    category: "vowels",
                    ipa: "i"
                }
                */
            }
            result.push(newObject)
         }
    }
    return result
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
