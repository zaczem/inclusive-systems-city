# Accessibility Quiz

A web-based quiz that tests your knowledge of web accessibility best practices and WCAG standards. Choose from three difficulty levels and answer questions covering color contrast, ARIA, keyboard navigation, and more.

## Usage

```bash
npm install
npm run start
```

Open http://localhost:3999 in your browser.

If you want the same launch flow as the other games in this workspace, you can also run:

```bash
./Start\ Accessibility\ Quiz.command
```

1. Select a difficulty level (Beginner, Intermediate, or Advanced)
2. Answer up to 10 multiple-choice questions
3. Read the explanation and learning objective after each answer
4. Review your score and per-theme breakdown on the results screen

## Development

**Tech stack:** Vanilla JS, HTML5, CSS3, served locally with `serve`.

**Project structure:**

```
index.html                         # App markup
styles.css                         # Shared quiz styling
app.js                             # Quiz state and rendering logic
questions.json                     # Question database (20 questions across 3 difficulty levels)
quiz.test.js                       # Playwright end-to-end tests
playwright.config.js               # Test configuration (auto-starts server on port 3999)
Start Accessibility Quiz.command   # Double-click launcher
Run Accessibility Quiz Tests.command # Local test runner
```

**Run tests:**

```bash
npx playwright test
```

Playwright is configured to start the dev server automatically before running tests.

Or use:

```bash
./Run\ Accessibility\ Quiz\ Tests.command
```

**Adding questions:** Edit `questions.json`. Each question needs an `id`, `difficulty` (1–3), `theme`, `principle`, `wcag` reference, two `choices`, the `correct`, an `explanation`, and a `learning_objective`.

## FAQ

**How are questions selected?**
Questions are filtered by the chosen difficulty level, shuffled randomly, and capped at 10 per round.

**Is there a backend?**
No. The app runs entirely in the browser. `serve` is used only for static file serving.

**How is scoring calculated?**
Your score is the number of correct answers out of total questions. The results screen also breaks down performance by theme.

**Can I add more difficulty levels?**
The UI and logic support difficulties 1–3. To add more, you'd need to update the difficulty selector in `index.html` and add questions with the new difficulty value in `questions.json`.
