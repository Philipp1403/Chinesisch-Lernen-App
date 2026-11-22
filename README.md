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

## What you need

- **Lessons, exercises, flashcards and writing:** nothing. Open the app in a browser. On iPad or iPhone, open it in Safari and choose Share, then Add to Home Screen.
- **Pronunciation scoring:** a free Azure Speech resource (Free F0 tier) from your own Azure account. You enter its key and region in the app settings. Without it, the app falls back to the speech recognition of your browser.
- **Sync between devices (optional):** a GitHub token from your own account with the Gists permission set to read and write.
- **Passcode lock (optional):** a passcode you set yourself. Details are in `README.txt` (German).

## Built for daily use

- Works offline as a PWA with a service worker.
- Your progress stays on your device. Optional sync merges it between devices through a private GitHub Gist in your own account.
- Optional passcode lock. The repo only holds a hash, never the passcode.
- Keys and tokens stay on your device, encrypted when the passcode lock is on, and are never part of this repo.

## How it is made

Vanilla JavaScript, HTML and CSS. Tested with Playwright browser tests at iPad and iPhone widths and linted with ESLint. I developed it iteratively with Claude Code (AI-assisted).

## Credits

[Hanzi Writer](https://hanziwriter.org) for stroke animations and the [Azure Speech SDK](https://github.com/Azure-Samples/cognitive-services-speech-sdk) (MIT, license file included) for pronunciation scoring.
