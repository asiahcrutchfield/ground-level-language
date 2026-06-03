let lang: string = document.documentElement.lang

/*
==============
PATHS
==============
*/

const PATHS = {
    vocabAudio: `/engine/vocab/${lang}/audio/`,
    vocabJson: `/engine/vocab/${lang}/`,

    phonemeAudio: `/engine/speech/${lang}/generic/phonemes/`,
    phonemeJson: `/engine/speech/${lang}/generic/phonemes/`,

    syllableAudio: `/engine/speech/${lang}/generic/syllabic/audio/`,
    syllableJson: `/engine/speech/${lang}/generic/syllabic/`,

    rhythmAudio: `/engine/speech/${lang}/generic/rhythm/audio/`,
    rhythmJson: `/engine/speech/${lang}/generic/rhythm/`,

    toneAudio: `/engine/speech/${lang}/specific/intonation/audio/`,
    toneJson: `/engine/speech/${lang}/specific/intonation/`
} as const

/*
==============
COMMON TYPES
==============
*/

type CorrectChoiceClass = "ans-1" | "ans-2"

type WithId = {
    id: string
}

type ChoiceQuestion<TQuestion, TChoice> = {
    question: TQuestion
    choice1: TChoice
    choice2: TChoice
    correctChoiceClass: CorrectChoiceClass
}

type LabelWithMeta = {
    id: string
} & VocabEntry

type PhonemeWithMeta = {
    id: string
    category: "vowels" | "consonants"
} & PhonemeEntry

type SyllabicWithMeta = {
    id: string
} & SyllabicEntry

type RhythmWithMeta = {
    id: string
} & RhythmEntry

type ToneWithMeta = {
    id: string
} & ToneEntry

type VocabToPhonemeQuestion = ChoiceQuestion<LabelWithMeta, PhonemeWithMeta>
type PhonemeToVocabQuestion = ChoiceQuestion<PhonemeWithMeta, LabelWithMeta>
type VocabToSyllabicQuestion = ChoiceQuestion<LabelWithMeta, SyllabicWithMeta>
type VocabToRhythmQuestion = ChoiceQuestion<LabelWithMeta, RhythmWithMeta>
type VocabToToneQuestion = ChoiceQuestion<LabelWithMeta, ToneWithMeta>

/*
==============
DATA TYPES
==============
*/

type PhonemeEntry = {
    ipa: string
    transcription: {
        pinyin: string
        zhuyin: string
    }
    audio: {
        default: string
    }
}

type PhonemeFile = {
    vowels: Record<string, PhonemeEntry>
    consonants: Record<string, PhonemeEntry>
}

type SyllabicEntry = {
    pattern: string[]
    syllables: number
    audio: {
        default: string
    }
}

type SyllabicFile = Record<string, SyllabicEntry>

type RhythmEntry = {
    beats: number
    audio: {
        default: string
    }
}

type RhythmFile = Record<string, RhythmEntry>

type ToneEntry = {
    tone: number
    audio: {
        default: string
    }
}

type ToneFile = Record<string, ToneEntry>

type VocabAudio = {
    filename: string
    gender: string
}[]

type VocabImage = {
    filename: string
    type: string
}[]

type VocabEntry = {
    vocab: string
    image: VocabImage
    audio: VocabAudio
    syllables: number
    phonemes: string[]
    syllabicPattern: string
    rhythmPattern: string
    tonePattern?: string
}

type VocabFile = Record<string, VocabEntry>

/*
==============
DATA LOADERS
==============
*/

async function getPromise<T>(path: string, file: string): Promise<T> {
    const response: Response = await fetch(`${path}${file}`)

    if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`)
    }

    return await response.json() as T
}
async function getOptionalPromise<T>(path: string, file: string): Promise<T | null> {
    const response: Response = await fetch(`${path}${file}`)

    if (response.status === 404) {
        return null
    }

    if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`)
    }

    return await response.json() as T
}


const loadPhonemeFile = (): Promise<PhonemeFile> =>
    getPromise<PhonemeFile>(PATHS.phonemeJson, "phonemes.json")

const loadSyllabicFile = (): Promise<SyllabicFile> =>
    getPromise<SyllabicFile>(PATHS.syllableJson, "syllables.json")

const loadRhythmFile = (): Promise<RhythmFile> =>
    getPromise<RhythmFile>(PATHS.rhythmJson, "rhythm.json")

const loadToneFile = (): Promise<ToneFile | null> =>
    getOptionalPromise<ToneFile>(PATHS.toneJson, "tones.json")

const loadVocabFile = (): Promise<VocabFile> =>
    getPromise<VocabFile>(PATHS.vocabJson, "labels.json")

/*
==============
UNIVERSAL HELPERS
==============
*/

function setAudioSource(audioEl: HTMLAudioElement, path: string, filename: string): void {
    audioEl.src = `${path}${filename}`
    audioEl.load()
}

function getRandomItem<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)]
}

function filteredPool<T extends WithId>(
    list: T[],
    targetId: string
): {
    correctPool: T[]
    wrongPool: T[]
} {
    const correctPool = list.filter(item => item.id === targetId)
    const wrongPool = list.filter(item => item.id !== targetId)

    return { correctPool, wrongPool }
}

function pickChoices<T>(correctPool: T[], wrongPool: T[]) {
    const rightAns = getRandomItem(correctPool)
    const wrongAns = getRandomItem(wrongPool)

    const correctIsFirst = Math.random() < 0.5
    const correctChoiceClass: CorrectChoiceClass = correctIsFirst ? "ans-1" : "ans-2"

    return {
        choice1: correctIsFirst ? rightAns : wrongAns,
        choice2: correctIsFirst ? wrongAns : rightAns,
        correctChoiceClass
    }
}

function flattenFile<T>(file: Record<string, T>): ({ id: string } & T)[] {
    const entries = Object.entries(file)
    const result: ({ id: string } & T)[] = []

    for (let i = 0; i < entries.length; i++) {
        const [id, entry] = entries[i]
        result.push({ id, ...entry })
    }

    return result
}

function flattenNestedFile<T>(
    file: Record<string, Record<string, T>>
): ({ id: string; category: "vowels" | "consonants" } & T)[] {
    const outerEntries = Object.entries(file)
    const result: ({ id: string; category: "vowels" | "consonants" } & T)[] = []

    for (let i = 0; i < outerEntries.length; i++) {
        const [category, group] = outerEntries[i]
        const innerEntries = Object.entries(group)

        for (let j = 0; j < innerEntries.length; j++) {
            const [id, entry] = innerEntries[j]

            result.push({
                id,
                category: category as "vowels" | "consonants",
                ...entry
            })
        }
    }

    return result
}

function getQuestionAudioEls(testArea: HTMLDivElement) {
    const questionArea = testArea.querySelector<HTMLAudioElement>(".question")
    const ans1 = testArea.querySelector<HTMLAudioElement>(".ans-1_audio")
    const ans2 = testArea.querySelector<HTMLAudioElement>(".ans-2_audio")

    return { questionArea, ans1, ans2 }
}

function checkChoiceQuestion(
    correctChoiceClass: CorrectChoiceClass,
    testArea: HTMLDivElement,
    inputName: string
): void {
    const selected = testArea.querySelector<HTMLInputElement>(
        `input[name="${inputName}"]:checked`
    )

    if (!selected) {
        console.log("No answer selected")
        return
    }

    const isCorrect = selected.classList.contains(correctChoiceClass)
    console.log(isCorrect ? "Correct!" : "Wrong!")
}

/*
==============
GENERIC QUESTION BUILDERS
==============
*/

function buildMappedQuestion<TQuestion, TChoice extends WithId>(
    questionList: TQuestion[],
    choiceList: TChoice[],
    getTargetId: (question: TQuestion) => string,
    errorLabel: string
): ChoiceQuestion<TQuestion, TChoice> {
    const question = getRandomItem(questionList)
    const targetId = getTargetId(question)

    const { correctPool, wrongPool } = filteredPool(choiceList, targetId)

    if (correctPool.length === 0) {
        throw new Error(`No correct ${errorLabel} found`)
    }

    if (wrongPool.length === 0) {
        throw new Error(`No wrong ${errorLabel} found`)
    }

    return {
        question,
        ...pickChoices(correctPool, wrongPool)
    }
}

function buildVocabQuestion(
    vocabList: LabelWithMeta[],
    phonemeList: PhonemeWithMeta[]
): VocabToPhonemeQuestion {
    const question = getRandomItem(vocabList)

    const correctPool = phonemeList.filter(phoneme =>
        question.phonemes.includes(phoneme.id)
    )
    const wrongPool = phonemeList.filter(phoneme =>
        !question.phonemes.includes(phoneme.id)
    )

    if (correctPool.length === 0) {
        throw new Error(`No correct phoneme found for ${question.id}`)
    }

    if (wrongPool.length === 0) {
        throw new Error(`No wrong phoneme found for ${question.id}`)
    }

    return {
        question,
        ...pickChoices(correctPool, wrongPool)
    }
}

function buildPhonemeQuestion(
    vocabList: LabelWithMeta[],
    phonemeList: PhonemeWithMeta[]
): PhonemeToVocabQuestion {
    const question = getRandomItem(phonemeList)

    const correctPool = vocabList.filter(vocab =>
        vocab.phonemes.includes(question.id)
    )
    const wrongPool = vocabList.filter(vocab =>
        !vocab.phonemes.includes(question.id)
    )

    if (correctPool.length === 0) {
        throw new Error(`No correct vocab found for ${question.id}`)
    }

    if (wrongPool.length === 0) {
        throw new Error(`No wrong vocab found for ${question.id}`)
    }

    return {
        question,
        ...pickChoices(correctPool, wrongPool)
    }
}

function buildSyllabicQuestion(
    vocabList: LabelWithMeta[],
    syllabicList: SyllabicWithMeta[]
): VocabToSyllabicQuestion {
    return buildMappedQuestion(
        vocabList,
        syllabicList,
        question => question.syllabicPattern,
        "syllabic pattern"
    )
}

function buildRhythmQuestion(
    vocabList: LabelWithMeta[],
    rhythmList: RhythmWithMeta[]
): VocabToRhythmQuestion {
    return buildMappedQuestion(
        vocabList,
        rhythmList,
        question => question.rhythmPattern,
        "rhythm pattern"
    )
}

function buildToneQuestion(
    vocabList: LabelWithMeta[],
    toneList: ToneWithMeta[]
): VocabToToneQuestion {
    const toneVocabList = vocabList.filter(
        (entry): entry is LabelWithMeta & { tonePattern: string } =>
            typeof entry.tonePattern === "string" && entry.tonePattern.length > 0
    )

    return buildMappedQuestion(
        toneVocabList,
        toneList,
        question => question.tonePattern,
        "tone pattern"
    )
}


/*
==============
GENERIC RENDERERS
==============
*/

function renderVocabQuestion(
    QA: VocabToPhonemeQuestion,
    testArea: HTMLDivElement
): void {
    const { questionArea, ans1, ans2 } = getQuestionAudioEls(testArea)

    if (!questionArea || !ans1 || !ans2) return

    const randomAudio = getRandomItem(QA.question.audio)

    setAudioSource(questionArea, PATHS.vocabAudio, randomAudio.filename)
    setAudioSource(
        ans1,
        `${PATHS.phonemeAudio}${QA.choice1.category}/`,
        QA.choice1.audio.default
    )
    setAudioSource(
        ans2,
        `${PATHS.phonemeAudio}${QA.choice2.category}/`,
        QA.choice2.audio.default
    )
}

function renderPhonemeQuestion(
    QA: PhonemeToVocabQuestion,
    testArea: HTMLDivElement
): void {
    const { questionArea, ans1, ans2 } = getQuestionAudioEls(testArea)

    if (!questionArea || !ans1 || !ans2) return

    const choice1Audio = getRandomItem(QA.choice1.audio)
    const choice2Audio = getRandomItem(QA.choice2.audio)

    setAudioSource(
        questionArea,
        `${PATHS.phonemeAudio}${QA.question.category}/`,
        QA.question.audio.default
    )
    setAudioSource(ans1, PATHS.vocabAudio, choice1Audio.filename)
    setAudioSource(ans2, PATHS.vocabAudio, choice2Audio.filename)
}

function renderPatternQuestion<TChoice extends { audio: { default: string } }>(
    QA: ChoiceQuestion<LabelWithMeta, TChoice>,
    testArea: HTMLDivElement,
    answerAudioPath: string
): void {
    const { questionArea, ans1, ans2 } = getQuestionAudioEls(testArea)

    if (!questionArea || !ans1 || !ans2) return

    const randomAudio = getRandomItem(QA.question.audio)

    setAudioSource(questionArea, PATHS.vocabAudio, randomAudio.filename)
    setAudioSource(ans1, answerAudioPath, QA.choice1.audio.default)
    setAudioSource(ans2, answerAudioPath, QA.choice2.audio.default)
}

function renderSyllabicQuestion(
    QA: VocabToSyllabicQuestion,
    testArea: HTMLDivElement
): void {
    renderPatternQuestion(QA, testArea, PATHS.syllableAudio)
}

function renderRhythmQuestion(
    QA: VocabToRhythmQuestion,
    testArea: HTMLDivElement
): void {
    renderPatternQuestion(QA, testArea, PATHS.rhythmAudio)
}

function renderToneQuestion(
    QA: VocabToToneQuestion,
    testArea: HTMLDivElement
): void {
    renderPatternQuestion(QA, testArea, PATHS.toneAudio)
}

/*
==============
GENERIC INIT
==============
*/

async function initChoiceQuestion<TQA>({
    testArea,
    formSelector,
    inputName,
    buildQuestion,
    renderQuestion
}: {
    testArea: HTMLDivElement
    formSelector: string
    inputName: string
    buildQuestion: () => Promise<TQA> | TQA
    renderQuestion: (qa: TQA, testArea: HTMLDivElement) => void
}): Promise<void> {
    const QA = await buildQuestion()
    renderQuestion(QA, testArea)

    const form = testArea.querySelector<HTMLFormElement>(formSelector)
    if (!form) return

    form.addEventListener("change", () => {
        checkChoiceQuestion(
            (QA as { correctChoiceClass: CorrectChoiceClass }).correctChoiceClass,
            testArea,
            inputName
        )
    })
}

/*
==============
SPECIFIC INIT FUNCTIONS
==============
*/

async function initVocabQuestion(
    testArea: HTMLDivElement,
    formSelector: string,
    inputName: string
): Promise<void> {
    const vocabFile = await loadVocabFile()
    const phonemeData = await loadPhonemeFile()

    const vocabList = flattenFile(vocabFile).filter(entry => entry.syllables === 1)
    const phonemeList = flattenNestedFile(phonemeData)

    await initChoiceQuestion({
        testArea,
        formSelector,
        inputName,
        buildQuestion: () => buildVocabQuestion(vocabList, phonemeList),
        renderQuestion: renderVocabQuestion
    })
}

async function initPhonemeQuestion(
    testArea: HTMLDivElement,
    formSelector: string,
    inputName: string
): Promise<void> {
    const vocabFile = await loadVocabFile()
    const phonemeData = await loadPhonemeFile()

    const vocabList = flattenFile(vocabFile).filter(entry => entry.syllables === 1)
    const phonemeList = flattenNestedFile(phonemeData)

    await initChoiceQuestion({
        testArea,
        formSelector,
        inputName,
        buildQuestion: () => buildPhonemeQuestion(vocabList, phonemeList),
        renderQuestion: renderPhonemeQuestion
    })
}

async function initSyllabicQuestion(
    testArea: HTMLDivElement,
    formSelector: string,
    inputName: string
): Promise<void> {
    const vocabFile = await loadVocabFile()
    const syllabicData = await loadSyllabicFile()

    const vocabList = flattenFile(vocabFile).filter(entry => entry.syllables >= 1)
    const syllabicList = flattenFile(syllabicData)

    await initChoiceQuestion({
        testArea,
        formSelector,
        inputName,
        buildQuestion: () => buildSyllabicQuestion(vocabList, syllabicList),
        renderQuestion: renderSyllabicQuestion
    })
}

async function initRhythmQuestion(
    testArea: HTMLDivElement,
    formSelector: string,
    inputName: string
): Promise<void> {
    const vocabFile = await loadVocabFile()
    const rhythmData = await loadRhythmFile()

    const vocabList = flattenFile(vocabFile).filter(entry => entry.syllables >= 1)
    const rhythmList = flattenFile(rhythmData)

    await initChoiceQuestion({
        testArea,
        formSelector,
        inputName,
        buildQuestion: () => buildRhythmQuestion(vocabList, rhythmList),
        renderQuestion: renderRhythmQuestion
    })
}

async function initToneQuestion(
    testArea: HTMLDivElement | null,
    formSelector: string,
    inputName: string
): Promise<void> {
    if (!testArea) return

    const toneData = await loadToneFile()

    if (!toneData) {
        testArea.hidden = true
        return
    }

    const vocabFile = await loadVocabFile()

    const vocabList = flattenFile(vocabFile).filter(
        (entry): entry is LabelWithMeta & { tonePattern: string } =>
            entry.syllables >= 1 &&
            typeof entry.tonePattern === "string" &&
            entry.tonePattern.length > 0
    )

    if (vocabList.length === 0) {
        testArea.hidden = true
        return
    }

    const toneList = flattenFile(toneData)

    if (toneList.length === 0) {
        testArea.hidden = true
        return
    }

    await initChoiceQuestion({
        testArea,
        formSelector,
        inputName,
        buildQuestion: () => buildToneQuestion(vocabList, toneList),
        renderQuestion: renderToneQuestion
    })
}


/*
==============
SOUND PRIMER
==============
*/

const soundTemplate =
    document.querySelector<HTMLTemplateElement>("#sound-template")!

const soundPrimer =
    document.querySelector<HTMLUListElement>("#sound-primer")!

async function populatePrimer(): Promise<void> {
    const phonemeData = await loadPhonemeFile()
    const allSounds = flattenNestedFile(phonemeData)

    soundPrimer.innerHTML = ""

    allSounds.forEach(sound => {
        const clone = soundTemplate.content.cloneNode(true) as DocumentFragment
        const cloneAudioEl = clone.querySelector("audio") as HTMLAudioElement

        if (!cloneAudioEl) return
        if (!sound.audio.default) return

        cloneAudioEl.src = `${PATHS.phonemeAudio}${sound.category}/${sound.audio.default}`
        cloneAudioEl.load()

        soundPrimer.append(clone)
    })
}

/*
==============
BOOTSTRAP
==============
*/

populatePrimer()

const matchingTest = document.querySelector(".matching-test") as HTMLDivElement
const rhythmTest = document.querySelector(".rhythm-test") as HTMLDivElement
const syllableTest = document.querySelector(".syllable-test") as HTMLDivElement
const toneTest = document.querySelector(".tone-test") as HTMLDivElement | null

initVocabQuestion(matchingTest, "#matching", "matching-answer")
initRhythmQuestion(rhythmTest, "#rhythm", "rhythm-answer")
initSyllabicQuestion(syllableTest, "#syllables", "syllable-answer")
initToneQuestion(toneTest, "#tone", "tone-answer")
