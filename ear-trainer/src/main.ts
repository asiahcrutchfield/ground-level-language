let lang: string = document.documentElement.lang
/*
==============
PATHS
==============
*/
const vocabPath: string = `/engine/vocab/${lang}/audio/`
const syllablePath: string = `/engine/speech/${lang}/generic/syllabic/audio/`
const rhythmPath: string = `/engine/speech/${lang}/generic/rhythm/audio/`
const tonePath: string = `/engine/speech/zh/specific/intonation/audio/`

const vocabJsonPath: string = `/engine/vocab/${lang}/`
const phonemeJsonPath: string = `/engine/speech/${lang}/generic/phonemes/`
const syllableJsonPath: string = `/engine/speech/${lang}/generic/syllabic/`
const rhythmJsonPath: string = `/engine/speech/${lang}/generic/rhythm/`
const toneJsonPath: string = `/engine/speech/zh/specific/intonation/`

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
type VocabtoSyllabicQuestion = {
    question: LabelWithMeta
    choice1: SyllabicWithMeta
    choice2: SyllabicWithMeta
    correctChoiceClass: "ans-1" | "ans-2"
}
type VocabtoRhythmQuestion = {
    question: LabelWithMeta
    choice1: RhythmWithMeta
    choice2: RhythmWithMeta
    correctChoiceClass: "ans-1" | "ans-2"
}
type VocabtoToneQuestion = {
    question: LabelWithMeta
    choice1: ToneWithMeta
    choice2: ToneWithMeta
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
type SyllabicEntry = {
    pattern: string[],
    syllables: number,
    audio: {
        default: string
    }
}
type SyllabicFile = Record<string, SyllabicEntry>
type SyllabicWithMeta = {
    id: string
} & SyllabicEntry

type RhythmEntry = {
    beats: number,
    audio: {
        default: string
    }
}
type RhythmFile = Record<string, RhythmEntry>
type RhythmWithMeta = {
    id: string
} & RhythmEntry

type ToneEntry = {
    tone: number
    audio: {
        default: string
    }
}
type ToneFile = Record<string, ToneEntry>
type ToneWithMeta = {
    id: string
} & ToneEntry

const phonemeFile = async function phonemes(): Promise<PhonemeFile> {
    return await getPromise<PhonemeFile>(phonemeJsonPath, "phonemes.json")
}
const syllabicFile = async function syllabic(): Promise<SyllabicFile> {
    return await getPromise<SyllabicFile>(syllableJsonPath, "syllables.json")
}
const rhythmFile = async function rhythm(): Promise<RhythmFile> {
    return await getPromise<RhythmFile>(rhythmJsonPath, "rhythm.json")
}
const toneFile = async function tone(): Promise<ToneFile> {
    return await getPromise<ToneFile>(toneJsonPath, "tones.json")
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
        throw new Error(`No wrong phoneme found for ${question.id}`)
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
        checkChoiceQuestion(QA.correctChoiceClass, testArea, formInputName)
    })
}

function buildPhonemeQuestion(vocabList: LabelWithMeta[], 
    phonemeList: PhonemeWithMeta[]): PhonemetoVocabQuestion {
    const question: PhonemeWithMeta = getRandomItem(phonemeList)

    const correctPool: LabelWithMeta[] = vocabList.filter(vocab => 
        vocab.phonemes.includes(question.id)
    )
    const wrongPool: LabelWithMeta[] = vocabList.filter(vocab => 
        !vocab.phonemes.includes(question.id)
    )

    if (correctPool.length === 0) {
        throw new Error(`No correct vocab found for ${question.id}`)
    }
    if (wrongPool.length === 0) {
        throw new Error(`No wrong phoneme found for ${question.id}`)
    }
 
    const wrongAns: LabelWithMeta = getRandomItem(wrongPool)
    const rightAns: LabelWithMeta = getRandomItem(correctPool)

    const correctIsFirst = Math.random() < 0.5
    const correctChoiceClass = correctIsFirst ? "ans-1" : "ans-2"

    return {
        question,
        choice1: correctIsFirst? rightAns : wrongAns,
        choice2: correctIsFirst? wrongAns : rightAns,
        correctChoiceClass
    }
}
function renderPhonemeQuestion(QA: PhonemetoVocabQuestion, testArea: HTMLDivElement): void {
    const questionArea: HTMLAudioElement = 
        testArea.querySelector(".question") as HTMLAudioElement
    const ans1: HTMLAudioElement = 
        testArea.querySelector(".ans-1_audio") as HTMLAudioElement
    const ans2: HTMLAudioElement = 
        testArea.querySelector(".ans-2_audio") as HTMLAudioElement
    const choice1Audio = getRandomItem(QA.choice1.audio)
    const choice2Audio = getRandomItem(QA.choice2.audio)

    if (!questionArea || !ans1 || !ans2) return

    setAudioSource(questionArea, `/engine/speech/${lang}/phonemes/${QA.question.category}/`, QA.question.audio.default)
    setAudioSource(ans1, vocabPath, choice1Audio.filename)
    setAudioSource(ans2, vocabPath, choice2Audio.filename)
}
async function initPhonemeQuestion(testArea: HTMLDivElement, formID: string,
    formInputName: string): Promise<void> {
    const vocabFile: VocabFile = 
        await getPromise<VocabFile>(vocabJsonPath, "labels.json")
    const phonemeData = await phonemeFile()

    const vocabList = flattenFile(vocabFile).filter(entry => entry.syllables === 1)
    const phonemeList = flattenNestedFile(phonemeData)

    const QA = buildPhonemeQuestion(vocabList, phonemeList)
    renderPhonemeQuestion(QA, testArea)

    const form = testArea.querySelector<HTMLFormElement>(formID)

    if (!form) return

    form.addEventListener("change", () => {
        checkChoiceQuestion(QA.correctChoiceClass, testArea, formInputName)
    })
}

function checkChoiceQuestion(correctChoiceClass: "ans-1" | "ans-2", 
    testArea: HTMLDivElement, inputName: string): void {
        const selected: HTMLInputElement = testArea.querySelector(
            `input[name="${inputName}"]:checked`
        ) as HTMLInputElement

        if (!selected) {
            console.log("No answer selected")
            return
        }

        const isCorrect = selected.classList.contains(correctChoiceClass)

        if (isCorrect) {
            console.log("Correct!")
        } else {
            console.log("Wrong!")
        }
}

function buildSyllabicQuestion(
    vocabList: LabelWithMeta[],
    syllabicList: SyllabicWithMeta[]
): VocabtoSyllabicQuestion {
    const question: LabelWithMeta = getRandomItem(vocabList)

    const {correctPool, wrongPool} = filteredPool(syllabicList, question.syllabicPattern)

    if (correctPool.length === 0) {
        throw new Error(`No correct syllabic pattern found for ${question.id}`)
    }

    if (wrongPool.length === 0) {
        throw new Error(`No wrong syllabic pattern found for ${question.id}`)
    }

    const rightAns: SyllabicWithMeta = getRandomItem(correctPool)
    const wrongAns: SyllabicWithMeta = getRandomItem(wrongPool)

    const correctIsFirst = Math.random() < 0.5
    const correctChoiceClass = correctIsFirst ? "ans-1" : "ans-2"

    return {
        question,
        choice1: correctIsFirst ? rightAns : wrongAns,
        choice2: correctIsFirst ? wrongAns : rightAns,
        correctChoiceClass
    }
}
function renderSyllabicQuestion(
    QA: VocabtoSyllabicQuestion,
    testArea: HTMLDivElement
): void {
    const questionArea = testArea.querySelector<HTMLAudioElement>(".question")
    const ans1 = testArea.querySelector<HTMLAudioElement>(".ans-1_audio")
    const ans2 = testArea.querySelector<HTMLAudioElement>(".ans-2_audio")

    if (!questionArea || !ans1 || !ans2) return

    const randomAudio = getRandomItem(QA.question.audio)

    setAudioSource(questionArea, vocabPath, randomAudio.filename)
    setAudioSource(ans1, syllablePath, QA.choice1.audio.default)
    setAudioSource(ans2, syllablePath, QA.choice2.audio.default)
}
async function initSyllabicQuestion(
    testArea: HTMLDivElement,
    formID: string,
    formInputName: string
): Promise<void> {
    const vocabFile: VocabFile =
        await getPromise<VocabFile>(vocabJsonPath, "labels.json")

    const syllabicData = await syllabicFile()

    const vocabList: LabelWithMeta[] =
        flattenFile(vocabFile).filter(entry => entry.syllables >= 1)

    const syllabicList: SyllabicWithMeta[] =
        flattenFile(syllabicData)

    const QA = buildSyllabicQuestion(vocabList, syllabicList)
    renderSyllabicQuestion(QA, testArea)

    const form = testArea.querySelector<HTMLFormElement>(formID)

    if (!form) return

    form.addEventListener("change", () => {
        checkChoiceQuestion(QA.correctChoiceClass, testArea, formInputName)
    })
}

function buildRhythmQuestion(
    vocabList: LabelWithMeta[],
    rhythmList: RhythmWithMeta[]
): VocabtoRhythmQuestion {
    const question: LabelWithMeta = getRandomItem(vocabList)

    const correctPool: RhythmWithMeta[] = rhythmList.filter(pattern =>
        pattern.id === question.rhythmPattern
    )

    const wrongPool: RhythmWithMeta[] = rhythmList.filter(pattern =>
        pattern.id !== question.rhythmPattern
    )

    if (correctPool.length === 0) {
        throw new Error(`No correct rhythm pattern found for ${question.id}`)
    }

    if (wrongPool.length === 0) {
        throw new Error(`No wrong rhythm pattern found for ${question.id}`)
    }

    const rightAns: RhythmWithMeta = getRandomItem(correctPool)
    const wrongAns: RhythmWithMeta = getRandomItem(wrongPool)

    const correctIsFirst = Math.random() < 0.5
    const correctChoiceClass = correctIsFirst ? "ans-1" : "ans-2"

    return {
        question,
        choice1: correctIsFirst ? rightAns : wrongAns,
        choice2: correctIsFirst ? wrongAns : rightAns,
        correctChoiceClass
    }
}
function renderRhythmQuestion(
    QA: VocabtoRhythmQuestion,
    testArea: HTMLDivElement
): void {
    const questionArea = testArea.querySelector<HTMLAudioElement>(".question")
    const ans1 = testArea.querySelector<HTMLAudioElement>(".ans-1_audio")
    const ans2 = testArea.querySelector<HTMLAudioElement>(".ans-2_audio")

    if (!questionArea || !ans1 || !ans2) return

    const randomAudio = getRandomItem(QA.question.audio)

    setAudioSource(questionArea, vocabPath, randomAudio.filename)
    setAudioSource(ans1, rhythmPath, QA.choice1.audio.default)
    setAudioSource(ans2, rhythmPath, QA.choice2.audio.default)
}
async function initRhythmQuestion(
    testArea: HTMLDivElement,
    formID: string,
    formInputName: string
): Promise<void> {
    const vocabFile: VocabFile =
        await getPromise<VocabFile>(vocabJsonPath, "labels.json")

    const rhythmData = await rhythmFile()

    const vocabList: LabelWithMeta[] =
        flattenFile(vocabFile).filter(entry => entry.syllables >= 1)

    const rhythmList: RhythmWithMeta[] =
        flattenFile(rhythmData)

    const QA = buildRhythmQuestion(vocabList, rhythmList)
    renderRhythmQuestion(QA, testArea)

    const form = testArea.querySelector<HTMLFormElement>(formID)

    if (!form) return

    form.addEventListener("change", () => {
        checkChoiceQuestion(QA.correctChoiceClass, testArea, formInputName)
    })
}

function buildToneQuestion(
    vocabList: LabelWithMeta[],
    toneList: ToneWithMeta[]
): VocabtoToneQuestion {
    const question: LabelWithMeta = getRandomItem(vocabList)

    const correctPool: ToneWithMeta[] = toneList.filter(pattern =>
        pattern.id === question.tonePattern
    )

    const wrongPool: ToneWithMeta[] = toneList.filter(pattern =>
        pattern.id !== question.tonePattern
    )

    if (correctPool.length === 0) {
        throw new Error(`No correct tone pattern found for ${question.id}`)
    }

    if (wrongPool.length === 0) {
        throw new Error(`No wrong tone pattern found for ${question.id}`)
    }

    const rightAns: ToneWithMeta = getRandomItem(correctPool)
    const wrongAns: ToneWithMeta = getRandomItem(wrongPool)

    const correctIsFirst = Math.random() < 0.5
    const correctChoiceClass = correctIsFirst ? "ans-1" : "ans-2"

    return {
        question,
        choice1: correctIsFirst ? rightAns : wrongAns,
        choice2: correctIsFirst ? wrongAns : rightAns,
        correctChoiceClass
    }
}

function renderToneQuestion(
    QA: VocabtoToneQuestion,
    testArea: HTMLDivElement
): void {
    const questionArea = testArea.querySelector<HTMLAudioElement>(".question")
    const ans1 = testArea.querySelector<HTMLAudioElement>(".ans-1_audio")
    const ans2 = testArea.querySelector<HTMLAudioElement>(".ans-2_audio")

    if (!questionArea || !ans1 || !ans2) return

    const randomAudio = getRandomItem(QA.question.audio)

    setAudioSource(questionArea, vocabPath, randomAudio.filename)
    setAudioSource(ans1, tonePath, QA.choice1.audio.default)
    setAudioSource(ans2, tonePath, QA.choice2.audio.default)
}

async function initToneQuestion(
    testArea: HTMLDivElement,
    formID: string,
    formInputName: string
): Promise<void> {
    const vocabFile: VocabFile =
        await getPromise<VocabFile>(vocabJsonPath, "labels.json")

    const toneData = await toneFile()

    const vocabList: LabelWithMeta[] =
        flattenFile(vocabFile).filter(entry => entry.syllables >= 1)

    const toneList: ToneWithMeta[] =
        flattenFile(toneData)

    const QA = buildToneQuestion(vocabList, toneList)
    renderToneQuestion(QA, testArea)

    const form = testArea.querySelector<HTMLFormElement>(formID)

    if (!form) return

    form.addEventListener("change", () => {
        checkChoiceQuestion(QA.correctChoiceClass, testArea, formInputName)
    })
}

function filteredPool<T extends {id: string}> (list: T[], targetId: string): 
    {
        correctPool: T[],
        wrongPool: T[]
    } 
{
     const correctPool = list.filter(item => item.id === targetId)
     const wrongPool = list.filter(item => item.id !== targetId)

     return {correctPool, wrongPool}
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

    const result: ({id: string; category: "vowels" | "consonants"} & T)[] = []

    for (let i = 0; i < outerKeys.length; i++) {
        const outerPair = outerKeys[i] // ["vowels", {...}] or ["consonants", {...}]

         const category = outerPair[0] // this is a category like "vowels"
         const group = outerPair[1] // this is the object holding that category's phonemes

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
            } as {id: string; category: "vowels" | "consonants"} & T
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
    syllabicPattern: string
    rhythmPattern: string
    tonePattern: string
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
const matchingTest: HTMLDivElement = document.querySelector(".matching-test")!
initVocabQuestion(matchingTest, "#matching", "matching-answer")

// rhythm test
const rhythmTest: HTMLDivElement = document.querySelector(".rhythm-test")!
initRhythmQuestion(rhythmTest, "#rhythm", "rhythm-answer")

// syllable test
const syllableTest: HTMLDivElement = document.querySelector(".syllable-test")!
initSyllabicQuestion(syllableTest, "#syllables", "syllable-answer")

// tone test
const toneTest: HTMLDivElement = document.querySelector(".tone-test")!
initToneQuestion(toneTest, "#tone", "tone-answer")