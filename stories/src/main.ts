import "./style.css"

// retrieving info from language engine
let storyLang: string = "zh"
const universal: string = "u"
let conceptNum: number = 0
let conceptItemNum: number = 0
    const conceptCat: string = String(conceptNum).padStart(2, '0')
    const conceptItem: string = String(conceptItemNum).padStart(4, "0")

// getting paths to stories, images and audio
let level: string = "0"
const imgPath1: string = `/dictionary/universal/images/`
const imgPath2: string = `/dictionary/vocab/${storyLang}/images/`
const vocabAudioPath: string = `/dictionary/vocab/${storyLang}/audio/`
const storyAudioPath: string = `/stories/langs/${storyLang}/lvl_${level}/`
const storyPath: string = `/stories/langs/${storyLang}/lvl_${level}/stories.json` // path to stories
const vocabPath: string = `/dictionary/levels/lang/${storyLang}/lvl_${level}.json` // path to vocab list

// defining types
type Story = {
    readonly id: string,
    title: string,
    coreConcepts: string[],
    lines: string[],
    audio: string
}

type Stories = Story[]

// fetch story data
async function fetchStories(): Promise<Stories> {
    const response: Response = await fetch(storyPath)
    const stories: Stories = await response.json()

    return stories
}

let storyIndex: number = 0

// fetch dictionary
async function fetchVocab(): Promise<string[]> {
    const response: Response = await fetch(vocabPath)
    const dict = await response.json()

    return dict
}
const vocabDict: string[] = await fetchVocab()

// fetch label data
const labelPath = `/dictionary/langs/${storyLang}/labels.json` 

// create label type
type LabelImage = {
    filename: string,
    type: string
}
type LabelAudio = {
    filename: string,
    gender: string
}
type LabelEntry = {
    vocab: string,
    image: LabelImage[],
    audio: LabelAudio[]
}

type Labels = {
    [conceptId: string]: LabelEntry
}

async function fetchLabels(): Promise<Labels> {
    const response: Response = await fetch(labelPath)
    const labels: Labels = await response.json()

    return labels
}
const langLabels: Labels = await fetchLabels()

// load story by index number
async function loadStory(): Promise<Story> {
    const stories = await fetchStories()
    const storySelector = document.querySelector<HTMLSelectElement>("#story-select") 

    // populate selections
    stories.forEach((story: Story, index: number) => {
        const option: HTMLOptionElement = document.createElement("option")
            option.value = `story-${index+1}`
            option.textContent = `${story.title}`
        storySelector?.append(option)

        if (index === 0) {
            option.selected = true
        }
    })
    
    const options = document.querySelectorAll<HTMLOptionElement>("#story-select option")
    options.forEach((option: HTMLOptionElement, num: number) => {
        option.addEventListener("click", ()=> {
            storyIndex === num
        })
    })

    let story = stories[storyIndex]

    return story
}

const story = await loadStory()

// load and display images and audio
const imgframe = document.querySelector<HTMLDivElement>("#image-frame")
const vocabAudio = document.querySelector<HTMLAudioElement>(".vocab-audio")

// 1. load all images based on coreVocab
function initImages(storyItem: Story): void {
    if (!imgframe) return
    imgframe.innerHTML = ""

    // append all the core vocab to the image frame
    storyItem.coreConcepts.forEach((vocab: string, index: number) => {
        const entry: LabelEntry = langLabels[vocab]
        const randImg: number = Math.floor(Math.random()*entry.image.length)
        const imagefilename = entry.image[randImg].filename
        const img = document.createElement("img")
            img.classList.add("primer-image")
            img.src = `${imgPath1}${imagefilename}`
            img.alt = `${imagefilename}`
        imgframe.append(img)
        
        if (index === 0) {
            img.classList.add("img-display") // only display the first image
        }
    })
}
initImages(story)

// 2. initialize correct vocab audio
function initVocabAudio(storyItem: Story): void {
    if (!vocabAudio) return

    const audioLabelLen: number = langLabels[storyItem.coreConcepts[0]].audio.length
    const randAudio: number = Math.floor(Math.random()*audioLabelLen)
    vocabAudio.src = `${vocabAudioPath}${langLabels[storyItem.coreConcepts[0]].audio[randAudio].filename}`
    vocabAudio.load() // load the correct audio
}
initVocabAudio(story)

let vocabIndex: number = 0

// 3. cycle through images and audio
const forwardBtn = document.querySelector<HTMLButtonElement>("#forward")
const backBtn = document.querySelector<HTMLButtonElement>("#backward")
const vocabImages = document.querySelectorAll<HTMLImageElement>(".primer-image")
    const numOfImages: number = vocabImages.length

function forward(): void {
    if (forwardBtn) {
        forwardBtn.addEventListener("click", () => {
            const prevIndex: number = vocabIndex
                const audioIndexlLen: number = langLabels[story.coreConcepts[vocabIndex]].audio.length
                const randomAudio: number = Math.floor(Math.random()*audioIndexlLen)
            vocabIndex = (vocabIndex + 1) % numOfImages
            vocabImages[prevIndex].classList.remove("img-display")
            vocabImages[vocabIndex].classList.add("img-display")
            if (vocabAudio) {
                vocabAudio.src = `${vocabAudioPath}${langLabels[story.coreConcepts[vocabIndex]].audio[randomAudio].filename}`
                vocabAudio.load() // load the correct audio
            }
        })
    }
}

function backward(): void {
    if (backBtn) {
        backBtn.addEventListener("click", () => {
            const nextIndex: number = vocabIndex
                const audioIndexlLen: number = langLabels[story.coreConcepts[vocabIndex]].audio.length
                const randomAudio: number = Math.floor(Math.random()*audioIndexlLen)
            vocabIndex = (vocabIndex - 1 + numOfImages) % numOfImages
            vocabImages[nextIndex].classList.remove("img-display")
            vocabImages[vocabIndex].classList.add("img-display")
            if (vocabAudio) {
                vocabAudio.src = `${vocabAudioPath}${langLabels[story.coreConcepts[vocabIndex]].audio[randomAudio].filename}`
                vocabAudio.load() // load the correct audio
            }
        })
    }
}

// activate front and back buttons
function imagePrimer(): void {
    forward()
    backward()
}
imagePrimer()

// 4. initialize story
const storyPlayer = document.querySelector<HTMLAudioElement>("#story")

function initStory(): void {
    if (!storyPlayer) return

    storyPlayer.src = `${storyAudioPath}${story.audio}`
    storyPlayer.load()
}
initStory()

// build test sections
// 1. select random number 
function randomIndex(arrayLen: number): number {
    return Math.floor(Math.random() * arrayLen)
}

// 2. remove item from list
function removeItem(arr: string[], itemIndex: number): void {
    arr.splice(itemIndex, 1)
}

// 3. display question image/audio
const tests: NodeListOf<HTMLDivElement> = document.querySelectorAll<HTMLDivElement>(".review")
const imgTest: HTMLDivElement = document.querySelector<HTMLDivElement>("#pic-audio")!
    const imgQuestion: HTMLImageElement = document.querySelector<HTMLImageElement>("#pic-audio .review-img")!
const audioTest: HTMLDivElement = document.querySelector<HTMLDivElement>("#audio-pic")!
    const audioQuestion: HTMLAudioElement = document.querySelector<HTMLAudioElement>("#audio-pic .review-audio")!

// create type for loadQuestion function
type QuestionInfo = {
    mode: number,
    concept: string
}

function loadQuestion(arr: string[], indexNum: number): QuestionInfo {
    const randNum: number = Math.floor(Math.random() * 2)
    const imgAudioWord: string = arr[indexNum]

    // 1. hide both sections
    tests.forEach(test => {
        test.classList.add("hide")
    })

    // 2. display test and question based on randNum
    if (randNum === 0) {
        imgTest.classList.remove("hide")
        const imageQuestionLen: number = langLabels[imgAudioWord].image.length
            const randomImage: number = Math.floor(Math.random()*imageQuestionLen)
        imgQuestion.src = `${imgPath1}${langLabels[imgAudioWord].image[randomImage].filename}`
        imgQuestion.dataset.concept = imgAudioWord
        imgQuestion.alt = imgAudioWord
    } else {
        audioTest.classList.remove("hide")
        const audioQuestionLen: number = langLabels[imgAudioWord].audio.length
            const randomAudio: number = Math.floor(Math.random()*audioQuestionLen)
        audioQuestion.src = `${vocabAudioPath}${langLabels[imgAudioWord].audio[randomAudio].filename}`
        audioQuestion.dataset.concept = imgAudioWord
        audioQuestion.load()
    }

    return {
        mode: randNum, 
        concept: imgAudioWord
    }
}

// 4. choose random answer item and populate choices
const picLabels: NodeListOf<HTMLLabelElement> = document.querySelectorAll<HTMLLabelElement>(".pic-label")
    const picChoices: NodeListOf<HTMLImageElement> = document.querySelectorAll<HTMLImageElement>(".pic-label .review-img")
const audioLabels: NodeListOf<HTMLLabelElement> = document.querySelectorAll<HTMLLabelElement>(".audio-label")
    const audioChoices: NodeListOf<HTMLAudioElement> = document.querySelectorAll<HTMLAudioElement>(".audio-label .review-audio")
const picRadio: NodeListOf<HTMLInputElement> = document.querySelectorAll<HTMLInputElement>("input[name='pic-choice']")!
const audioRadio: NodeListOf<HTMLInputElement> = document.querySelectorAll<HTMLInputElement>("input[name='audio-choice']")!

function randomAnswer(question: QuestionInfo): number {
    // create copy of original array
    const wrongAnswers: string[] = [...story.coreConcepts] // copy of story vocab array
    // get length of choices
    const picLen: number = picLabels.length
    const audioLen: number = audioLabels.length
    // get a random number 
    const correctPic = Math.floor(Math.random() * picLen) 
    const correctAudio = Math.floor(Math.random() * audioLen)
    // get concept
    const currentConcept: string = question.concept
    const currentLabel: LabelEntry = langLabels[currentConcept]

    // populate correct answer
    if (question.mode === 0) {
        const randCorrectAudio: number = Math.floor(Math.random()*currentLabel.audio.length)
        const audioLabel: LabelAudio = currentLabel.audio[randCorrectAudio]

        audioChoices[correctAudio].src = `${vocabAudioPath}${audioLabel.filename}`
        audioRadio[correctAudio].value = currentConcept // add value to radio button
        audioChoices[correctAudio].load()
        const audioIndex: number =  wrongAnswers.indexOf(currentConcept)
        removeItem(wrongAnswers, audioIndex)
        // populate wrong answers
        audioChoices.forEach((audio: HTMLAudioElement, index: number) => {
            if (index === correctAudio) return

            const randomAudio: number = Math.floor(Math.random() * wrongAnswers.length)
                const audioString: string = wrongAnswers[randomAudio]
            audioRadio[index].value = langLabels[audioString].audio[randCorrectAudio].filename.split(".")[0]
            audio.src = `${vocabAudioPath}${langLabels[audioString].audio[randCorrectAudio].filename}`
            audio.load()
        })

        return correctAudio
    } else {
        const randCorrectImage: number = Math.floor(Math.random()*currentLabel.image.length)
        const imageLabel: LabelImage = currentLabel.image[randCorrectImage]

        picChoices[correctPic].src = `${imgPath1}${imageLabel.filename}`
        picRadio[correctPic].value = currentConcept // add value to radio button
        const imgIndex: number =  wrongAnswers.indexOf(currentConcept)
        removeItem(wrongAnswers, imgIndex)
        // populate wrong answers
        picChoices.forEach((img: HTMLImageElement, index: number) => {
            if (index === correctPic) return

            const randomPic = Math.floor(Math.random() * wrongAnswers.length)
                const picString: string = wrongAnswers[randomPic]
            picRadio[index].value = langLabels[picString].image[randCorrectImage].filename.split(".")[0]
            img.src = `${imgPath1}${langLabels[picString].image[randCorrectImage].filename}`
            img.alt = picString
        })

        return correctPic
    }
}

// shared variables
const storyCoreVocab: string[] = [...story.coreConcepts]
let currentQuestionIndex: number = -1
let correctAnsIndex: number = -1

// 5. construct tests
function reviewTest(testArr: string[]): void {
     if (testArr.length === 0) {
        console.log("All questions completed")
        return
    }

    resetRadios()

    currentQuestionIndex = randomIndex(testArr.length)

    let currentTestType: QuestionInfo = loadQuestion(testArr, currentQuestionIndex)

    correctAnsIndex = randomAnswer(currentTestType)
}

// helper function for tests
function resetRadios(): void {
    const radios = document.querySelectorAll<HTMLInputElement>(".review-answers input[type='radio']")
    radios.forEach(radio => {
        radio.checked = false
    })
}

// 6. wire submit button
const reviewForms: NodeListOf<HTMLFormElement> = document.querySelectorAll<HTMLFormElement>(".review-answers")!

function submit(): void {
    reviewForms.forEach((form) => {
        form.addEventListener("submit", (event) => {
            event.preventDefault()

            const reviewInputs = form.querySelectorAll<HTMLInputElement>(".review-answers input")
            const correctAnswer = reviewInputs[correctAnsIndex].value

            const groupName = reviewInputs[correctAnsIndex].name
            const userChoice = form.querySelector<HTMLInputElement>(`input[name="${groupName}"]:checked`)

            if (!userChoice) {
                console.log("No option selected")
                return
            }

            const userAnswer = userChoice.value

            if (userAnswer === correctAnswer) {
                console.log(`User chose the correct answer (${correctAnswer})`)
            } else {
                console.log(`User chose the wrong answer (${userAnswer}). It should be ${correctAnswer}`)
            }

            removeItem(storyCoreVocab, currentQuestionIndex)

            if (storyCoreVocab.length === 0) {
                console.log("Test complete!")
                return
            }

            reviewTest(storyCoreVocab)
        })
    })     
}

submit()
reviewTest(storyCoreVocab)

