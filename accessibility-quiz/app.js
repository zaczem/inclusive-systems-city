var allQuestions = [];
var roundQuestions = [];
var currentIndex = 0;
var score = 0;
var answers = [];
var selectedDifficulty = 0;

function focusWithoutScroll(element) {
  if (!element || typeof element.focus !== "function") {
    return;
  }

  try {
    element.focus({ preventScroll: true });
  } catch (error) {
    element.focus();
  }
}

function announceStatus(message) {
  var region = document.getElementById("status-region");
  if (region) {
    region.textContent = message;
  }
}

async function loadQuestions() {
  var response = await fetch("questions.json");
  allQuestions = await response.json();
}

function shuffle(arr) {
  var copy = arr.slice();
  for (var i = copy.length - 1; i > 0; i -= 1) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

function prepareQuestionForRound(question) {
  var choices = question.choices.map(function (choiceText, index) {
    return {
      text: choiceText,
      isCorrect: index === question.correct,
    };
  });

  var shuffledChoices = shuffle(choices);
  return {
    id: question.id,
    level: question.level,
    difficulty: question.difficulty,
    theme: question.theme,
    principle: question.principle,
    wcag: question.wcag,
    question: question.question,
    explanation: question.explanation,
    learning_objective: question.learning_objective,
    choices: shuffledChoices.map(function (choice) {
      return choice.text;
    }),
    correct: shuffledChoices.findIndex(function (choice) {
      return choice.isCorrect;
    }),
  };
}

function updateDifficultyCounts() {
  [1, 2, 3].forEach(function (difficulty) {
    var count = allQuestions.filter(function (question) {
      return question.difficulty === difficulty;
    }).length;
    var element = document.getElementById("count-" + difficulty);
    if (element) {
      element.textContent = count + " questions";
    }
  });
}

function selectDifficulty(diff) {
  selectedDifficulty = diff;
  document.querySelectorAll(".diff-btn").forEach(function (button) {
    button.classList.toggle("selected", Number(button.dataset.difficulty) === diff);
  });
  var startButton = document.getElementById("start-btn");
  startButton.disabled = false;
  startButton.textContent = "Start Quiz";
  announceStatus("Difficulty " + diff + " selected.");
}

function startQuiz() {
  if (!selectedDifficulty) {
    return;
  }

  var pool = allQuestions.filter(function (question) {
    return question.difficulty === selectedDifficulty;
  });
  var count = Math.min(10, pool.length);

  roundQuestions = shuffle(pool).slice(0, count).map(prepareQuestionForRound);
  currentIndex = 0;
  score = 0;
  answers = [];

  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("results-screen").classList.add("hidden");
  document.getElementById("quiz-screen").classList.remove("hidden");

  renderQuestion();
  announceStatus("Quiz started with " + count + " questions.");
}

function renderQuestion() {
  var questionData = roundQuestions[currentIndex];
  var total = roundQuestions.length;
  document.getElementById("score-bar").textContent = "Score: " + score + " / " + currentIndex;

  var progressElement = document.getElementById("progress");
  progressElement.innerHTML = "";
  for (var i = 0; i < total; i += 1) {
    var dot = document.createElement("div");
    dot.className = "progress-dot";
    if (i < answers.length) {
      dot.classList.add(answers[i].correct ? "correct" : "wrong");
    } else if (i === currentIndex) {
      dot.classList.add("current");
    }
    progressElement.appendChild(dot);
  }

  var metaTagsElement = document.getElementById("meta-tags");
  metaTagsElement.innerHTML = "";
  [
    ["tag-theme", questionData.theme],
    ["tag-principle", questionData.principle],
    ["tag-wcag", questionData.wcag],
  ].forEach(function (metaEntry) {
    var tag = document.createElement("span");
    tag.className = "tag " + metaEntry[0];
    tag.textContent = metaEntry[1];
    metaTagsElement.appendChild(tag);
  });

  var questionElement = document.getElementById("question");
  questionElement.textContent = questionData.question;

  var choicesElement = document.getElementById("choices");
  choicesElement.innerHTML = "";
  questionData.choices.forEach(function (choiceText, index) {
    var button = document.createElement("button");
    button.className = "choice-btn";
    button.type = "button";
    button.textContent = choiceText;
    button.addEventListener("click", function () {
      selectAnswer(index);
    });
    choicesElement.appendChild(button);
  });

  document.getElementById("explanation").classList.add("hidden");
  document.getElementById("next-btn").classList.add("hidden");
  focusWithoutScroll(questionElement);
}

function selectAnswer(chosen) {
  var questionData = roundQuestions[currentIndex];
  var total = roundQuestions.length;
  var isCorrect = chosen === questionData.correct;

  if (isCorrect) {
    score += 1;
  }

  answers.push({ correct: isCorrect, theme: questionData.theme });

  document.querySelectorAll(".choice-btn").forEach(function (button, index) {
    button.disabled = true;
    if (index === chosen && isCorrect) {
      button.classList.add("selected-correct");
    }
    if (index === chosen && !isCorrect) {
      button.classList.add("selected-wrong");
    }
    if (index === questionData.correct && !isCorrect) {
      button.classList.add("reveal-correct");
    }
  });

  var explanationElement = document.getElementById("explanation");
  explanationElement.innerHTML = "";
  var explanationText = document.createElement("div");
  explanationText.textContent = questionData.explanation;
  var learningObjective = document.createElement("div");
  learningObjective.className = "learning-objective";
  learningObjective.textContent = "Learning objective: " + questionData.learning_objective;
  explanationElement.appendChild(explanationText);
  explanationElement.appendChild(learningObjective);
  explanationElement.classList.remove("hidden");

  var nextButton = document.getElementById("next-btn");
  nextButton.textContent = currentIndex < total - 1 ? "Next Question" : "See Results";
  nextButton.classList.remove("hidden");
  focusWithoutScroll(nextButton);

  var dots = document.querySelectorAll(".progress-dot");
  if (dots[currentIndex]) {
    dots[currentIndex].className = "progress-dot " + (isCorrect ? "correct" : "wrong");
  }

  document.getElementById("score-bar").textContent = "Score: " + score + " / " + (currentIndex + 1);
  announceStatus(isCorrect ? "Correct answer selected." : "Incorrect answer selected.");
}

function showResults() {
  document.getElementById("quiz-screen").classList.add("hidden");
  document.getElementById("results-screen").classList.remove("hidden");

  var total = roundQuestions.length;
  var themeStats = {};

  answers.forEach(function (answer) {
    if (!themeStats[answer.theme]) {
      themeStats[answer.theme] = { correct: 0, total: 0 };
    }
    themeStats[answer.theme].total += 1;
    if (answer.correct) {
      themeStats[answer.theme].correct += 1;
    }
  });

  var pct = total ? score / total : 0;
  var scoreClass = pct >= 0.8 ? "score-good" : pct >= 0.5 ? "score-ok" : "score-bad";
  var needsPractice = Object.entries(themeStats)
    .filter(function (entry) {
      return entry[1].correct < entry[1].total;
    })
    .sort(function (a, b) {
      return (a[1].correct / a[1].total) - (b[1].correct / b[1].total);
    });

  var html =
    "<h2>Quiz Complete!</h2>" +
    '<div class="big-score ' + scoreClass + '">' + score + ' <span class="total">/ ' + total + "</span></div>" +
    '<div class="themes-section"><h3>Performance by Theme</h3>';

  Object.entries(themeStats)
    .sort(function (a, b) {
      return (a[1].correct / a[1].total) - (b[1].correct / b[1].total);
    })
    .forEach(function (entry) {
      var theme = entry[0];
      var stats = entry[1];
      var themePct = Math.round((stats.correct / stats.total) * 100);
      var themeClass = themePct === 100 ? "good" : themePct >= 50 ? "needs-work" : "bad";
      html +=
        '<div class="theme-item"><span>' + theme + '</span><span class="theme-score ' + themeClass + '">' +
        stats.correct + "/" + stats.total + "</span></div>";
    });

  html += "</div>";

  if (needsPractice.length > 0) {
    html += '<div class="practice-note">Focus on: ' +
      needsPractice.map(function (entry) { return entry[0]; }).join(", ") +
      "</div>";
  }

  html += '<button class="start-btn" id="play-again-btn" type="button">Play Again</button>';

  document.getElementById("results").innerHTML = html;
  document.getElementById("play-again-btn").addEventListener("click", showStartScreen);
  announceStatus("Quiz complete. Final score: " + score + " out of " + total + ".");
}

function showStartScreen() {
  document.getElementById("results-screen").classList.add("hidden");
  document.getElementById("quiz-screen").classList.add("hidden");
  document.getElementById("start-screen").classList.remove("hidden");
  updateDifficultyCounts();
  announceStatus("Returned to start screen.");
}

document.getElementById("difficulty-selector").addEventListener("click", function (event) {
  var button = event.target.closest(".diff-btn");
  if (button) {
    selectDifficulty(Number(button.dataset.difficulty));
  }
});

document.getElementById("start-btn").addEventListener("click", async function () {
  if (!allQuestions.length) {
    await loadQuestions();
  }
  updateDifficultyCounts();
  startQuiz();
});

document.getElementById("next-btn").addEventListener("click", function () {
  currentIndex += 1;
  if (currentIndex < roundQuestions.length) {
    renderQuestion();
  } else {
    showResults();
  }
});

loadQuestions()
  .then(updateDifficultyCounts)
  .catch(function () {
    announceStatus("Unable to load quiz questions.");
    var startButton = document.getElementById("start-btn");
    startButton.textContent = "Questions failed to load";
    startButton.disabled = true;
  });
