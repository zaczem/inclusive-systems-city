var allQuestions = [];
var roundQuestions = [];
var currentIndex = 0;
var score = 0;
var answers = [];
var selectedDifficulty = 0;
var selectedSession = null;
var PREFERENCES_KEY = "accessibility_quiz_preferences_v1";
var QUIZ_DATA_KEY = "accessibility_quiz_data_v1";
var MASTERY_KEY = "accessibility_quiz_mastery_v1";
var CONSENT_KEY = "accessibility_quiz_consent_v1";
var preferences = {
  highContrast: false,
  enhancedReadability: false,
  fontScale: 100,
};
var resultSummary = null;
var speechSupported = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
var voicesReady = false;
var quizData = {
  answers: [],
  score: 0,
  themes: {},
  finalScore: null,
};

function collapsePreferences() {
  var menu = document.getElementById("preferences-menu");
  if (menu) menu.removeAttribute("open");
}

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

function stopSpeech() {
  if (speechSupported) {
    window.speechSynthesis.cancel();
  }
}

function getEnglishVoice() {
  if (!speechSupported) {
    return null;
  }

  var voices = window.speechSynthesis.getVoices();
  return voices.find(function (voice) {
    return voice.lang && voice.lang.toLowerCase().startsWith("en");
  }) || null;
}

function initSpeech() {
  if (!speechSupported) {
    return;
  }

  function refreshVoices() {
    window.speechSynthesis.getVoices();
  }

  refreshVoices();
  window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
}

function speakText(text) {
  if (!speechSupported || !text) {
    return;
  }

  stopSpeech();
  var utterance = new window.SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  var voice = getEnglishVoice();
  if (voice) {
    utterance.voice = voice;
  }
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function getCurrentQuizSpeechText() {
  if (!roundQuestions.length || currentIndex >= roundQuestions.length) {
    return "";
  }

  var questionData = roundQuestions[currentIndex];
  var parts = [
    "Question " + (currentIndex + 1) + " of " + roundQuestions.length + ".",
    "Criterion: " + questionData.wcag + ".",
    "Principle: " + questionData.principle + ".",
    "Theme: " + questionData.theme + ".",
  ];

  if (questionData.wcag_extract) {
    parts.push("Normative text: " + questionData.wcag_extract);
  }

  parts.push(questionData.question);
  parts.push("Options:");

  questionData.choices.forEach(function (choiceText, index) {
    parts.push("Option " + (index + 1) + ". " + choiceText + ".");
  });

  var explanationElement = document.getElementById("explanation");
  if (explanationElement && !explanationElement.classList.contains("hidden")) {
    parts.push(explanationElement.textContent.trim());
  }

  return parts.join(" ");
}

function getResultsSpeechText() {
  var resultsElement = document.getElementById("results");
  if (!resultsElement) {
    return "";
  }

  return resultsElement.innerText.replace(/\s+/g, " ").trim();
}

function formatToggle(button, label, on) {
  button.setAttribute("aria-pressed", String(on));
  button.textContent = label + ": " + (on ? "On" : "Off");
}

function loadPreferences() {
  try {
    var raw = window.localStorage.getItem(PREFERENCES_KEY);
    if (!raw) {
      return;
    }
    var parsed = JSON.parse(raw);
    preferences = {
      highContrast: Boolean(parsed.highContrast),
      enhancedReadability: Boolean(parsed.enhancedReadability),
      fontScale: [100, 105, 110, 115, 120, 125, 130].indexOf(Number(parsed.fontScale)) >= 0
        ? Number(parsed.fontScale)
        : 100,
    };
  } catch (error) {
    preferences = {
      highContrast: false,
      enhancedReadability: false,
      fontScale: 100,
    };
  }
}

function savePreferences() {
  window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}

function applyPreferences() {
  document.body.classList.toggle("high-contrast", preferences.highContrast);
  document.body.classList.toggle("enhanced-readability", preferences.enhancedReadability);
  document.documentElement.style.setProperty("--font-scale", preferences.fontScale + "%");

  var highContrastButton = document.getElementById("toggle-high-contrast");
  var readabilityButton = document.getElementById("toggle-enhanced-readability");
  var fontScaleInput = document.getElementById("font-scale");
  var fontScaleValue = document.getElementById("font-scale-value");

  formatToggle(highContrastButton, "High Contrast Theme", preferences.highContrast);
  formatToggle(readabilityButton, "Enhanced Readability Mode", preferences.enhancedReadability);
  fontScaleInput.value = String(preferences.fontScale);
  fontScaleValue.textContent = preferences.fontScale + "%";
}

function updatePreference(key, value) {
  preferences[key] = value;
  savePreferences();
  applyPreferences();
}

function saveQuizData() {
  window.localStorage.setItem(QUIZ_DATA_KEY, JSON.stringify(quizData));
}

function resetQuizData() {
  quizData = {
    answers: [],
    score: 0,
    themes: {},
    finalScore: null,
  };
  saveQuizData();
}

function buildThemesPerformance() {
  var themes = {};
  quizData.answers.forEach(function (entry) {
    if (!themes[entry.theme]) {
      themes[entry.theme] = { correct: 0, incorrect: 0, total: 0 };
    }
    themes[entry.theme].total += 1;
    if (entry.correct) {
      themes[entry.theme].correct += 1;
    } else {
      themes[entry.theme].incorrect += 1;
    }
  });
  return themes;
}

function updateQuizDataForAnswer(questionData, chosen, isCorrect) {
  var answerRecord = {
    questionId: questionData.id,
    timestamp: new Date().toISOString(),
    difficulty: questionData.difficulty,
    theme: questionData.theme,
    selectedAnswer: questionData.choices[chosen],
    selectedIndex: chosen,
    correctAnswer: questionData.choices[questionData.correct],
    correctIndex: questionData.correct,
    correct: isCorrect,
  };

  quizData.answers.push(answerRecord);
  quizData.score = score;
  quizData.finalScore = {
    correct: score,
    total: roundQuestions.length,
  };
  quizData.themes = buildThemesPerformance();
  saveQuizData();
}

function finalizeQuizData() {
  quizData.score = score;
  quizData.finalScore = {
    correct: score,
    total: roundQuestions.length,
  };
  quizData.themes = buildThemesPerformance();
  saveQuizData();
}

function getQuizData() {
  try {
    var raw = window.localStorage.getItem(QUIZ_DATA_KEY);
    return raw ? JSON.parse(raw) : {
      answers: [],
      score: 0,
      themes: {},
      finalScore: null,
    };
  } catch (error) {
    return {
      answers: [],
      score: 0,
      themes: {},
      finalScore: null,
    };
  }
}

// --- Mastery tracking ---
// Stores { "1.4.3 Contrast (Minimum)": { mastered: [12, 89], seen: [12, 45, 89] }, ... }
function loadMastery() {
  try {
    var raw = window.localStorage.getItem(MASTERY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveMastery(mastery) {
  window.localStorage.setItem(MASTERY_KEY, JSON.stringify(mastery));
}

function recordMastery(questionData, isCorrect) {
  var mastery = loadMastery();
  var key = questionData.wcag;
  if (!mastery[key]) {
    mastery[key] = { mastered: [], seen: [] };
  }
  if (mastery[key].seen.indexOf(questionData.id) < 0) {
    mastery[key].seen.push(questionData.id);
  }
  if (isCorrect && mastery[key].mastered.indexOf(questionData.id) < 0) {
    mastery[key].mastered.push(questionData.id);
  }
  // If answered incorrectly, remove from mastered
  if (!isCorrect) {
    mastery[key].mastered = mastery[key].mastered.filter(function (id) {
      return id !== questionData.id;
    });
  }
  saveMastery(mastery);
}

function pickSmartQuestion(candidates, mastery) {
  var key = candidates[0].wcag;
  var entry = mastery[key] || { mastered: [], seen: [] };

  // Priority 1: never seen
  var unseen = candidates.filter(function (q) {
    return entry.seen.indexOf(q.id) < 0;
  });
  if (unseen.length) {
    return unseen[Math.floor(Math.random() * unseen.length)];
  }

  // Priority 2: seen but not mastered
  var unmastered = candidates.filter(function (q) {
    return entry.mastered.indexOf(q.id) < 0;
  });
  if (unmastered.length) {
    return unmastered[Math.floor(Math.random() * unmastered.length)];
  }

  // All mastered — pick any
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function pickSmartPool(pool, count) {
  var mastery = loadMastery();
  var byCriterion = {};
  pool.forEach(function (q) {
    if (!byCriterion[q.wcag]) byCriterion[q.wcag] = [];
    byCriterion[q.wcag].push(q);
  });

  // Score each criterion: lower = more needed
  var criteriaScored = Object.keys(byCriterion).map(function (key) {
    var entry = mastery[key] || { mastered: [], seen: [] };
    var candidates = byCriterion[key];
    var unseenCount = candidates.filter(function (q) {
      return entry.seen.indexOf(q.id) < 0;
    }).length;
    var unmasteredCount = candidates.filter(function (q) {
      return entry.mastered.indexOf(q.id) < 0;
    }).length;
    return {
      key: key,
      candidates: candidates,
      score: unseenCount * 2 + unmasteredCount, // higher = more need
    };
  });

  // Sort by most needed first, then shuffle ties
  criteriaScored.sort(function (a, b) {
    return b.score - a.score || (Math.random() - 0.5);
  });

  var picked = [];
  var limit = Math.min(count, criteriaScored.length);
  for (var i = 0; i < limit; i++) {
    picked.push(pickSmartQuestion(criteriaScored[i].candidates, mastery));
  }

  // If we need more than criteria count, fill from remaining pool
  if (count > picked.length) {
    var pickedIds = picked.map(function (q) { return q.id; });
    var remaining = shuffle(pool.filter(function (q) {
      return pickedIds.indexOf(q.id) < 0;
    }));
    picked = picked.concat(remaining.slice(0, count - picked.length));
  }

  return shuffle(picked);
}

function getThemeInsight(theme) {
  var insights = {
    "Time Limits": {
      meaning: "Users may need more time to read, think, or type.",
      question: "Would this still work for someone who needs more time?",
    },
    "Use of Color": {
      meaning: "Important meaning should not depend on color alone.",
      question: "If color disappeared, would the message still be clear?",
    },
    "Keyboard Use": {
      meaning: "Core actions should work without a mouse.",
      question: "Can this task be completed with keyboard only?",
    },
    "Focus Management": {
      meaning: "Focus should move to the active part of the interface.",
      question: "When the screen changes, where does focus go?",
    },
    "Custom Controls": {
      meaning: "Custom controls should behave like standard ones.",
      question: "Does this control act the way users expect?",
    },
    "Color Contrast": {
      meaning: "Text should stay readable against its background.",
      question: "Can users still read this in low contrast conditions?",
    },
    "Alt Text": {
      meaning: "Images need text that explains their purpose.",
      question: "If the image is not seen, does the meaning remain?",
    },
    "Form Labels": {
      meaning: "Each form field should clearly say what it is for.",
      question: "Would every field still make sense if read aloud?",
    },
    "Headings": {
      meaning: "Structure should be clear, not only visual.",
      question: "Can users understand the page structure quickly?",
    },
    "Captions": {
      meaning: "Audio content should also be available as text.",
      question: "Can users understand this without hearing sound?",
    },
    "AI Decisions": {
      meaning: "Important automated decisions need transparency and review.",
      question: "Can users understand and challenge this decision?",
    },
    "Orientation": {
      meaning: "Layouts should not force one device position.",
      question: "Does this still work if the device is rotated?",
    },
    "Touch Targets": {
      meaning: "Controls should be easy to tap accurately.",
      question: "Can users hit this control without extra effort?",
    },
    "Plain Language": {
      meaning: "Content should be easy to understand quickly.",
      question: "Would a first-time user understand this wording?",
    },
    "Error Prevention": {
      meaning: "Risky actions should be harder to trigger by mistake.",
      question: "Can users stop or undo a serious mistake here?",
    },
    "Audio Control": {
      meaning: "Users should control when sound starts.",
      question: "Does media wait for the user before making noise?",
    },
    "Accessible Names": {
      meaning: "Interactive controls need clear names.",
      question: "Would assistive tools identify this control clearly?",
    },
    "Zoom and Reflow": {
      meaning: "Content should still work when users zoom in.",
      question: "Does the layout still work when content gets larger?",
    },
    "Link Purpose": {
      meaning: "Links should explain where they go or what they do.",
      question: "Can users tell the destination before selecting the link?",
    },
    "Alternative Access": {
      meaning: "Important services should offer more than one way in.",
      question: "Is there another practical way to complete this task?",
    },
  };

  return insights[theme] || {
    meaning: "This area affects whether users can complete the task clearly and fairly.",
    question: "What might block someone from completing this step?",
  };
}

function getPatternMessage(themeEntries) {
  var missed = themeEntries.filter(function (entry) {
    return entry[1].correct < entry[1].total;
  }).map(function (entry) {
    return entry[0];
  });
  var strong = themeEntries.filter(function (entry) {
    return entry[1].correct === entry[1].total;
  }).map(function (entry) {
    return entry[0];
  });

  if (missed.length === 0) {
    return "You consistently spotted the main accessibility issue across the scenarios in this round.";
  }

  if (strong.length === 0) {
    return "You often noticed that something felt wrong, but the main access issue still needs more practice.";
  }

  return "You identified some issues well, but the weaker themes show where your attention can become more precise.";
}

function toSentenceCase(text) {
  if (!text) {
    return "";
  }
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function getChoiceNote(choiceText, correctText) {
  var text = choiceText.toLowerCase();
  var looksLikePresentationOnly = [
    "centered",
    "fewer colors",
    "shorter",
    "larger",
    "wider",
    "darker",
    "thumbnail",
    "faster",
    "stronger",
    "more visible",
    "theme",
    "columns",
    "title",
    "font",
    "borders",
  ].some(function (word) {
    return text.indexOf(word) >= 0;
  });

  if (looksLikePresentationOnly) {
    return "This is more about presentation or efficiency. The main accessibility issue is " + toSentenceCase(correctText) + ".";
  }

  return "This is not the main issue in this scenario. The main accessibility issue is " + toSentenceCase(correctText) + ".";
}

function getSourceDetails(questionData) {
  if (questionData.theme === "AI Decisions") {
    return {
      standard: "W3C Ethical Web Principles, especially 'The web does not cause harm to society', 'The web is for all people', and 'The web is transparent'.",
      explainer: "This question is also framed by inclusive design review practice, where users need a fair way to understand and challenge important decisions.",
      quizNote: "The wording in this quiz is a simplified teaching version of those ideas for beginners.",
    };
  }

  if (questionData.wcag === "Multiple Ways") {
    return {
      standard: "W3C WCAG 2.2, Success Criterion 2.4.5 Multiple Ways.",
      explainer: "W3C Understanding Success Criterion 2.4.5: Multiple Ways.",
      quizNote: "The quiz adapts that idea to service access, so the source is interpreted for a broader beginner scenario.",
    };
  }

  return {
    standard: "W3C WCAG 2.2, Success Criterion " + questionData.wcag + ".",
    explainer: "W3C Understanding WCAG 2.2 for " + questionData.wcag + ".",
    quizNote: "The wording in this quiz is a simplified beginner explanation derived from that criterion.",
  };
}

function renderAnswerFeedback(questionData, chosen, isCorrect) {
  var explanationElement = document.getElementById("explanation");
  explanationElement.innerHTML = "";

  var divider = document.createElement("div");
  divider.className = "feedback-divider";
  var dividerIcon = document.createElement("span");
  dividerIcon.className = "feedback-divider-icon " + (isCorrect ? "feedback-correct" : "feedback-incorrect");
  dividerIcon.textContent = isCorrect ? "Correct" : "Incorrect";
  divider.appendChild(dividerIcon);
  var dividerLine = document.createElement("span");
  dividerLine.className = "feedback-divider-line";
  divider.appendChild(dividerLine);
  explanationElement.appendChild(divider);

  var explanationBlock = document.createElement("div");
  explanationBlock.className = "feedback-section";
  var explanationText = document.createElement("p");
  explanationText.textContent = questionData.explanation;
  explanationBlock.appendChild(explanationText);
  explanationElement.appendChild(explanationBlock);

  var objectiveBlock = document.createElement("div");
  objectiveBlock.className = "feedback-section feedback-objective";
  var objectiveTitle = document.createElement("div");
  objectiveTitle.className = "feedback-section-title";
  objectiveTitle.textContent = "What you\u2019ve learned";
  objectiveBlock.appendChild(objectiveTitle);
  var objectiveText = document.createElement("p");
  objectiveText.textContent = questionData.learning_objective;
  objectiveBlock.appendChild(objectiveText);
  explanationElement.appendChild(objectiveBlock);

  explanationElement.classList.remove("hidden");
}

function startPracticeWeakAreas() {
  if (!resultSummary || !resultSummary.weakThemes.length) {
    showStartScreen();
    return;
  }

  var pool = allQuestions.filter(function (question) {
    return resultSummary.weakThemes.indexOf(question.theme) >= 0;
  });

  if (!pool.length) {
    showStartScreen();
    return;
  }

  roundQuestions = shuffle(pool).slice(0, Math.min(10, pool.length)).map(prepareQuestionForRound);
  currentIndex = 0;
  score = 0;
  answers = [];

  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("results-screen").classList.add("hidden");
  document.getElementById("quiz-screen").classList.remove("hidden");
  document.getElementById("quit-btn").classList.remove("hidden");

  renderQuestion();
  announceStatus("Practice round started for weaker themes.");
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
    wcag_url: question.wcag_url,
    wcag_extract: question.wcag_extract,
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
  var mastery = loadMastery();
  [1, 2, 3].forEach(function (difficulty) {
    var pool = allQuestions.filter(function (question) {
      return question.difficulty === difficulty;
    });
    var total = pool.length;
    var masteredCount = 0;
    pool.forEach(function (q) {
      var entry = mastery[q.wcag];
      if (entry && entry.mastered.indexOf(q.id) >= 0) {
        masteredCount++;
      }
    });
    var element = document.getElementById("count-" + difficulty);
    if (element) {
      element.textContent = masteredCount + " / " + total + " mastered";
    }
  });
}

function selectDifficulty(diff) {
  selectedDifficulty = diff;
  selectedSession = null;
  document.querySelectorAll(".session-btn").forEach(function (button) {
    button.classList.remove("selected");
    button.disabled = false;
  });
  updateDifficultyMastery();
  announceStatus("Difficulty " + diff + " selected. Now choose session length.");
}

function updateDifficultyMastery() {
  var el = document.getElementById("difficulty-mastery");
  if (!selectedDifficulty || !allQuestions.length) {
    el.textContent = "";
    return;
  }
  var mastery = loadMastery();
  var pool = allQuestions.filter(function (q) { return q.difficulty === selectedDifficulty; });
  var masteredCount = 0;
  pool.forEach(function (q) {
    var entry = mastery[q.wcag];
    if (entry && entry.mastered.indexOf(q.id) >= 0) masteredCount++;
  });
  el.textContent = masteredCount + " / " + pool.length + " questions mastered";
}

function selectSession(session) {
  selectedSession = session;
  document.querySelectorAll(".session-btn").forEach(function (button) {
    button.classList.toggle("selected", button.dataset.session === String(session));
  });
  announceStatus("Starting session.");
  if (!allQuestions.length) {
    loadQuestions().then(function () {
      updateDifficultyMastery();
      startQuiz();
    });
  } else {
    startQuiz();
  }
}

function pickFullCoverage(pool) {
  var mastery = loadMastery();
  var byCriterion = {};
  pool.forEach(function (question) {
    var key = question.wcag;
    if (!byCriterion[key]) {
      byCriterion[key] = [];
    }
    byCriterion[key].push(question);
  });
  var picked = [];
  Object.keys(byCriterion).forEach(function (key) {
    picked.push(pickSmartQuestion(byCriterion[key], mastery));
  });
  return shuffle(picked);
}

function startQuiz() {
  collapsePreferences();
  if (!selectedSession) {
    return;
  }
  if (selectedSession !== "full" && !selectedDifficulty) {
    return;
  }

  stopSpeech();
  resetQuizData();

  var pool = allQuestions.filter(function (question) {
    return question.difficulty === selectedDifficulty;
  });

  var selected;
  if (selectedSession === "full") {
    // Full Coverage uses ALL questions regardless of difficulty
    selected = pickFullCoverage(allQuestions);
  } else {
    var count = Math.min(Number(selectedSession), pool.length);
    selected = pickSmartPool(pool, count);
  }

  roundQuestions = selected.map(prepareQuestionForRound);
  currentIndex = 0;
  score = 0;
  answers = [];

  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("results-screen").classList.add("hidden");
  document.getElementById("quiz-screen").classList.remove("hidden");
  document.getElementById("quit-btn").classList.remove("hidden");

  renderQuestion();
  announceStatus("Simulator started with " + count + " questions.");
}

function renderQuestion() {
  var questionData = roundQuestions[currentIndex];
  var total = roundQuestions.length;
  document.getElementById("question-counter").textContent = "Question " + (currentIndex + 1) + " of " + total;
  document.getElementById("score-bar").textContent = "Correct: " + score;

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

  var wcagRef = document.getElementById("wcag-reference");
  var wcagBody = document.getElementById("wcag-reference-body");
  wcagRef.removeAttribute("open");
  var wcagLink = questionData.wcag_url
    ? '<a href="' + questionData.wcag_url + '" target="_blank" rel="noopener">' + questionData.wcag + '</a>'
    : questionData.wcag;
  wcagBody.innerHTML =
    '<div class="wcag-ref-row"><span class="wcag-ref-label">Principle</span> ' + questionData.principle + '</div>' +
    '<div class="wcag-ref-row"><span class="wcag-ref-label">Criterion</span> ' + wcagLink + '</div>' +
    '<div class="wcag-ref-row"><span class="wcag-ref-label">Theme</span> ' + questionData.theme + '</div>' +
    (questionData.wcag_extract
      ? '<div class="wcag-ref-extract">' + questionData.wcag_extract + '</div>'
      : '');

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
  isReading = false;
  updateReadButton();
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
  updateQuizDataForAnswer(questionData, chosen, isCorrect);
  recordMastery(questionData, isCorrect);

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

  renderAnswerFeedback(questionData, chosen, isCorrect);

  var nextButton = document.getElementById("next-btn");
  nextButton.textContent = currentIndex < total - 1 ? "Next Question" : "See Results";
  nextButton.classList.remove("hidden");
  focusWithoutScroll(nextButton);

  var dots = document.querySelectorAll(".progress-dot");
  if (dots[currentIndex]) {
    dots[currentIndex].className = "progress-dot " + (isCorrect ? "correct" : "wrong");
  }

  document.getElementById("score-bar").textContent = "Correct: " + score;
  announceStatus(isCorrect ? "Correct answer selected." : "Incorrect answer selected.");
}

function showResults() {
  collapsePreferences();
  stopSpeech();
  finalizeQuizData();
  document.getElementById("quiz-screen").classList.add("hidden");
  document.getElementById("results-screen").classList.remove("hidden");
  document.getElementById("quit-btn").classList.add("hidden");

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
  var learningMessage = pct >= 0.8
    ? "You are identifying issues well. Next step: focus on edge cases."
    : pct >= 0.5
      ? "You understand the basics. Try to focus on who is blocked in each scenario."
      : "Focus on understanding impact rather than guessing answers.";
  var themeEntries = Object.entries(themeStats)
    .sort(function (a, b) {
      return (a[1].correct / a[1].total) - (b[1].correct / b[1].total);
    });
  var needsPractice = themeEntries
    .filter(function (entry) {
      return entry[1].correct < entry[1].total;
    });
  var strengths = themeEntries.filter(function (entry) {
    return entry[1].correct === entry[1].total;
  }).slice(0, 2);

  resultSummary = {
    weakThemes: needsPractice.map(function (entry) {
      return entry[0];
    }),
  };

  var html =
    '<div class="results-header">' +
    '<div class="big-score ' + scoreClass + '">' + score + ' <span class="total">/ ' + total + "</span></div>" +
    '<p class="results-message">' + learningMessage + "</p>" +
    "</div>";

  html += '<div class="themes-section"><h3>By Theme</h3>';
  themeEntries.forEach(function (entry) {
    var theme = entry[0];
    var stats = entry[1];
    var themePct = Math.round((stats.correct / stats.total) * 100);
    var themeClass = themePct === 100 ? "good" : themePct >= 50 ? "needs-work" : "bad";
    html +=
      '<div class="theme-item"><span>' + theme + '</span><span class="theme-score ' + themeClass + '">' +
      stats.correct + "/" + stats.total + "</span></div>";
  });
  html += "</div>";

  html += '<div class="results-actions">';
  if (needsPractice.length > 0) {
    html += '<button class="secondary-btn" id="practice-weak-btn" type="button">Practice Weak Areas</button>';
  }
  html += '<button class="start-btn" id="play-again-btn" type="button">Play Again</button>';
  html += "</div>";

  document.getElementById("results").innerHTML = html;
  document.getElementById("play-again-btn").addEventListener("click", showStartScreen);
  document.getElementById("read-results-btn").classList.remove("hidden");
  var practiceWeakButton = document.getElementById("practice-weak-btn");
  if (practiceWeakButton) {
    practiceWeakButton.addEventListener("click", startPracticeWeakAreas);
  }
  announceStatus("Simulation complete. Final score: " + score + " out of " + total + ".");
}

function showStartScreen() {
  collapsePreferences();
  stopSpeech();
  roundQuestions = [];
  currentIndex = 0;
  score = 0;
  answers = [];
  resultSummary = null;
  selectedSession = null;
  selectedDifficulty = 0;
  document.getElementById("difficulty-select").value = "0";
  document.getElementById("difficulty-mastery").textContent = "";
  document.querySelectorAll(".session-btn").forEach(function (button) {
    button.classList.remove("selected");
    button.disabled = button.dataset.session !== "full";
  });
  document.getElementById("results-screen").classList.add("hidden");
  document.getElementById("quiz-screen").classList.add("hidden");
  document.getElementById("start-screen").classList.remove("hidden");
  document.getElementById("explanation").classList.add("hidden");
  document.getElementById("next-btn").classList.add("hidden");
  document.getElementById("quit-btn").classList.add("hidden");
  document.getElementById("read-results-btn").classList.add("hidden");
  document.getElementById("read-results-btn").textContent = "Read Aloud";
  announceStatus("Returned to start screen.");
}

var isReadingStart = false;

document.getElementById("read-start-btn").addEventListener("click", function () {
  if (isReadingStart) {
    stopSpeech();
    isReadingStart = false;
    document.getElementById("read-start-btn").textContent = "Read Aloud";
  } else {
    var text = "WCAG Practice. Build your understanding of WCAG 2.2 through realistic scenarios. " +
      "Each question presents a situation where similar-sounding criteria must be distinguished. " +
      "Wrong answers teach as much as right ones. " +
      "Choose a difficulty level and session length to begin, or select Full Coverage to practice all criteria across all levels.";
    speakText(text);
    isReadingStart = true;
    document.getElementById("read-start-btn").textContent = "Stop Reading";
  }
});

var isReadingResults = false;
document.getElementById("read-results-btn").addEventListener("click", function () {
  if (isReadingResults) {
    stopSpeech();
    isReadingResults = false;
    this.textContent = "Read Aloud";
  } else {
    speakText(getResultsSpeechText());
    isReadingResults = true;
    this.textContent = "Stop Reading";
  }
});

document.getElementById("difficulty-select").addEventListener("change", function (event) {
  selectDifficulty(Number(event.target.value));
});

document.getElementById("session-selector").addEventListener("click", function (event) {
  var button = event.target.closest(".session-btn");
  if (button && !button.disabled) {
    selectSession(button.dataset.session);
  }
});

document.getElementById("session-selector-full").addEventListener("click", function (event) {
  var button = event.target.closest(".session-btn");
  if (button) {
    selectSession(button.dataset.session);
  }
});

document.getElementById("next-btn").addEventListener("click", function () {
  currentIndex += 1;
  if (currentIndex < roundQuestions.length) {
    renderQuestion();
  } else {
    showResults();
  }
});

document.getElementById("quit-btn").addEventListener("click", function () {
  showStartScreen();
});

var isReading = false;

function updateReadButton() {
  var btn = document.getElementById("read-screen-btn");
  if (isReading) {
    btn.textContent = "Stop Reading";
    btn.setAttribute("aria-label", "Stop reading");
  } else {
    btn.textContent = "Read Aloud";
    btn.setAttribute("aria-label", "Read question aloud");
  }
}

document.getElementById("read-screen-btn").addEventListener("click", function () {
  if (isReading) {
    stopSpeech();
    isReading = false;
  } else {
    speakText(getCurrentQuizSpeechText());
    isReading = true;
  }
  updateReadButton();
});

function hasConsent() {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "1";
  } catch (e) {
    return false;
  }
}

function grantConsent() {
  window.localStorage.setItem(CONSENT_KEY, "1");
}

function initApp() {
  document.getElementById("consent-screen").classList.add("hidden");
  document.getElementById("top-controls").classList.remove("hidden");
  document.getElementById("start-screen").classList.remove("hidden");

  loadPreferences();
  applyPreferences();
  initSpeech();

  if (!speechSupported) {
    document.getElementById("read-screen-btn").disabled = true;
  }

  loadQuestions()
    .then(function () {})
    .catch(function () {
      announceStatus("Unable to load questions.");
      var startButton = document.getElementById("start-btn");
      startButton.textContent = "Questions failed to load";
      startButton.disabled = true;
    });
}

var isReadingConsent = false;

document.getElementById("read-consent-btn").addEventListener("click", function () {
  if (isReadingConsent) {
    stopSpeech();
    isReadingConsent = false;
    document.getElementById("read-consent-btn").textContent = "Read Aloud";
  } else {
    speakText("WCAG Practice. Build your understanding of WCAG 2.2 through realistic scenarios. This app uses your browser's local storage to save your progress, preferences, and mastery data. No data is sent to any server — everything stays on your device. Press Accept and Continue to start.");
    isReadingConsent = true;
    document.getElementById("read-consent-btn").textContent = "Stop Reading";
  }
});

document.getElementById("consent-btn").addEventListener("click", function () {
  grantConsent();
  initApp();
});

document.getElementById("toggle-high-contrast").addEventListener("click", function () {
  updatePreference("highContrast", !preferences.highContrast);
});

document.getElementById("toggle-enhanced-readability").addEventListener("click", function () {
  updatePreference("enhancedReadability", !preferences.enhancedReadability);
});

document.getElementById("font-scale").addEventListener("input", function (event) {
  updatePreference("fontScale", Number(event.target.value));
});

// Reset UI state on load (prevents stale browser form restoration)
function resetStartScreenState() {
  document.getElementById("difficulty-select").value = "0";
  document.getElementById("difficulty-mastery").textContent = "";
  document.querySelectorAll(".session-btn").forEach(function (button) {
    button.classList.remove("selected");
    button.disabled = button.dataset.session !== "full";
  });
  selectedDifficulty = 0;
  selectedSession = null;
}

// Boot: skip consent if already accepted
if (hasConsent()) {
  initApp();
  resetStartScreenState();
}

window.getQuizData = getQuizData;
