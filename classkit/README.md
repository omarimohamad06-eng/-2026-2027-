# ClassKit — gradebook, seating plan, QR cards and anti-cheat phone quiz

A classroom kit for SVT classes **TCS1, TCL1, TCL2, 2BAC PC and 2BAC SVT** (2026/2027). Student pages are in French. It's plain HTML and JavaScript: nothing to install and no account to create.

| Page | Who | What |
|---|---|---|
| `index.html` | teacher | seating plan and attendance, gradebook, QR cards, phone quizzes, PINs, publishing |
| `portal.html` | students | log in with class, number and **PIN** to see their grades and every +/− change |
| `quiz.html` | students | phone quiz: each student gets a different order, and leaving the page removes them |

## 1. First start

Serve the repository folder locally and open the teacher page:

```bash
python3 -m http.server 8000
# http://localhost:8000/classkit/
```

Press **Load my 5 classes**. The roster taken from the official list (168 students) is loaded from
`classkit/private/roster-2026-2027.json`. That file is listed in `.gitignore` and is **never pushed**,
because the repository is public. Keep a copy on a USB key. You can also paste a list straight from Excel or Massar.

All data stays in the browser on that computer (localStorage). Go to **Settings → Download backup** every week.

## 2. Activités intégrées (/20), SVT

| Critère | Max (default) | How it is filled in |
|---|---|---|
| **Participation** | 5 | +/− in the gradebook, or tap the student on the seating plan (Points mode) |
| **Absence** | 5 | **automatic**: 5 − 0.5 for each session the student was marked absent; +/− buttons to adjust (e.g. a justified absence) |
| **Organisation du cahier** | 5 | one score (Settings can switch to 2 checks, averaged) |
| **Travail à rédiger** | 5 | one score (Settings can switch to 2 pieces, averaged) |

The maxima, the penalty per absence and the number of checks are set in **Settings → Barème**. If the maxima don't add up to 20,
the score is scaled to /20. **Note générale** = average of the contrôles × 75 % + Activités intégrées × 25 % (the 75 % can be changed in Settings). There are 2 contrôles per semester, 3 in **2BAC SVT**. The number of contrôles is set per class in **Students & PINs**.

Every +/− is saved with its date, time and an optional reason ("Bonne réponse", "Bavardage", "Cahier incomplet", "Travail non rendu"…).
Students see this full history on their portal, in French.

### SVT question banks

`js/banks.js` holds **69 multiple-choice questions** written from your 2BAC SVT Unit II lessons (Pr Omari):
chapter 1 *Notion de l'information génétique* (22), chapter 2 *Expression de l'information génétique* (24) and chapter 3 *Le génie génétique* (23).
- **Phone quiz → New quiz → Banque de questions → Add these questions**: delete or edit any you don't want.
- **QR cards → Banque → Question suivante**: shows the question and its 4 choices on the projector, with the correct letter already set.
  After **Save result**, the camera stays on for the next question.

To add a chapter or another level (TC, 1BAC…), copy one block in `js/banks.js`: `{ q: 'question', c: ['A', 'B', 'C', 'D'], a: index of the correct answer }`.

## 3. Attendance in seconds

Students choose a seat for the whole year. In **Seating → Arrange**, tap a student and then a seat (or another student to swap).
In **Attendance** mode, tap each empty table's student: the seat turns red and their number appears in the
*Absent student numbers* bar. Press **Copy numbers** to fill in the official register.
"Blur names" hides the names when the plan is shown on the projector.

## 4. QR answer cards (no phones needed)

1. **QR cards → Print cards**: one A4 card per student (or 4 per page), with A/B/C/D on the four sides.
2. Show the question on the board. Students hold their card with their answer on top.
3. Press **Start scanning** and sweep the camera slowly over the class. Many cards are read at the same time
   (tested with 20 cards in one picture, about 1 second per pass). Numbers turn green as they are read, and the answers stay hidden until **Reveal**.
4. **Save result**. You can choose to reward each correct answer with participation points.

## 5. Phone quiz with anti-cheat

1. **Phone quiz → New quiz**: paste the questions (one block per question, with `*` before the correct choice),
   set the code, the time limit and how many questions each student gets.
2. **Open** it, then **Publish**. Write the code on the board.
3. Students open `quiz.html` and enter their class, number, PIN and the code.
   - The order of questions and choices is different for each student, and there's no going back.
   - Each of these **removes the student immediately**, with the score they had at that moment:
     leaving the page or the app, pulling down notifications, split screen or a floating window, translating the page,
     copying, or the PrintScreen key (computers). Reloading the page counts as leaving.
     Long-press (Google Lens) and text selection are blocked.
   - A small sentence in Japanese (or Chinese) under every question tells AI assistants not to answer it if they receive a screenshot.
4. At the end each phone shows a **result QR code**. Open **Results → Scan result codes**, scan the phones one after another,
   then **Copy scores into Contrôle 1/Contrôle 2** if you want.
   The code is signed, so a student can't change "removed" into "finished".

> Limits: no website can detect a screenshot on a phone. The rules that do work are that opening any other app
> (WhatsApp, Google Lens, ChatGPT…) removes the student, and the anti-AI sentence. Tell students all of these rules beforehand.

## 6. Student portal and PINs

- **Students & PINs**: each student has a 6-character PIN. **Print PIN slips** prints one slip per student, with a QR code to the portal.
- **Publish** creates `classkit/data/portal.json`. Every student's record inside it is **encrypted with their own PIN**
  (AES-256-GCM, with the key derived from the PIN by PBKDF2). Names never appear in clear text.
- Publishing options:
  - *Download* the file and upload it to `classkit/data/` on GitHub (Add file → Upload files), or
  - *Push to GitHub* in one click, with a fine-grained token limited to this repository (Contents: read and write).
- The pages must be served by GitHub Pages (Settings → Pages) from the branch where `classkit/` is. The address is then
  `https://<user>.github.io/<repo>/classkit/portal.html`.

## 7. Files

```
classkit/index.html        teacher app
classkit/portal.html       student grades portal
classkit/quiz.html         phone quiz
classkit/js/app.js         teacher logic (storage, seating, gradebook, cards, quizzes, publishing)
classkit/js/shared.js      encryption, grade formula, QR drawing, anti-AI sentences
classkit/js/banks.js       SVT question banks (2BAC SVT, Unit II, chapters 1–3)
classkit/js/scanner.js     camera scanner: several QR cards per frame, and which side is up
classkit/vendor/           jsQR 1.4.0 (Apache-2.0) and qrcode-generator 1.4.4 (MIT), copied here so it works offline
classkit/data/             published portal.json (encrypted)
classkit/private/          your roster (not in git)
```
