var allQuestions = [];
var roundQuestions = [];
var currentIndex = 0;
var score = 0;
var answers = [];
var selectedDifficulty = 0;
var PREFERENCES_KEY = "accessibility_quiz_preferences_v1";
var QUIZ_DATA_KEY = "accessibility_quiz_data_v1";
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
    "Theme: " + questionData.theme + ".",
    questionData.question,
    "Options:",
  ];

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

  var lead = document.createElement("div");
  lead.className = "feedback-lead";
  lead.textContent = isCorrect
    ? "Correct. " + questionData.explanation
    : "Not quite. The best answer is: " + questionData.choices[questionData.correct] + ".";
  explanationElement.appendChild(lead);

  var whyCorrect = document.createElement("div");
  whyCorrect.className = "feedback-block";
  whyCorrect.innerHTML = "<strong>Why this is the main issue</strong><p>" + questionData.explanation + "</p>";
  explanationElement.appendChild(whyCorrect);

  var learningObjective = document.createElement("div");
  learningObjective.className = "learning-objective";
  learningObjective.textContent = "Learning objective: " + questionData.learning_objective;
  explanationElement.appendChild(learningObjective);

  var whyOthers = document.createElement("div");
  whyOthers.className = "feedback-block";
  var whyOthersTitle = document.createElement("strong");
  whyOthersTitle.textContent = "Why the other options are not the main issue";
  whyOthers.appendChild(whyOthersTitle);
  var list = document.createElement("ul");
  list.className = "feedback-list";

  questionData.choices.forEach(function (choiceText, index) {
    if (index === questionData.correct) {
      return;
    }
    var item = document.createElement("li");
    var prefix = index === chosen && !isCorrect ? "Your choice. " : "";
    item.innerHTML = "<strong>" + choiceText + ":</strong> " + prefix + getChoiceNote(choiceText, questionData.choices[questionData.correct]);
    list.appendChild(item);
  });

  whyOthers.appendChild(list);
  explanationElement.appendChild(whyOthers);

  var sourceDetails = getSourceDetails(questionData);
  var basedOn = document.createElement("div");
  basedOn.className = "feedback-block feedback-basis";
  basedOn.innerHTML =
    "<strong>What this answer is based on</strong>" +
    "<p><strong>Principle:</strong> " + questionData.principle + ".</p>" +
    "<p><strong>Standard:</strong> " + sourceDetails.standard + "</p>" +
    "<p><strong>Supporting explanation:</strong> " + sourceDetails.explainer + "</p>" +
    "<p><strong>How it was simplified for this quiz:</strong> " + sourceDetails.quizNote + "</p>";
  explanationElement.appendChild(basedOn);
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
  var distractors = choices.filter(function (choice) {
    return !choice.isCorrect;
  });
  var selectedDistractor = distractors[Math.floor(Math.random() * distractors.length)];
  var shuffledChoices = shuffle(selectedDistractor ? [choices[question.correct], selectedDistractor] : choices.slice(0, 2));
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

  stopSpeech();
  resetQuizData();

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
  announceStatus("Simulator started with " + count + " questions.");
}

function renderQuestion() {
  var questionData = roundQuestions[currentIndex];
  var total = roundQuestions.length;
  document.getElementById("question-counter").textContent = "Question " + (currentIndex + 1) + " of " + total;
  document.getElementById("score-bar").textContent = "Score " + score;

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
  updateQuizDataForAnswer(questionData, chosen, isCorrect);

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

  document.getElementById("score-bar").textContent = "Score " + score;
  announceStatus(isCorrect ? "Correct answer selected." : "Incorrect answer selected.");
}

function showResults() {
  stopSpeech();
  finalizeQuizData();
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
    "<h2>Simulation Complete</h2>" +
    '<div class="big-score ' + scoreClass + '">' + score + ' <span class="total">/ ' + total + "</span></div>" +
    '<p class="results-message">' + learningMessage + "</p>" +
    '<div class="themes-section"><h3>Performance by Theme</h3>';

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

  html += '<div class="results-insight"><h3>Your main pattern</h3><p>' + getPatternMessage(themeEntries) + "</p></div>";

  if (strengths.length > 0) {
    html += '<div class="results-insight"><h3>You performed well in</h3><p>' +
      strengths.map(function (entry) { return entry[0]; }).join(", ") +
      "</p></div>";
    html += '<div class="results-insight"><h3>What you did well</h3><ul class="results-list">';
    strengths.forEach(function (entry) {
      html += "<li><strong>" + entry[0] + ":</strong> " + getThemeInsight(entry[0]).meaning + "</li>";
    });
    html += "</ul></div>";
  }

  if (needsPractice.length > 0) {
    html += '<div class="results-insight"><h3>You struggled with</h3><p>' +
      needsPractice.slice(0, 2).map(function (entry) { return entry[0]; }).join(", ") +
      "</p></div>";
    html += '<div class="results-insight"><h3>What to review</h3><ul class="results-list">';
    needsPractice.forEach(function (entry) {
      var insight = getThemeInsight(entry[0]);
      html += "<li><strong>" + entry[0] + ":</strong> " + insight.meaning + "</li>";
    });
    html += "</ul></div>";

    html += '<div class="results-insight"><h3>Questions to remember next time</h3><ul class="results-list">';
    needsPractice.forEach(function (entry) {
      html += "<li>" + getThemeInsight(entry[0]).question + "</li>";
    });
    html += "</ul></div>";

    html += '<div class="practice-note">Focus on: ' +
      needsPractice.map(function (entry) { return entry[0]; }).join(", ") +
      "</div>";
  }

  html += '<div class="results-actions">';
  if (speechSupported) {
    html += '<div class="audio-controls" role="group" aria-label="Results speech controls">';
    html += '<button class="secondary-btn compact-btn" id="read-results-btn" type="button">Read Results</button>';
    html += '<button class="secondary-btn compact-btn" id="stop-results-btn" type="button">Stop</button>';
    html += "</div>";
  }
  if (needsPractice.length > 0) {
    html += '<button class="secondary-btn" id="practice-weak-btn" type="button">Practice Weak Areas</button>';
  }
  html += '<button class="start-btn" id="play-again-btn" type="button">Play Again</button>';
  html += "</div>";

  document.getElementById("results").innerHTML = html;
  document.getElementById("play-again-btn").addEventListener("click", showStartScreen);
  if (speechSupported) {
    document.getElementById("read-results-btn").addEventListener("click", function () {
      speakText(getResultsSpeechText());
    });
    document.getElementById("stop-results-btn").addEventListener("click", stopSpeech);
  }
  var practiceWeakButton = document.getElementById("practice-weak-btn");
  if (practiceWeakButton) {
    practiceWeakButton.addEventListener("click", startPracticeWeakAreas);
  }
  announceStatus("Simulation complete. Final score: " + score + " out of " + total + ".");
}

function showStartScreen() {
  stopSpeech();
  roundQuestions = [];
  currentIndex = 0;
  score = 0;
  answers = [];
  resultSummary = null;
  document.getElementById("results-screen").classList.add("hidden");
  document.getElementById("quiz-screen").classList.add("hidden");
  document.getElementById("start-screen").classList.remove("hidden");
  document.getElementById("explanation").classList.add("hidden");
  document.getElementById("next-btn").classList.add("hidden");
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

document.getElementById("quit-btn").addEventListener("click", function () {
  showStartScreen();
});

document.getElementById("read-screen-btn").addEventListener("click", function () {
  speakText(getCurrentQuizSpeechText());
});

document.getElementById("stop-reading-btn").addEventListener("click", stopSpeech);

loadQuestions()
  .then(updateDifficultyCounts)
  .catch(function () {
    announceStatus("Unable to load simulator questions.");
    var startButton = document.getElementById("start-btn");
    startButton.textContent = "Questions failed to load";
    startButton.disabled = true;
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

loadPreferences();
applyPreferences();
initSpeech();

if (!speechSupported) {
  document.getElementById("read-screen-btn").disabled = true;
  document.getElementById("stop-reading-btn").disabled = true;
}

window.getQuizData = getQuizData;
