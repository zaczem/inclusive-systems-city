import { test, expect } from '@playwright/test';

test.describe('Accessibility Quiz', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for questions to load (counts appear)
    await expect(page.locator('#count-1')).not.toBeEmpty();
  });

  test('shows start screen with difficulty selector and disabled start button', async ({ page }) => {
    await expect(page.locator('#start-screen')).toBeVisible();
    await expect(page.locator('.diff-btn')).toHaveCount(3);
    await expect(page.locator('#start-btn')).toBeDisabled();
    await expect(page.locator('#quiz-screen')).toBeHidden();
    await expect(page.locator('#results-screen')).toBeHidden();
  });

  test('difficulty buttons show question counts', async ({ page }) => {
    const count1 = await page.locator('#count-1').textContent();
    const count2 = await page.locator('#count-2').textContent();
    const count3 = await page.locator('#count-3').textContent();
    expect(count1).toMatch(/\d+ questions/);
    expect(count2).toMatch(/\d+ questions/);
    expect(count3).toMatch(/\d+ questions/);
  });

  test('selecting difficulty enables start button', async ({ page }) => {
    await page.locator('.diff-btn[data-difficulty="1"]').click();
    await expect(page.locator('.diff-btn[data-difficulty="1"]')).toHaveClass(/selected/);
    await expect(page.locator('#start-btn')).toBeEnabled();
    await expect(page.locator('#start-btn')).toHaveText('Start Quiz');
  });

  test('switching difficulty updates selection', async ({ page }) => {
    await page.locator('.diff-btn[data-difficulty="1"]').click();
    await page.locator('.diff-btn[data-difficulty="2"]').click();
    await expect(page.locator('.diff-btn[data-difficulty="1"]')).not.toHaveClass(/selected/);
    await expect(page.locator('.diff-btn[data-difficulty="2"]')).toHaveClass(/selected/);
  });

  test('starting quiz shows quiz screen with meta tags', async ({ page }) => {
    await page.locator('.diff-btn[data-difficulty="1"]').click();
    await page.locator('#start-btn').click();
    await expect(page.locator('#quiz-screen')).toBeVisible();
    await expect(page.locator('#start-screen')).toBeHidden();
    await expect(page.locator('.choice-btn')).toHaveCount(2);
    // Meta tags: theme, principle, wcag
    await expect(page.locator('.tag-theme')).toBeVisible();
    await expect(page.locator('.tag-principle')).toBeVisible();
    await expect(page.locator('.tag-wcag')).toBeVisible();
  });

  test('questions match selected difficulty', async ({ page }) => {
    await page.locator('.diff-btn[data-difficulty="2"]').click();
    await page.locator('#start-btn').click();
    await expect(page.locator('.choice-btn').first()).toBeVisible();

    // Check all round questions match difficulty 2
    const allMatchDifficulty = await page.evaluate(() =>
      roundQuestions.every(q => q.difficulty === 2)
    );
    expect(allMatchDifficulty).toBe(true);
  });

  test('selecting an answer shows explanation with learning objective', async ({ page }) => {
    await page.locator('.diff-btn[data-difficulty="1"]').click();
    await page.locator('#start-btn').click();
    await expect(page.locator('.choice-btn').first()).toBeVisible();

    await page.locator('.choice-btn').first().click();

    await expect(page.locator('#explanation')).toBeVisible();
    await expect(page.locator('.learning-objective')).toBeVisible();
    const loText = await page.locator('.learning-objective').textContent();
    expect(loText).toContain('Learning objective:');
    await expect(page.locator('#next-btn')).toBeVisible();

    // Buttons disabled
    await expect(page.locator('.choice-btn').nth(0)).toBeDisabled();
    await expect(page.locator('.choice-btn').nth(1)).toBeDisabled();
  });

  test('correct answer gets green styling', async ({ page }) => {
    await page.locator('.diff-btn[data-difficulty="1"]').click();
    await page.locator('#start-btn').click();
    await expect(page.locator('.choice-btn').first()).toBeVisible();

    const correctIndex = await page.evaluate(() => roundQuestions[0].correct);
    await page.locator('.choice-btn').nth(correctIndex).click();
    await expect(page.locator('.choice-btn').nth(correctIndex)).toHaveClass(/selected-correct/);
  });

  test('wrong answer gets red styling and reveals correct', async ({ page }) => {
    await page.locator('.diff-btn[data-difficulty="1"]').click();
    await page.locator('#start-btn').click();
    await expect(page.locator('.choice-btn').first()).toBeVisible();

    const correctIndex = await page.evaluate(() => roundQuestions[0].correct);
    const wrongIndex = correctIndex === 0 ? 1 : 0;
    await page.locator('.choice-btn').nth(wrongIndex).click();
    await expect(page.locator('.choice-btn').nth(wrongIndex)).toHaveClass(/selected-wrong/);
    await expect(page.locator('.choice-btn').nth(correctIndex)).toHaveClass(/reveal-correct/);
  });

  test('progress dots update after answering', async ({ page }) => {
    await page.locator('.diff-btn[data-difficulty="1"]').click();
    await page.locator('#start-btn').click();
    await expect(page.locator('.choice-btn').first()).toBeVisible();

    await expect(page.locator('.progress-dot').first()).toHaveClass(/current/);
    await page.locator('.choice-btn').first().click();
    const firstDotClass = await page.locator('.progress-dot').first().getAttribute('class');
    expect(firstDotClass).toMatch(/correct|wrong/);
  });

  test('can navigate through all questions to results', async ({ page }) => {
    await page.locator('.diff-btn[data-difficulty="1"]').click();
    await page.locator('#start-btn').click();
    await expect(page.locator('.choice-btn').first()).toBeVisible();

    const count = await page.evaluate(() => roundQuestions.length);
    for (let i = 0; i < count; i++) {
      await expect(page.locator('.choice-btn').first()).toBeVisible();
      await page.locator('.choice-btn').first().click();
      await expect(page.locator('#next-btn')).toBeVisible();
      if (i < count - 1) {
        await expect(page.locator('#next-btn')).toHaveText('Next Question');
      } else {
        await expect(page.locator('#next-btn')).toHaveText('See Results');
      }
      await page.locator('#next-btn').click();
    }

    await expect(page.locator('#results-screen')).toBeVisible();
    await expect(page.locator('#quiz-screen')).toBeHidden();
  });

  test('results screen shows score, themes, and play again button', async ({ page }) => {
    await page.locator('.diff-btn[data-difficulty="1"]').click();
    await page.locator('#start-btn').click();
    await expect(page.locator('.choice-btn').first()).toBeVisible();

    const count = await page.evaluate(() => roundQuestions.length);
    for (let i = 0; i < count; i++) {
      await page.locator('.choice-btn').first().click();
      await page.locator('#next-btn').click();
    }

    await expect(page.locator('.big-score')).toBeVisible();
    await expect(page.locator('.themes-section')).toBeVisible();
    await expect(page.locator('.theme-item').first()).toBeVisible();
    await expect(page.locator('#results-screen .start-btn')).toHaveText('Play Again');
  });

  test('play again returns to start screen with difficulty selector', async ({ page }) => {
    await page.locator('.diff-btn[data-difficulty="1"]').click();
    await page.locator('#start-btn').click();
    await expect(page.locator('.choice-btn').first()).toBeVisible();

    const count = await page.evaluate(() => roundQuestions.length);
    for (let i = 0; i < count; i++) {
      await page.locator('.choice-btn').first().click();
      await page.locator('#next-btn').click();
    }

    await page.locator('#results-screen .start-btn').click();
    await expect(page.locator('#start-screen')).toBeVisible();
    await expect(page.locator('.diff-btn')).toHaveCount(3);
  });

  test('score updates correctly when answering all correct', async ({ page }) => {
    await page.locator('.diff-btn[data-difficulty="1"]').click();
    await page.locator('#start-btn').click();
    await expect(page.locator('.choice-btn').first()).toBeVisible();

    const count = await page.evaluate(() => roundQuestions.length);
    for (let i = 0; i < count; i++) {
      const correctIndex = await page.evaluate(() => roundQuestions[currentIndex].correct);
      await page.locator('.choice-btn').nth(correctIndex).click();
      await page.locator('#next-btn').click();
    }

    const scoreText = await page.locator('.big-score').textContent();
    expect(scoreText).toContain(String(count));
  });

  test('score updates correctly when answering all wrong', async ({ page }) => {
    await page.locator('.diff-btn[data-difficulty="1"]').click();
    await page.locator('#start-btn').click();
    await expect(page.locator('.choice-btn').first()).toBeVisible();

    const count = await page.evaluate(() => roundQuestions.length);
    for (let i = 0; i < count; i++) {
      const correctIndex = await page.evaluate(() => roundQuestions[currentIndex].correct);
      const wrongIndex = correctIndex === 0 ? 1 : 0;
      await page.locator('.choice-btn').nth(wrongIndex).click();
      await page.locator('#next-btn').click();
    }

    const scoreText = await page.locator('.big-score').textContent();
    expect(scoreText).toMatch(/^0/);
  });

  test('questions are randomized between rounds', async ({ page }) => {
    const questions = [];
    for (let round = 0; round < 4; round++) {
      await page.locator('.diff-btn[data-difficulty="3"]').click();
      await page.locator('#start-btn').click();
      await expect(page.locator('.choice-btn').first()).toBeVisible();

      questions.push(await page.locator('#question').textContent());

      const count = await page.evaluate(() => roundQuestions.length);
      for (let i = 0; i < count; i++) {
        await page.locator('.choice-btn').first().click();
        await page.locator('#next-btn').click();
      }
      await page.locator('#results-screen .start-btn').click();
    }

    const unique = new Set(questions);
    expect(unique.size).toBeGreaterThan(1);
  });

  test('each difficulty level filters correctly', async ({ page }) => {
    for (const diff of [1, 2, 3]) {
      await page.locator(`.diff-btn[data-difficulty="${diff}"]`).click();
      await page.locator('#start-btn').click();
      await expect(page.locator('.choice-btn').first()).toBeVisible();

      const allMatch = await page.evaluate((d) =>
        roundQuestions.every(q => q.difficulty === d), diff
      );
      expect(allMatch).toBe(true);

      // Go back to start
      const count = await page.evaluate(() => roundQuestions.length);
      for (let i = 0; i < count; i++) {
        await page.locator('.choice-btn').first().click();
        await page.locator('#next-btn').click();
      }
      await page.locator('#results-screen .start-btn').click();
    }
  });

});
