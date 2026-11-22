# Hanyu 汉语

Learn Mandarin Chinese along the HSK 3.0 syllabus. Hanyu is a personal learning app that installs on the home screen like a native app. It is designed for iPad and iPhone, runs just as well on desktop, and is written in plain JavaScript with no framework and no build step.

**Open the app:** https://philipp1403.github.io/Chinesisch-Lernen-App/ (German interface)

## What you can do with it

- Work through 24 HSK 1 lessons with 286 example sentences, each with pinyin and audio.
- Practise with matching pairs, cloze, translation, listening, tone training, sentence building, dictation, speaking and character writing.
- Review with flashcards on a spaced-repetition ladder from 1 minute up to 4 months.
- Write characters stroke by stroke with Hanzi Writer.
- Get your pronunciation scored with Azure Speech (optional, you bring your own key).
- Watch the Oriental Pearl Tower fill up as you learn.
- Look up a word list for HSK 1 to 6 with 5,400 words. Lessons exist for HSK 1 so far.

## Built for daily use

- Works offline as a PWA with a service worker.
- Your progress stays on your device. Optional sync merges it between devices through a private GitHub Gist in your own account.
- Optional passcode lock. The repo only holds a hash, never the passcode.
- Keys and tokens are stored encrypted on the device and are never part of this repo.

## How it is made

Vanilla JavaScript, HTML and CSS. Tested with Playwright browser tests at iPad and iPhone widths and linted with ESLint. I developed it iteratively with Claude Code (AI-assisted).

## Run it locally

```
python3 -m http.server 8000
```

Then open http://localhost:8000. Microphone and offline mode need HTTPS, which GitHub Pages provides. More setup notes in German are in `README.txt`.

## Credits

[Hanzi Writer](https://hanziwriter.org) for stroke animations and the [Azure Speech SDK](https://github.com/Azure-Samples/cognitive-services-speech-sdk) (MIT, license file included) for pronunciation scoring.
