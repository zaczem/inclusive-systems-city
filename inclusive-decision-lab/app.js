const LAB_VERSION = "2.0.0-Research-Enabled";
const VERSION_LABEL = "Version 2.0 – Research-Enabled Edition";
const INITIAL_INDICATORS = {
  accessibility: 55,
  legalRisk: 40,
  trust: 55,
  technicalDebt: 50,
  budget: 70,
};
const TOTAL_ROUNDS = 20;
const INDICATOR_META = {
  accessibility: {
    label: "Accessibility Index",
    meaning: "High values indicate stronger accessibility performance. Low values indicate more barriers across services.",
    positiveHigh: true,
  },
  legalRisk: {
    label: "Legal Risk",
    meaning: "High values indicate stronger regulatory exposure. Low values indicate more defensible compliance posture.",
    positiveHigh: false,
  },
  trust: {
    label: "Stakeholder Trust",
    meaning: "High values indicate stronger confidence among users and partners. Low values indicate weakening institutional legitimacy.",
    positiveHigh: true,
  },
  technicalDebt: {
    label: "Technical Debt",
    meaning: "High values indicate accumulated implementation burden. Low values indicate stronger technical resilience.",
    positiveHigh: false,
  },
  budget: {
    label: "Budget",
    meaning: "High values indicate more room for corrective action. Low values constrain institutional response capacity.",
    positiveHigh: true,
  },
};
const PUBLIC_EXPORT_FILENAME = "inclusive-decision-lab-session.json";
const RESEARCH_CSV_FILENAME = "inclusive-decision-lab-research-data.csv";
const RESEARCH_HASH = "9537f32ec7599c1e6d97c5d9b0e141b70e9076ef3e269f6cf5c5a4583f143b87";

const state = {
  scenarios: [],
  currentScenarioIndex: 0,
  indicators: { ...INITIAL_INDICATORS },
  lastIndicators: { ...INITIAL_INDICATORS },
  history: [],
  hiddenEffects: [],
  reflection: null,
  awaitingNext: false,
  pendingEndResult: null,
  settings: {
    reducedMotion: false,
    largeText: false,
    plainLanguage: false,
    lowComplexity: false,
    highContrast: false,
    largeSpacing: false,
    enhancedReadability: false,
    anonymizedMode: false,
    researchMode: true,
    auditMode: false,
  },
  sessionUUID: "",
  participantCode: "",
  consentGiven: false,
  userRole: "research",
  sessionStartedAt: null,
  scenarioStartedAt: null,
  activeSpeech: null,
  finalReport: null,
  focusBeforeModal: null,
  dashboardOpen: false,
};

const ui = {
  startScreen: document.getElementById("start-screen"),
  simulationShell: document.getElementById("simulation-shell"),
  participantCode: document.getElementById("participant-code"),
  consentCheckbox: document.getElementById("consent-checkbox"),
  consentStatus: document.getElementById("consent-status"),
  beginSimulation: document.getElementById("begin-simulation"),
  dashboard: document.getElementById("decision-dashboard"),
  dashboardToggle: document.getElementById("dashboard-toggle"),
  dashboardBackdrop: document.getElementById("dashboard-backdrop"),
  roundCounter: document.getElementById("round-counter"),
  indicatorGrid: document.getElementById("indicator-grid"),
  scenarioCategory: document.getElementById("scenario-category"),
  scenarioProgress: document.getElementById("scenario-progress"),
  scenarioTitle: document.getElementById("scenario-title"),
  scenarioDescription: document.getElementById("scenario-description"),
  choiceList: document.getElementById("choice-list"),
  nextQuestion: document.getElementById("next-question"),
  reflectionPanel: document.getElementById("reflection-panel"),
  reflectionContent: document.getElementById("reflection-content"),
  effectsPanel: document.getElementById("effects-panel"),
  effectsContent: document.getElementById("effects-content"),
  statusRegion: document.getElementById("status-region"),
  criticalStatus: document.getElementById("critical-status"),
  endScreen: document.getElementById("end-screen"),
  endTitle: document.getElementById("end-title"),
  endSummary: document.getElementById("end-summary"),
  closeEndScreen: document.getElementById("close-end-screen"),
  exportJSON: document.getElementById("export-json"),
  exportReport: document.getElementById("export-report"),
  exportCaseStudy: document.getElementById("export-case-study"),
  exportCSV: document.getElementById("export-csv"),
  restart: document.getElementById("restart-simulation"),
  readScenario: document.getElementById("read-scenario"),
  readReflection: document.getElementById("read-reflection"),
  summarizeIndicators: document.getElementById("summarize-indicators"),
  stopReading: document.getElementById("stop-reading"),
  researchPanel: document.getElementById("research-panel"),
  sessionUUIDDisplay: document.getElementById("session-uuid-display"),
  roleDisplay: document.getElementById("role-display"),
  decisionTimeDisplay: document.getElementById("decision-time-display"),
  toggleMotion: document.getElementById("toggle-motion"),
  toggleText: document.getElementById("toggle-text"),
  togglePlainLanguage: document.getElementById("toggle-plain-language"),
  toggleLowComplexity: document.getElementById("toggle-low-complexity"),
  toggleHighContrast: document.getElementById("toggle-high-contrast"),
  toggleLargeSpacing: document.getElementById("toggle-large-spacing"),
  toggleEnhancedReadability: document.getElementById("toggle-enhanced-readability"),
  toggleAnonymizedMode: document.getElementById("toggle-anonymized-mode"),
  toggleResearchMode: document.getElementById("toggle-research-mode"),
  toggleAudit: document.getElementById("toggle-audit"),
  auditPanel: document.getElementById("audit-panel"),
  auditContent: document.getElementById("audit-content"),
  activateResearchMode: document.getElementById("activate-research-mode"),
  tabButtons: Array.from(document.querySelectorAll('[role="tab"]')),
  tabPanels: Array.from(document.querySelectorAll('[role="tabpanel"]')),
};

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function formatToggle(button, label, on) {
  button.setAttribute("aria-pressed", String(on));
  button.textContent = `${label}: ${on ? "On" : "Off"}`;
}

function setDashboardOpen(open) {
  state.dashboardOpen = open;
  document.body.classList.toggle("dashboard-open", open);
  ui.dashboardToggle.setAttribute("aria-expanded", String(open));
  ui.dashboardToggle.setAttribute("aria-label", open ? "Close decision dashboard" : "Open decision dashboard");
  ui.dashboardToggle.querySelector("span[aria-hidden='true']").textContent = open ? "‹" : "›";
  ui.dashboardToggle.querySelector(".dashboard-toggle-label").textContent = open ? "Hide Dashboard" : "Open Dashboard";
  ui.dashboardBackdrop.hidden = !open;
}

function updateConsentUI() {
  const ready = ui.consentCheckbox.checked;
  ui.beginSimulation.disabled = !ready;
  ui.consentStatus.textContent = ready
    ? "Consent confirmed. You can now begin the simulation."
    : "Consent is required before the simulation can begin.";
  ui.consentStatus.classList.toggle("is-ready", ready);
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function updateIndicators(current, delta) {
  const next = { ...current };
  Object.entries(delta || {}).forEach(([key, value]) => {
    if (key in next) {
      next[key] = clamp(next[key] + value);
    }
  });
  return next;
}

function applyDriftRules(indicators) {
  const drift = { accessibility: 0, legalRisk: 0, trust: 0, technicalDebt: 0, budget: 0 };
  if (indicators.technicalDebt > 70) {
    drift.accessibility -= 4;
    drift.legalRisk += 4;
    drift.budget -= 3;
  }
  if (indicators.accessibility < 40) {
    drift.legalRisk += 5;
    drift.trust -= 4;
  }
  if (indicators.trust < 35) {
    drift.budget -= 2;
  }
  if (indicators.budget < 30) {
    drift.technicalDebt += 3;
    drift.accessibility -= 2;
  }
  if (indicators.accessibility > 75 && indicators.trust > 70) {
    drift.legalRisk -= 3;
  }
  if (indicators.technicalDebt < 30) {
    drift.budget += 1;
  }
  return updateIndicators(indicators, drift);
}

function evaluateGameEnd(indicators, roundNumber) {
  if (indicators.legalRisk >= 95) {
    return { ended: true, type: "failure", reason: "Legal risk exceeded the failure threshold." };
  }
  if (indicators.trust <= 5) {
    return { ended: true, type: "failure", reason: "Stakeholder trust collapsed below a sustainable threshold." };
  }
  if (indicators.budget <= 0) {
    return { ended: true, type: "failure", reason: "Budget capacity was exhausted." };
  }
  if (indicators.accessibility <= 5) {
    return { ended: true, type: "failure", reason: "Accessibility performance failed institutionally." };
  }
  if (roundNumber > TOTAL_ROUNDS) {
    return { ended: true, type: "complete", reason: "Twenty rounds were completed." };
  }
  return { ended: false };
}

async function loadScenarios() {
  try {
    const response = await fetch("scenarios.json");
    if (!response.ok) throw new Error("Scenario fetch failed");
    return await response.json();
  } catch {
    if (Array.isArray(window.SCENARIOS_DATA)) {
      return window.SCENARIOS_DATA;
    }
    throw new Error("Unable to load scenarios.");
  }
}

function getVisibleIndicatorKeys() {
  return state.settings.lowComplexity ? ["accessibility", "legalRisk", "trust"] : Object.keys(INDICATOR_META);
}

function getIndicatorStatus(key, value) {
  const positiveHigh = INDICATOR_META[key].positiveHigh;
  if (positiveHigh) {
    if (value >= 70) return { icon: "✔", label: "good", className: "status-good", trend: "↑" };
    if (value >= 40) return { icon: "⚠", label: "watch", className: "status-watch", trend: "→" };
    return { icon: "✖", label: "critical", className: "status-critical", trend: "↓" };
  }
  if (value <= 30) return { icon: "✔", label: "good", className: "status-good", trend: "↓" };
  if (value <= 60) return { icon: "⚠", label: "watch", className: "status-watch", trend: "→" };
  return { icon: "✖", label: "critical", className: "status-critical", trend: "↑" };
}

function renderDashboard() {
  const visibleKeys = getVisibleIndicatorKeys();
  ui.indicatorGrid.innerHTML = "";
  visibleKeys.forEach((key) => {
    const value = state.indicators[key];
    const previous = state.lastIndicators[key];
    const trend = value > previous ? "↑" : value < previous ? "↓" : "→";
    const status = getIndicatorStatus(key, value);
    const compactSummary = INDICATOR_META[key].positiveHigh
      ? (value >= 70 ? "Currently supporting system resilience." : value >= 40 ? "Needs continued attention." : "Needs urgent corrective action.")
      : (value <= 30 ? "Currently contained." : value <= 60 ? "Should be monitored closely." : "Creating significant governance pressure.");
    const article = document.createElement("article");
    article.className = "indicator-card";
    article.innerHTML = `
      <div class="indicator-meta">
        <div>
          <h3>${INDICATOR_META[key].label}</h3>
          <p>${value} <span aria-hidden="true">${trend}</span></p>
        </div>
        <p class="status-badge ${status.className}" aria-label="Status ${status.label}">${status.icon} ${status.label}</p>
      </div>
      <div class="progress" aria-hidden="true"><span style="width:${value}%"></span></div>
      <p class="indicator-brief">${compactSummary}</p>
      <details class="indicator-details">
        <summary>What this means</summary>
        <p>High value: ${INDICATOR_META[key].positiveHigh ? "more stable" : "more severe"} condition.</p>
        <p>Low value: ${INDICATOR_META[key].positiveHigh ? "more vulnerable" : "more stable"} condition.</p>
        <p>Why it matters: ${INDICATOR_META[key].meaning}</p>
      </details>
    `;
    ui.indicatorGrid.appendChild(article);
  });
  ui.roundCounter.textContent = `Round ${Math.min(state.currentScenarioIndex + 1, TOTAL_ROUNDS)} of ${TOTAL_ROUNDS}`;
  ui.sessionUUIDDisplay.textContent = state.userRole === "research" ? state.sessionUUID : "Restricted";
  ui.roleDisplay.textContent = state.userRole === "research" ? "Research" : "Public";
}

function buildPlainSummary(delta) {
  const improved = [];
  const worsened = [];
  Object.entries(delta).forEach(([key, value]) => {
    if (!value) return;
    const label = INDICATOR_META[key].label;
    const positive = INDICATOR_META[key].positiveHigh ? value > 0 : value < 0;
    if (positive) {
      improved.push(label);
    } else {
      worsened.push(label);
    }
  });
  const watch = worsened[0] || "Legal Risk";
  return { improved, worsened, watch };
}

function scoreProjectedIndicators(indicators) {
  return (
    indicators.accessibility * 1.4 +
    (100 - indicators.legalRisk) * 1.5 +
    indicators.trust * 1.25 +
    (100 - indicators.technicalDebt) * 1.1 +
    indicators.budget * 0.8
  );
}

function buildRecommendationRationale(choice, delta) {
  const summary = buildPlainSummary(delta);
  const improved = summary.improved.join(", ");
  const worsened = summary.worsened.join(", ");
  if (improved && worsened) {
    return `This option is recommended because it improves ${improved} while containing trade-offs in ${worsened}.`;
  }
  if (improved) {
    return `This option is recommended because it strengthens ${improved} without creating major new pressures.`;
  }
  return "This option is recommended because it preserves the most stable overall governance position across the indicators.";
}

function getRecommendedChoice(scenario, baseIndicators) {
  let best = null;
  for (const option of scenario.choices) {
    const afterDirect = updateIndicators(baseIndicators, option.effects || {});
    const afterHidden = updateIndicators(afterDirect, option.hiddenEffects || {});
    const afterDrift = applyDriftRules(afterHidden);
    const delta = {};
    Object.keys(INITIAL_INDICATORS).forEach((key) => {
      delta[key] = afterDrift[key] - baseIndicators[key];
    });
    const score = scoreProjectedIndicators(afterDrift);
    if (!best || score > best.score) {
      best = {
        choice: option,
        score,
        delta,
        rationale: buildRecommendationRationale(option, delta),
      };
    }
  }
  return best;
}

function buildStrategicReflection(choice, delta, hiddenText, scenario, indicatorBefore) {
  const summary = buildPlainSummary(delta);
  const advanced = `This decision prioritizes ${choice.text.toLowerCase()} within a constrained governance environment. The immediate trade-offs emerged because institutional capacity, legal exposure, stakeholder confidence, and technical maintenance pressures do not move independently. A longer-term effect may emerge if these tensions continue to reinforce one another through drift conditions.`;
  const plain = `This choice changes several parts of the system at once. Some areas improve now, but other areas may weaken later. Watch ${summary.watch} next.`;
  const recommended = getRecommendedChoice(scenario, indicatorBefore);
  const alignment = recommended?.choice?.text === choice.text
    ? "Your choice matched the recommended policy response for this scenario."
    : `A stronger policy response would have been: ${recommended?.choice?.text || "Not available"}.`;
  return { advanced, plain, summary, hiddenText, recommended, alignment };
}

function renderReflection() {
  ui.reflectionPanel.hidden = false;
  ui.effectsPanel.hidden = state.settings.lowComplexity;
  if (!state.reflection) {
    ui.reflectionContent.innerHTML = "<p>Make a decision to generate a strategic reflection.</p>";
    ui.effectsContent.innerHTML = "<p>Make a decision to reveal hidden downstream impacts.</p>";
    return;
  }
  const text = state.settings.plainLanguage || state.settings.lowComplexity ? state.reflection.plain : state.reflection.advanced;
  ui.reflectionContent.innerHTML = `
    <p>${text}</p>
    <div class="recommendation-block">
      <p><strong>Recommended answer:</strong> ${state.reflection.recommended?.choice?.text || "Not available"}</p>
      <p><strong>Why:</strong> ${state.reflection.recommended?.rationale || "No recommendation rationale available."}</p>
      <p><strong>Comparison:</strong> ${state.reflection.alignment}</p>
    </div>
    <ul>
      <li>What improved: ${state.reflection.summary.improved.join(", ") || "No major improvement"}</li>
      <li>What worsened: ${state.reflection.summary.worsened.join(", ") || "No major decline"}</li>
      <li>What to watch next: ${state.reflection.summary.watch}</li>
    </ul>
  `;
  if (!state.settings.lowComplexity) {
    const lastEffect = state.hiddenEffects[state.hiddenEffects.length - 1];
    ui.effectsContent.innerHTML = lastEffect
      ? `<p>${lastEffect.hiddenReveal}</p>`
      : "<p>No hidden effect recorded yet.</p>";
  }
}

function renderScenario() {
  const scenario = state.scenarios[state.currentScenarioIndex];
  if (!scenario) return;
  state.awaitingNext = false;
  state.pendingEndResult = null;
  ui.scenarioCategory.textContent = scenario.category;
  ui.scenarioProgress.textContent = `Question ${state.currentScenarioIndex + 1} of ${TOTAL_ROUNDS}`;
  ui.scenarioTitle.textContent = scenario.title;
  ui.scenarioDescription.textContent = scenario.description;
  ui.choiceList.innerHTML = "";
  scenario.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    button.setAttribute("aria-describedby", "scenario-help");
    button.innerHTML = `<strong>${index + 1}. ${choice.text}</strong><small>Select this governance response.</small>`;
    button.addEventListener("click", () => onDecision(choice, scenario));
    ui.choiceList.appendChild(button);
  });
  ui.nextQuestion.hidden = true;
  ui.nextQuestion.textContent = "Next Question";
  ui.scenarioTitle.focus();
  ui.statusRegion.textContent = `Round ${state.currentScenarioIndex + 1}. New scenario loaded.`;
}

function renderAuditPanel() {
  if (!state.settings.auditMode) {
    ui.auditPanel.hidden = true;
    return;
  }
  ui.auditPanel.hidden = false;
  ui.auditContent.innerHTML = `
    <div class="audit-grid">
      <article>
        <h3>Landmarks</h3>
        <p>Header, navigation, main, footer are present.</p>
      </article>
      <article>
        <h3>Heading Outline</h3>
        <p>h1: Inclusive Decision Lab. h2 panels. h3 section detail.</p>
      </article>
      <article>
        <h3>Contrast Values</h3>
        <p>Body text: 12.6:1 AAA pass</p>
        <p>Buttons: 10.1:1 AAA pass</p>
        <p>Focus outline: 4.8:1 AA pass</p>
      </article>
      <article>
        <h3>Version</h3>
        <p>${VERSION_LABEL}</p>
      </article>
    </div>
  `;
}

function getCompositeScore() {
  return Math.round(
    (state.indicators.accessibility + (100 - state.indicators.legalRisk) + state.indicators.trust + (100 - state.indicators.technicalDebt) + state.indicators.budget) / 5
  );
}

function classifyMaturity(score) {
  if (score >= 70) return "Integrated";
  if (score >= 45) return "Managed";
  return "Reactive";
}

function getScoreBand(score) {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Competent";
  if (score >= 40) return "Developing";
  return "Fragile";
}

function buildFinalEvaluation(score, maturity, result) {
  const strengths = [];
  const concerns = [];
  const advice = [];

  if (state.indicators.accessibility >= 65) strengths.push("You maintained a comparatively strong accessibility baseline.");
  else concerns.push("Accessibility performance remained too exposed to deterioration.");

  if (state.indicators.legalRisk <= 35) strengths.push("Legal exposure stayed relatively contained.");
  else concerns.push("Legal exposure remained too high and should have been reduced earlier.");

  if (state.indicators.trust >= 60) strengths.push("Stakeholder trust was protected across a meaningful portion of the simulation.");
  else concerns.push("Stakeholder trust did not reach a resilient level.");

  if (state.indicators.technicalDebt <= 40) strengths.push("Technical debt was kept within a more manageable range.");
  else concerns.push("Technical debt accumulated and likely constrained future governance options.");

  if (state.indicators.budget <= 25) {
    advice.push("Protect budget earlier so corrective action remains available later in the simulation.");
  }
  if (state.indicators.legalRisk > 40) {
    advice.push("Prioritize decisions that reduce legal risk before pressure compounds through drift.");
  }
  if (state.indicators.technicalDebt > 45) {
    advice.push("Invest earlier in structural remediation instead of repeated short-term patching.");
  }
  if (state.indicators.trust < 60) {
    advice.push("Choose more transparent and participatory actions to strengthen stakeholder trust.");
  }
  if (state.indicators.accessibility < 65) {
    advice.push("Favor decisions that improve accessibility even when they create short-term budget pressure.");
  }
  if (!advice.length) {
    advice.push("Continue balancing long-term accessibility capacity with legal, technical, and budget constraints.");
  }

  const reasoning = result.type === "failure"
    ? "The session ended because one institutional constraint crossed a failure threshold before the system stabilized."
    : "The session reached the end of the simulation with a sustainable, though not necessarily optimal, governance posture.";

  return {
    band: getScoreBand(score),
    reasoning,
    strengths,
    concerns,
    advice: advice.slice(0, 3),
    maturity,
  };
}

function finalizeSimulation(result) {
  const score = getCompositeScore();
  const maturity = classifyMaturity(score);
  const evaluation = buildFinalEvaluation(score, maturity, result);
  state.finalReport = {
    result,
    compositeScore: score,
    maturity,
    evaluation,
    version: LAB_VERSION,
    sessionUUID: state.sessionUUID,
    participantCode: state.settings.anonymizedMode ? undefined : state.participantCode,
    history: state.history,
    indicators: state.indicators,
  };
  ui.endSummary.innerHTML = `
    <p><strong>Outcome:</strong> ${result.reason}</p>
    <p><strong>Overall score:</strong> ${score}/100 (${evaluation.band})</p>
    <p><strong>Governance posture classification:</strong> ${maturity}</p>
    <p><strong>Risk profile:</strong> Legal Risk ${state.indicators.legalRisk}, Trust ${state.indicators.trust}, Technical Debt ${state.indicators.technicalDebt}</p>
    <p><strong>Strategic maturity level:</strong> ${maturity}</p>
    <p><strong>Assessment:</strong> ${evaluation.reasoning}</p>
    <p><strong>Comments:</strong> ${evaluation.strengths[0] || evaluation.concerns[0] || "This run produced a mixed governance profile."}</p>
    <p><strong>Rationale:</strong> ${(evaluation.concerns[0] || evaluation.strengths[1] || "Your decisions created a mixed set of trade-offs across the indicators.")}</p>
    <div>
      <strong>Advice for the next run:</strong>
      <ul>
        ${evaluation.advice.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    </div>
  `;
  const showResearchExports = state.userRole === "research";
  ui.exportJSON.hidden = !showResearchExports;
  ui.exportReport.hidden = !showResearchExports;
  ui.exportCaseStudy.hidden = !showResearchExports;
  ui.exportCSV.hidden = !showResearchExports;
  ui.focusBeforeModal = document.activeElement;
  ui.endScreen.hidden = false;
  ui.endTitle.focus();
}

function getDecisionTimeMs() {
  return Date.now() - (state.scenarioStartedAt || Date.now());
}

function onDecision(choice, scenario) {
  if (state.awaitingNext) return;
  const indicatorBefore = { ...state.indicators };
  const afterDirect = updateIndicators(state.indicators, choice.effects);
  const afterHidden = updateIndicators(afterDirect, choice.hiddenEffects || {});
  const afterDrift = applyDriftRules(afterHidden);
  const combinedDelta = {};
  Object.keys(INITIAL_INDICATORS).forEach((key) => {
    combinedDelta[key] = afterDrift[key] - state.indicators[key];
  });

  state.lastIndicators = { ...state.indicators };
  state.indicators = afterDrift;
  state.hiddenEffects.push({ hiddenReveal: choice.hiddenReveal || "No hidden effect available." });
  state.reflection = buildStrategicReflection(choice, combinedDelta, choice.hiddenReveal || "", scenario, indicatorBefore);

  const decisionTimestamp = new Date().toISOString();
  state.history.push({
    round: state.currentScenarioIndex + 1,
    roundNumber: state.currentScenarioIndex + 1,
    roundID: `round-${state.currentScenarioIndex + 1}`,
    scenarioID: scenario.id,
    decisionID: `${scenario.id}-${scenario.choices.indexOf(choice) + 1}`,
    selectedDecision: choice.text,
    source: choice.text,
    delta: combinedDelta,
    indicatorChanges: combinedDelta,
    indicatorBefore,
    indicatorAfter: { ...afterDrift },
    snapshot: { ...afterDrift },
    decisionTimestamp,
    timestamp: decisionTimestamp,
    timeSpent: getDecisionTimeMs(),
    decisionTime: getDecisionTimeMs(),
    researchMode: state.settings.researchMode,
    accessibilityIndex: afterDrift.accessibility,
    legalRisk: afterDrift.legalRisk,
    stakeholderTrust: afterDrift.trust,
    sessionUUID: state.sessionUUID,
    participantCode: state.participantCode || "",
  });

  renderDashboard();
  renderReflection();
  persistSession();

  state.awaitingNext = true;
  Array.from(ui.choiceList.querySelectorAll("button")).forEach((button) => {
    button.disabled = true;
    if (button.querySelector("strong")?.textContent?.includes(choice.text)) {
      button.classList.add("is-selected");
    }
  });

  const result = evaluateGameEnd(state.indicators, state.currentScenarioIndex + 1);
  if (result.ended) {
    state.pendingEndResult = result;
    ui.nextQuestion.textContent = "View Final Summary";
    ui.nextQuestion.hidden = false;
    return;
  }
  ui.nextQuestion.textContent = "Next Question";
  ui.nextQuestion.hidden = false;
}

function advanceScenario() {
  if (!state.awaitingNext) return;
  if (state.pendingEndResult) {
    ui.criticalStatus.textContent = state.pendingEndResult.reason;
    finalizeSimulation(state.pendingEndResult);
    return;
  }
  state.currentScenarioIndex += 1;
  state.scenarioStartedAt = Date.now();
  state.reflection = null;
  renderScenario();
  renderReflection();
}

function exportResults() {
  const payload = {
    frameworkVersion: LAB_VERSION,
    versionLabel: VERSION_LABEL,
    sessionUUID: state.sessionUUID,
    participantCode: state.settings.anonymizedMode ? undefined : state.participantCode,
    consentGiven: state.consentGiven,
    researchMode: state.settings.researchMode,
    userRole: state.userRole,
    indicators: state.indicators,
    history: state.history,
  };
  downloadFile(PUBLIC_EXPORT_FILENAME, JSON.stringify(payload, null, 2), "application/json");
}

function buildReportHTML(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title></head><body>${body}</body></html>`;
}

function exportAccessibleReport() {
  const body = `
    <h1>Inclusive Decision Lab Accessible Report</h1>
    <p>${VERSION_LABEL}</p>
    <p>Session UUID: ${state.sessionUUID}</p>
    ${state.settings.anonymizedMode ? "" : `<p>Participant Code: ${state.participantCode || "Not provided"}</p>`}
    <h2>Executive Summary</h2>
    <p>This session demonstrates the cumulative effects of accessibility governance decisions under institutional constraint.</p>
    <h2>Outcome</h2>
    <p>${state.finalReport?.result.reason || "In progress"}</p>
  `;
  const report = buildReportHTML("Inclusive Decision Lab Report", body);
  const popup = window.open("", "_blank");
  if (popup) {
    popup.document.write(report);
    popup.document.close();
    popup.focus();
  }
}

function exportCaseStudyReport() {
  const rows = state.history
    .map((entry) => `<tr><td>${entry.roundNumber}</td><td>${entry.selectedDecision}</td><td>${entry.accessibilityIndex}</td><td>${entry.legalRisk}</td><td>${entry.stakeholderTrust}</td></tr>`)
    .join("");
  const body = `
    <h1>Case Study Generated from Inclusive Decision Lab v${LAB_VERSION}</h1>
    <p>${VERSION_LABEL}</p>
    <p>Session UUID: ${state.sessionUUID}</p>
    ${state.settings.anonymizedMode ? "" : `<p>Participant Code: ${state.participantCode || "Not provided"}</p>`}
    <h2>Institutional Interpretation</h2>
    <p>The case illustrates how governance trade-offs shape accessibility capacity, legal exposure, trust, and technical resilience over time.</p>
    <h2>Round-by-Round Summary</h2>
    <table border="1" cellspacing="0" cellpadding="6"><thead><tr><th>Round</th><th>Decision</th><th>Accessibility</th><th>Legal Risk</th><th>Trust</th></tr></thead><tbody>${rows}</tbody></table>
  `;
  const report = buildReportHTML("Inclusive Decision Lab Case Study", body);
  const popup = window.open("", "_blank");
  if (popup) {
    popup.document.write(report);
    popup.document.close();
    popup.focus();
  }
}

function exportResearchCSV() {
  const headers = ["sessionUUID", "participantCode", "round", "decisionTimestamp", "source", "accessibility", "legalRisk", "trust", "technicalDebt", "budget"];
  const rows = state.history.map((entry) => [
    entry.sessionUUID,
    state.settings.anonymizedMode ? "" : (entry.participantCode || ""),
    entry.roundNumber,
    entry.decisionTimestamp,
    `"${String(entry.source).replaceAll('"', '""')}"`,
    entry.snapshot.accessibility,
    entry.snapshot.legalRisk,
    entry.snapshot.trust,
    entry.snapshot.technicalDebt,
    entry.snapshot.budget,
  ].join(","));
  downloadFile(RESEARCH_CSV_FILENAME, [headers.join(","), ...rows].join("\n"), "text/csv;charset=utf-8");
}

function persistSession() {
  const payload = {
    frameworkVersion: LAB_VERSION,
    sessionUUID: state.sessionUUID,
    participantCode: state.participantCode,
    consentGiven: state.consentGiven,
    history: state.history,
    indicators: state.indicators,
    researchMode: state.settings.researchMode,
  };
  window.localStorage.setItem("idl.session", JSON.stringify(payload));
}

function setSpeechState(active) {
  ui.stopReading.hidden = !active;
}

function getEnglishVoice() {
  return speechSynthesis.getVoices().find((voice) => voice.lang && voice.lang.toLowerCase().startsWith("en")) || null;
}

function speakText(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  const voice = getEnglishVoice();
  if (voice) utterance.voice = voice;
  utterance.onend = () => setSpeechState(false);
  utterance.onerror = () => setSpeechState(false);
  state.activeSpeech = utterance;
  setSpeechState(true);
  window.speechSynthesis.speak(utterance);
}

function getScenarioSpeechText() {
  const scenario = state.scenarios[state.currentScenarioIndex];
  if (!scenario) return "No scenario loaded.";
  const choices = scenario.choices.map((choice, index) => `Option ${index + 1}. ${choice.text}.`).join(" ");
  return `Category. ${scenario.category}. Title. ${scenario.title}. Description. ${scenario.description}. Help text. Select one strategic response. ${choices} Choose one option.`;
}

function getReflectionSpeechText() {
  if (!state.reflection) return "No reflection is available yet.";
  const latestEffect = state.hiddenEffects[state.hiddenEffects.length - 1];
  return `Reflection. ${state.settings.plainLanguage ? state.reflection.plain : state.reflection.advanced}. Summary. What improved. ${state.reflection.summary.improved.join(", ") || "No major improvement"}. What worsened. ${state.reflection.summary.worsened.join(", ") || "No major decline"}. What to watch next. ${state.reflection.summary.watch}. ${latestEffect ? `Latest hidden effect. ${latestEffect.hiddenReveal}.` : ""}`;
}

function getIndicatorSpeechText() {
  return getVisibleIndicatorKeys().map((key) => {
    const value = state.indicators[key];
    const status = getIndicatorStatus(key, value);
    return `${INDICATOR_META[key].label}. Value ${value}. Status ${status.label}. ${INDICATOR_META[key].meaning}`;
  }).join(" ");
}

async function sha256(input) {
  const bytes = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function syncResearchAccessUI() {
  formatToggle(ui.toggleResearchMode, "Research Mode", state.settings.researchMode);
  ui.toggleResearchMode.hidden = false;
  ui.toggleAnonymizedMode.hidden = false;
  ui.researchPanel.hidden = !state.settings.researchMode;
  ui.activateResearchMode.textContent = state.settings.researchMode ? "Deactivate Research Mode" : "Activate Research Mode";
  ui.activateResearchMode.setAttribute(
    "aria-label",
    state.settings.researchMode ? "Deactivate Research Mode" : "Activate Research Mode"
  );
}

function setResearchMode(enabled) {
  state.settings.researchMode = enabled;
  state.userRole = enabled ? "research" : "public";
  syncResearchAccessUI();
  renderDashboard();
  renderReflection();
  persistSession();
}

async function promptForResearchCode() {
  const response = window.prompt("Enter research access code");
  if (!response) return false;
  const digest = await sha256(response);
  return digest === RESEARCH_HASH;
}

async function activateResearchAccess() {
  const authorized = await promptForResearchCode();
  if (!authorized) return;
  setResearchMode(!state.settings.researchMode);
}

function activateTab(tabId) {
  ui.tabButtons.forEach((button) => {
    const selected = button.id === tabId;
    button.setAttribute("aria-selected", String(selected));
    button.setAttribute("aria-current", selected ? "page" : "false");
    button.tabIndex = selected ? 0 : -1;
  });
  ui.tabPanels.forEach((panel) => {
    panel.hidden = panel.getAttribute("aria-labelledby") !== tabId;
  });
}

function bindTabs() {
  ui.tabButtons.forEach((button, index) => {
    button.addEventListener("click", () => activateTab(button.id));
    button.addEventListener("keydown", (event) => {
      let nextIndex = index;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % ui.tabButtons.length;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + ui.tabButtons.length) % ui.tabButtons.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = ui.tabButtons.length - 1;
      if (nextIndex !== index) {
        event.preventDefault();
        ui.tabButtons[nextIndex].focus();
        activateTab(ui.tabButtons[nextIndex].id);
      }
    });
  });
}

function applyVisualSettings() {
  document.body.classList.toggle("reduced-motion", state.settings.reducedMotion);
  document.body.classList.toggle("large-text", state.settings.largeText);
  document.body.classList.toggle("high-contrast", state.settings.highContrast);
  document.body.classList.toggle("large-spacing", state.settings.largeSpacing);
  document.body.classList.toggle("enhanced-readability", state.settings.enhancedReadability);
  renderAuditPanel();
}

function bindToggles() {
  const toggleMap = [
    [ui.toggleMotion, "reducedMotion", "Reduced motion"],
    [ui.toggleText, "largeText", "Large text"],
    [ui.togglePlainLanguage, "plainLanguage", "Plain Language Mode"],
    [ui.toggleLowComplexity, "lowComplexity", "Low Complexity Mode"],
    [ui.toggleHighContrast, "highContrast", "High Contrast Theme"],
    [ui.toggleLargeSpacing, "largeSpacing", "Larger Spacing"],
    [ui.toggleEnhancedReadability, "enhancedReadability", "Enhanced Readability Mode"],
    [ui.toggleAnonymizedMode, "anonymizedMode", "Anonymized Dataset Mode"],
    [ui.toggleResearchMode, "researchMode", "Research Mode"],
    [ui.toggleAudit, "auditMode", "Accessibility Audit Mode"],
  ];
  toggleMap.forEach(([button, key, label]) => {
    formatToggle(button, label, state.settings[key]);
    button.addEventListener("click", () => {
      if (key === "researchMode") return;
      state.settings[key] = !state.settings[key];
      formatToggle(button, label, state.settings[key]);
      applyVisualSettings();
      renderDashboard();
      renderReflection();
    });
  });
}

function beginSimulation() {
  if (!ui.consentCheckbox.checked) return;
  state.participantCode = ui.participantCode.value.trim();
  state.consentGiven = true;
  state.sessionUUID = uuidv4();
  state.currentScenarioIndex = 0;
  state.indicators = { ...INITIAL_INDICATORS };
  state.lastIndicators = { ...INITIAL_INDICATORS };
  state.history = [];
  state.hiddenEffects = [];
  state.reflection = null;
  state.finalReport = null;
  state.sessionStartedAt = Date.now();
  state.scenarioStartedAt = Date.now();
  ui.endScreen.hidden = true;
  ui.startScreen.hidden = true;
  ui.simulationShell.hidden = false;
  setDashboardOpen(false);
  renderDashboard();
  renderScenario();
  renderReflection();
  renderAuditPanel();
}

function restartSimulation() {
  ui.endScreen.hidden = true;
  if (state.focusBeforeModal instanceof HTMLElement) {
    state.focusBeforeModal.focus();
  }
  ui.startScreen.hidden = false;
  ui.simulationShell.hidden = true;
  setDashboardOpen(false);
  ui.consentCheckbox.checked = false;
  updateConsentUI();
}

function closeEndScreen() {
  ui.endScreen.hidden = true;
  if (state.focusBeforeModal instanceof HTMLElement) {
    state.focusBeforeModal.focus();
    return;
  }
  ui.scenarioTitle.focus();
}

function bindEvents() {
  ui.consentCheckbox.addEventListener("change", () => {
    updateConsentUI();
  });
  ui.beginSimulation.addEventListener("click", beginSimulation);
  ui.nextQuestion.addEventListener("click", advanceScenario);
  ui.dashboardToggle.addEventListener("click", () => {
    setDashboardOpen(!state.dashboardOpen);
    if (state.dashboardOpen) {
      ui.dashboard.querySelector("h2")?.focus?.();
    } else {
      ui.dashboardToggle.focus();
    }
  });
  ui.dashboardBackdrop.addEventListener("click", () => {
    setDashboardOpen(false);
    ui.dashboardToggle.focus();
  });
  ui.closeEndScreen.addEventListener("click", closeEndScreen);
  ui.restart.addEventListener("click", restartSimulation);
  ui.exportJSON.addEventListener("click", exportResults);
  ui.exportReport.addEventListener("click", exportAccessibleReport);
  ui.exportCaseStudy.addEventListener("click", exportCaseStudyReport);
  ui.exportCSV.addEventListener("click", exportResearchCSV);
  ui.readScenario.addEventListener("click", () => speakText(getScenarioSpeechText()));
  ui.readReflection.addEventListener("click", () => speakText(getReflectionSpeechText()));
  ui.summarizeIndicators.addEventListener("click", () => speakText(getIndicatorSpeechText()));
  ui.stopReading.addEventListener("click", () => {
    window.speechSynthesis.cancel();
    setSpeechState(false);
  });
  ui.activateResearchMode.addEventListener("click", activateResearchAccess);
  ui.toggleResearchMode.addEventListener("click", activateResearchAccess);
  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "r") {
      event.preventDefault();
      activateResearchAccess();
    }
    if (state.settings.auditMode && event.altKey && event.shiftKey && event.key.toLowerCase() === "a") {
      event.preventDefault();
      state.settings.auditMode = !state.settings.auditMode;
      formatToggle(ui.toggleAudit, "Accessibility Audit Mode", state.settings.auditMode);
      renderAuditPanel();
    }
    if (event.key === "Tab" && !ui.endScreen.hidden) {
      const focusables = ui.endScreen.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    if (event.key === "Escape" && !ui.endScreen.hidden) {
      event.preventDefault();
      closeEndScreen();
    }
    if (event.key === "Escape" && state.dashboardOpen) {
      event.preventDefault();
      setDashboardOpen(false);
      ui.dashboardToggle.focus();
    }
  });
}

async function init() {
  bindTabs();
  bindToggles();
  bindEvents();
  applyVisualSettings();
  ui.endScreen.hidden = true;
  syncResearchAccessUI();
  setDashboardOpen(false);
  ui.exportJSON.hidden = true;
  ui.exportReport.hidden = true;
  ui.exportCaseStudy.hidden = true;
  ui.exportCSV.hidden = true;
  updateConsentUI();
  try {
    state.scenarios = await loadScenarios();
  } catch (error) {
    ui.statusRegion.textContent = "Unable to start simulation";
    ui.criticalStatus.textContent = error.message;
  }
}

init();
