const POLL_INTERVAL_MS = 2000;
const STORAGE_KEY = "inclusive_systems_city_session_v1";
const PREFERENCES_KEY = "inclusive_systems_city_preferences_v1";
const PHASE_LABELS = [
  ["crisis_reveal", "Crisis reveal"],
  ["pre_vote", "Secret pre-vote"],
  ["aggregated_reveal", "Aggregated reveal"],
  ["deliberation", "Timed deliberation"],
  ["final_decision", "Final decision"],
  ["indicator_update", "Indicator update"]
];

const INDICATOR_LABELS = {
  inclusion: "Inclusion Index",
  legal_exposure: "Legal Exposure",
  technical_debt: "Technical Debt",
  public_trust: "Public Trust",
  cognitive_load: "Cognitive Load",
  system_stability: "System Stability",
  budget: "Budget"
};

const INDICATOR_HELP = {
  inclusion: { description: "How inclusive and accessible the city services currently are.", direction: "Higher is better." },
  legal_exposure: { description: "How much legal and regulatory risk the city is carrying.", direction: "Lower is better." },
  technical_debt: { description: "How much unfinished technical risk and legacy burden is accumulating.", direction: "Lower is better." },
  public_trust: { description: "How much confidence the public currently has in the system.", direction: "Higher is better." },
  cognitive_load: { description: "How mentally demanding the system is for residents and staff.", direction: "Lower is better." },
  system_stability: { description: "How resilient and operationally stable the city systems are.", direction: "Higher is better." },
  budget: { description: "How much usable financial capacity remains for future decisions.", direction: "Higher is better." }
};

const ROLE_OPTIONS = [
  "Inclusive Design Lead",
  "Legal Counsel",
  "Chief Technology Officer",
  "Community Advocate",
  "Budget Director"
];

const appState = {
  roomId: "",
  participantUUID: "",
  displayName: "",
  room: null,
  draftSelections: {
    preVoteOptionID: "",
    preVoteConfidence: "",
    finalVoteOptionID: "",
    finalVoteConfidence: ""
  },
  pollHandle: null,
  highContrast: false,
  preferences: {
    highContrast: false,
    reducedMotion: false,
    showRoundTimer: false,
    fontScale: 100,
    focusedCards: false
  }
};

const ui = {
  setupShell: document.getElementById("setup-shell"),
  createForm: document.getElementById("create-room-form"),
  joinForm: document.getElementById("join-room-form"),
  createRole: document.getElementById("create-role"),
  joinRole: document.getElementById("join-role"),
  createRoleNote: document.getElementById("create-role-note"),
  joinRoleNote: document.getElementById("join-role-note"),
  setupStatusKicker: document.getElementById("setup-status-kicker"),
  setupRoomId: document.getElementById("setup-room-id"),
  setupParticipants: document.getElementById("setup-participants"),
  setupReadiness: document.getElementById("setup-readiness"),
  setupRoomNote: document.getElementById("setup-room-note"),
  appStatus: document.getElementById("app-status"),
  workspace: document.getElementById("workspace"),
  roomIdValue: document.getElementById("room-id-value"),
  sessionUuidValue: document.getElementById("session-uuid-value"),
  participantRoleValue: document.getElementById("participant-role-value"),
  roundValue: document.getElementById("round-value"),
  participantList: document.getElementById("participant-list"),
  indicatorGrid: document.getElementById("indicator-grid"),
  contrastToggle: document.getElementById("toggle-contrast"),
  prefContrast: document.getElementById("pref-contrast"),
  prefMotion: document.getElementById("pref-motion"),
  prefTimer: document.getElementById("pref-timer"),
  prefFontScale: document.getElementById("pref-font-scale"),
  prefFontScaleValue: document.getElementById("pref-font-scale-value"),
  prefEmphasis: document.getElementById("pref-emphasis"),
  resetPreferences: document.getElementById("reset-preferences"),
  startRoomButton: document.getElementById("start-room"),
  startRoomStatus: document.getElementById("start-room-status"),
  leaveRoomButton: document.getElementById("leave-room"),
  startRoomNote: document.getElementById("start-room-note"),
  copyRoomIdButton: document.getElementById("copy-room-id"),
  phaseTitle: document.getElementById("phase-title"),
  phaseRoundKicker: document.getElementById("phase-round-kicker"),
  phaseDeadlineLabel: document.getElementById("phase-deadline-label"),
  phaseTimer: document.getElementById("phase-timer"),
  phaseTimerToggle: document.getElementById("phase-timer-toggle"),
  phaseModeNote: document.getElementById("phase-mode-note"),
  phaseReadyBar: document.getElementById("phase-ready-bar"),
  phaseReadyPrompt: document.getElementById("phase-ready-prompt"),
  phaseReadyButton: document.getElementById("phase-ready-button"),
  phaseReadyStatus: document.getElementById("phase-ready-status"),
  phaseGuideSidebar: document.getElementById("phase-guide-sidebar"),
  phaseTimerSidebar: document.getElementById("phase-timer-sidebar"),
  phaseTracker: document.getElementById("phase-tracker"),
  roomAlert: document.getElementById("room-alert"),
  lobbyPanel: document.getElementById("lobby-panel"),
  lobbySummary: document.getElementById("lobby-summary"),
  crisisPanel: document.getElementById("crisis-panel"),
  crisisCategory: document.getElementById("crisis-category"),
  crisisTitle: document.getElementById("crisis-title"),
  crisisDescription: document.getElementById("crisis-description"),
  optionList: document.getElementById("option-list"),
  prevotePanel: document.getElementById("prevote-panel"),
  prevoteForm: document.getElementById("prevote-form"),
  prevoteSubmitButton: document.querySelector('#prevote-form button[type="submit"]'),
  prevoteOptions: document.getElementById("prevote-options"),
  prevoteConfidence: document.getElementById("prevote-confidence"),
  prevoteStatus: document.getElementById("prevote-status"),
  aggregatePanel: document.getElementById("aggregate-panel"),
  aggregateChart: document.getElementById("aggregate-chart"),
  divergenceValue: document.getElementById("divergence-value"),
  prevoteCountValue: document.getElementById("prevote-count-value"),
  deliberationPanel: document.getElementById("deliberation-panel"),
  messageForm: document.getElementById("message-form"),
  messageInput: document.getElementById("message-input"),
  messageList: document.getElementById("message-list"),
  finalPanel: document.getElementById("final-panel"),
  finalForm: document.getElementById("final-form"),
  finalSubmitButton: document.querySelector('#final-form button[type="submit"]'),
  finalOptions: document.getElementById("final-options"),
  finalConfidence: document.getElementById("final-confidence"),
  finalStatus: document.getElementById("final-status"),
  expertExplanationPanel: document.getElementById("expert-explanation-panel"),
  expertExplanationText: document.getElementById("expert-explanation-text"),
  impactText: document.getElementById("impact-text"),
  confidenceScoreText: document.getElementById("confidence-score-text"),
  updatePanel: document.getElementById("update-panel"),
  decisionSummary: document.getElementById("decision-summary"),
  outcomeReasoning: document.getElementById("outcome-reasoning"),
  consensusTimeValue: document.getElementById("consensus-time-value"),
  voteShiftValue: document.getElementById("vote-shift-value"),
  updateDivergenceValue: document.getElementById("update-divergence-value"),
  deltaGrid: document.getElementById("delta-grid"),
  completePanel: document.getElementById("complete-panel"),
  completeSummary: document.getElementById("complete-summary"),
  completeScoreValue: document.getElementById("complete-score-value"),
  completeScoreInline: document.getElementById("complete-score-inline"),
  completeIndicatorGrid: document.getElementById("complete-indicator-grid"),
  completeVerdictText: document.getElementById("complete-verdict-text"),
  completeStrengthsList: document.getElementById("complete-strengths-list"),
  completeWatchList: document.getElementById("complete-watch-list"),
  completeRecommendationsList: document.getElementById("complete-recommendations-list"),
  tabs: Array.from(document.querySelectorAll('[role="tab"]')),
  tabPanels: Array.from(document.querySelectorAll('[role="tabpanel"]'))
};

function initRoleOptions() {
  for (const select of [ui.createRole, ui.joinRole]) {
    select.innerHTML = "";
    for (const role of ROLE_OPTIONS) {
      const option = document.createElement("option");
      option.value = role;
      option.textContent = role;
      select.appendChild(option);
    }
  }
}

function loadSession() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    if (stored.roomId && stored.participantUUID) {
      appState.roomId = stored.roomId;
      appState.participantUUID = stored.participantUUID;
      appState.displayName = stored.displayName || "";
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function saveSession() {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      roomId: appState.roomId,
      participantUUID: appState.participantUUID,
      displayName: appState.displayName
    })
  );
}

function setSimulationView(mode) {
  const showSetup = mode === "setup";
  ui.setupShell.hidden = !showSetup;
  ui.workspace.hidden = showSetup;
}

function clearPhasePanels() {
  [
    ui.lobbyPanel,
    ui.crisisPanel,
    ui.prevotePanel,
    ui.aggregatePanel,
    ui.deliberationPanel,
    ui.finalPanel,
    ui.expertExplanationPanel,
    ui.updatePanel,
    ui.completePanel
  ].forEach((panel) => {
    panel.hidden = true;
  });
}

function activateTab(tabId) {
  ui.tabs.forEach((tab) => {
    const selected = tab.id === tabId;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  ui.tabPanels.forEach((panel) => {
    const visible = panel.getAttribute("aria-labelledby") === tabId;
    panel.hidden = !visible;
    panel.classList.toggle("is-active", visible);
  });
}

function syncTabOrientation() {
  const tablist = document.querySelector('[role="tablist"]');
  if (!tablist) return;
  tablist.setAttribute("aria-orientation", "horizontal");
}

function bindTabs() {
  syncTabOrientation();
  window.addEventListener("resize", syncTabOrientation);
  ui.tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab.id));
    tab.addEventListener("keydown", (event) => {
      if (
        event.key !== "ArrowRight" &&
        event.key !== "ArrowLeft" &&
        event.key !== "ArrowDown" &&
        event.key !== "ArrowUp" &&
        event.key !== "Home" &&
        event.key !== "End"
      ) {
        return;
      }
      event.preventDefault();
      let targetIndex = index;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        targetIndex = (index + 1) % ui.tabs.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        targetIndex = (index - 1 + ui.tabs.length) % ui.tabs.length;
      } else if (event.key === "Home") {
        targetIndex = 0;
      } else if (event.key === "End") {
        targetIndex = ui.tabs.length - 1;
      }
      ui.tabs[targetIndex].focus();
      activateTab(ui.tabs[targetIndex].id);
    });
  });
}

function loadPreferences() {
  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return;
    appState.preferences = { ...appState.preferences, ...JSON.parse(raw) };
  } catch {
    window.localStorage.removeItem(PREFERENCES_KEY);
  }
}

function persistPreferences() {
  window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(appState.preferences));
}

function setStatus(message, isError = false) {
  ui.appStatus.textContent = message;
  ui.appStatus.style.borderColor = isError ? "#d2a1aa" : "#b5c5d2";
  ui.appStatus.style.background = isError ? "#fbf3f5" : "#f9fcff";
}

function clearSessionState(message = "You left the room.") {
  appState.roomId = "";
  appState.participantUUID = "";
  appState.displayName = "";
  appState.room = null;
  appState.draftSelections = {
    preVoteOptionID: "",
    preVoteConfidence: "",
    finalVoteOptionID: "",
    finalVoteConfidence: ""
  };
  window.localStorage.removeItem(STORAGE_KEY);
  if (appState.pollHandle) {
    window.clearInterval(appState.pollHandle);
    appState.pollHandle = null;
  }
  renderSetupSnapshot(null);
  setSimulationView("setup");
  setStatus(message);
}

function clearFieldError(field, note) {
  if (!field || !note) return;
  field.classList.remove("field-error");
  field.setAttribute("aria-invalid", "false");
  note.hidden = true;
  note.textContent = "";
}

function showFieldError(field, note, message) {
  if (!field || !note) return;
  field.classList.add("field-error");
  field.setAttribute("aria-invalid", "true");
  note.hidden = false;
  note.textContent = message;
}

function clearRoleFieldErrors() {
  clearFieldError(ui.createRole, ui.createRoleNote);
  clearFieldError(ui.joinRole, ui.joinRoleNote);
}

async function requestJSON(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

function renderParticipants(room) {
  ui.participantList.innerHTML = "";
  for (const participant of room.participants) {
    const li = document.createElement("li");
    const hostBadge = participant.isHost ? '<span class="participant-badge">Host</span>' : "";
    const youBadge = participant.participantUUID === appState.participantUUID ? '<span class="participant-badge">You</span>' : "";
    li.innerHTML = `
      <strong>${participant.displayName}</strong> ${hostBadge} ${youBadge}
      <div>${participant.role}</div>
    `;
    ui.participantList.appendChild(li);
  }
}

function renderSetupSnapshot(room) {
  if (!room) {
    ui.setupStatusKicker.textContent = "No active room";
    ui.setupRoomId.textContent = "Not connected";
    ui.setupParticipants.textContent = "0 of 0";
    ui.setupReadiness.textContent = "Create or join a room to begin.";
    ui.setupRoomNote.textContent = "This panel updates as soon as you create or join a room so you can immediately see capacity and start status.";
    return;
  }

  const participantCount = room.participants.length;
  ui.setupStatusKicker.textContent = room.status === "lobby" ? "Room connected" : "Session in progress";
  ui.setupRoomId.textContent = room.roomID;
  ui.setupParticipants.textContent = `${participantCount} of ${room.maxPlayers}`;
  ui.setupReadiness.textContent = room.status === "lobby"
    ? participantCount >= 2
      ? participantCount >= room.maxPlayers
        ? "Ready to start. Room is full."
        : "Ready to start."
      : `Waiting for ${Math.max(0, 2 - participantCount)} more participant(s).`
    : "Room already active.";
  ui.setupRoomNote.textContent = room.status === "lobby"
    ? room.self.isHost
      ? "You can track room capacity here before launching the session."
      : "You are connected. Wait here while the host reviews room capacity and starts the session."
    : "Room progress is now live in the simulation workspace below.";
}

function formatIndicatorValue(key, value) {
  if (key === "budget") {
    return `${value}`;
  }
  return `${value}`;
}

function renderIndicators(room) {
  ui.indicatorGrid.innerHTML = "";
  for (const [key, label] of Object.entries(INDICATOR_LABELS)) {
    const value = room.indicators[key];
    const help = INDICATOR_HELP[key];
    const card = document.createElement("article");
    card.className = "indicator";
    card.innerHTML = `
      <div class="indicator-row">
        <strong>${label}</strong>
        <span class="indicator-score-wrap">
          <span class="indicator-score">${formatIndicatorValue(key, value)}/100</span>
        </span>
      </div>
      <p class="indicator-description">${help.description}</p>
      <p class="indicator-direction">${help.direction}</p>
    `;
    ui.indicatorGrid.appendChild(card);
  }
}

function renderPhaseTracker(phase) {
  ui.phaseTracker.innerHTML = "";
  const currentPhaseIndex = PHASE_LABELS.findIndex(([key]) => key === phase);
  for (const [index, [key, label]] of PHASE_LABELS.entries()) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="phase-step-label">${label}</span>`;
    if (currentPhaseIndex > -1 && index < currentPhaseIndex) {
      li.classList.add("is-complete");
    }
    if (key === phase) {
      li.classList.add("is-active");
      li.setAttribute("aria-current", "step");
    }
    ui.phaseTracker.appendChild(li);
  }
}

function renderOptions(container, crisis, inputName, selectedValue) {
  container.innerHTML = "";
  const renderedLabels = [];
  for (const option of crisis.options) {
    const label = document.createElement("label");
    label.className = "scenario-choice-card";
    if (selectedValue === option.id) {
      label.classList.add("is-selected");
    }
    label.innerHTML = `
      <input type="radio" name="${inputName}" value="${option.id}" ${selectedValue === option.id ? "checked" : ""}>
      <span class="scenario-choice-title">${option.title}</span>
      <span class="scenario-choice-copy">${option.neutralDescription}</span>
    `;
    renderedLabels.push(label);
    container.appendChild(label);
  }

  const syncSelectedState = () => {
    renderedLabels.forEach((label) => {
      const input = label.querySelector("input");
      label.classList.toggle("is-selected", Boolean(input?.checked));
    });
  };

  renderedLabels.forEach((label) => {
    const input = label.querySelector("input");
    if (!input) return;
    input.addEventListener("change", syncSelectedState);
  });

  syncSelectedState();
}

function findOption(crisis, optionID) {
  return crisis?.options?.find((option) => option.id === optionID) || null;
}

function renderExpertExplanation(crisis, optionID, confidenceScore) {
  const option = findOption(crisis, optionID);
  if (!option) {
    ui.expertExplanationPanel.hidden = true;
    ui.expertExplanationText.textContent = "";
    ui.impactText.textContent = "";
    ui.confidenceScoreText.textContent = "";
    return;
  }
  ui.expertExplanationPanel.hidden = false;
  ui.expertExplanationText.textContent = option.expertExplanation;
  ui.impactText.textContent = option.impact;
  ui.confidenceScoreText.textContent = confidenceScore ? `${confidenceScore} / 5` : "Not recorded";
}

function renderCrisis(room) {
  const crisis = room.currentCrisis;
  if (!crisis) return;
  ui.crisisCategory.textContent = crisis.category;
  ui.crisisTitle.textContent = crisis.title;
  ui.crisisDescription.textContent = crisis.neutralDescription;
  ui.optionList.innerHTML = "";
  for (const option of crisis.options) {
    const article = document.createElement("article");
    article.className = "option-card";
    article.innerHTML = `
      <strong class="scenario-choice-title">${option.title}</strong>
      <p>${option.neutralDescription}</p>
      <p class="assistive-note">${option.publicNote}</p>
    `;
    ui.optionList.appendChild(article);
  }
}

function renderAggregate(room) {
  const summary = room.roundSummary?.preVoteSummary || [];
  ui.aggregateChart.innerHTML = "";
  for (const row of summary) {
    const percentage = row.total > 0 ? Math.round((row.count / row.total) * 100) : 0;
    const div = document.createElement("div");
    div.className = "aggregate-row";
    div.innerHTML = `
      <strong>${row.optionTitle}</strong>
      <span>${row.count} of ${row.total} pre-votes</span>
      <div class="aggregate-bar"><span style="width:${percentage}%"></span></div>
    `;
    ui.aggregateChart.appendChild(div);
  }
  ui.divergenceValue.textContent = (room.roundSummary?.divergenceIndex || 0).toFixed(2);
  ui.prevoteCountValue.textContent = String(room.roundSummary?.preVoteCount || 0);
}

function renderMessages(room) {
  ui.messageList.innerHTML = "";
  const messages = room.messages || [];
  if (!messages.length) {
    const li = document.createElement("li");
    li.textContent = "No deliberation notes have been posted yet.";
    ui.messageList.appendChild(li);
    return;
  }
  for (const message of messages) {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${message.displayName}</strong> <span class="participant-badge">${message.role}</span>
      <time datetime="${message.isoTime}">${message.displayTime}</time>
      <div>${message.body}</div>
    `;
    ui.messageList.appendChild(li);
  }
}

function renderUpdate(room) {
  const summary = room.roundSummary || {};
  const winningOption = summary.winningOptionTitle || "No decision";
  ui.decisionSummary.textContent = `Final room decision: ${winningOption}. ${summary.updateNarrative || ""}`;
  ui.outcomeReasoning.textContent = summary.updateNarrative
    ? `Why this outcome happened: ${summary.updateNarrative}`
    : "Why this outcome happened: the final room decision changed the city systems according to the option the group selected.";
  ui.consensusTimeValue.textContent = summary.consensusTimeMs ? formatDuration(summary.consensusTimeMs) : "No consensus threshold reached";
  ui.voteShiftValue.textContent = String(summary.voteShiftCount || 0);
  ui.updateDivergenceValue.textContent = (summary.divergenceIndex || 0).toFixed(2);
  ui.deltaGrid.innerHTML = "";
  const delta = summary.indicatorDelta || {};
  for (const [key, label] of Object.entries(INDICATOR_LABELS)) {
    const value = Number(delta[key] || 0);
    const card = document.createElement("article");
    card.className = "delta-card";
    const className = value > 0 ? "delta-positive" : value < 0 ? "delta-negative" : "delta-neutral";
    const prefix = value > 0 ? "+" : "";
    card.innerHTML = `
      <header>
        <strong>${label}</strong>
        <span class="${className}">${prefix}${value}</span>
      </header>
    `;
    ui.deltaGrid.appendChild(card);
  }
}

function normalizeIndicatorScore(key, value) {
  if (key === "legal_exposure" || key === "technical_debt" || key === "cognitive_load") {
    return Math.max(0, Math.min(100, 100 - Number(value || 0)));
  }
  return Math.max(0, Math.min(100, Number(value || 0)));
}

function buildFallbackCompletionReport(indicators) {
  const scores = Object.entries(INDICATOR_LABELS).map(([key, label]) => ({
    key,
    label,
    rawValue: Number(indicators?.[key] || 0),
    normalizedScore: normalizeIndicatorScore(key, indicators?.[key] || 0),
    direction: INDICATOR_HELP[key].direction
  }));

  const overallScore = Math.round(
    scores.reduce((sum, item) => sum + item.normalizedScore, 0) / Math.max(1, scores.length)
  );

  return {
    overallScore,
    categoryScores: scores
  };
}

function renderCompletion(room) {
  const fallback = buildFallbackCompletionReport(room.indicators || {});
  const report = room.completionReport || {};
  ui.completeSummary.textContent = room.completionSummary || "All twenty crises have been resolved.";
  const scoreText = `${report.overallScore ?? fallback.overallScore} / 100`;
  if (ui.completeScoreValue) {
    ui.completeScoreValue.textContent = scoreText;
  }
  ui.completeScoreInline.textContent = scoreText;
  ui.completeVerdictText.textContent = report.verdict || "The team completed the full campaign and can now review where the city remained strong and where future rounds could improve.";

  const categoryScores = report.categoryScores || fallback.categoryScores;
  ui.completeIndicatorGrid.innerHTML = "";
  for (const item of categoryScores) {
    const article = document.createElement("article");
    article.className = "indicator";
    article.innerHTML = `
      <div class="indicator-row">
        <strong>${item.label}</strong>
        <span class="indicator-score">${item.normalizedScore}/100</span>
      </div>
      <p class="indicator-description">Final system state: ${item.rawValue}/100.</p>
      <p class="indicator-direction">${item.direction}</p>
    `;
    ui.completeIndicatorGrid.appendChild(article);
  }

  const renderList = (element, items, fallback) => {
    element.innerHTML = "";
    for (const item of (items && items.length ? items : [fallback])) {
      const li = document.createElement("li");
      li.textContent = item;
      element.appendChild(li);
    }
  };

  renderList(
    ui.completeStrengthsList,
    report.strengths,
    "The team maintained workable conditions across several city systems."
  );
  renderList(
    ui.completeWatchList,
    report.watchAreas,
    "No single system collapsed, but future rounds can still improve the balance."
  );
  renderList(
    ui.completeRecommendationsList,
    report.recommendations,
    "Use the city systems as an earlier decision check before committing to the final response."
  );
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function updateTimer(room) {
  const isHost = Boolean(room.self?.isHost);
  const isTimed = Boolean(room.timerEnabled);
  const readyEligible = Boolean(room.phaseReadyEligible);
  const readyCount = Number(room.phaseReadyCount || 0);
  const readyTotal = Number(room.phaseReadyTotal || room.participants?.length || 0);

  ui.phaseModeNote.textContent = isTimed
    ? "Timed mode moves the round forward automatically when the countdown ends."
    : "Untimed mode keeps the group together. The next step opens only after everyone is ready.";

  ui.phaseTimerToggle.hidden = room.status === "completed";
  ui.phaseTimerToggle.disabled = !isHost || room.status !== "active";
  ui.phaseTimerToggle.setAttribute("aria-pressed", String(isTimed));
  ui.phaseTimerToggle.textContent = room.status !== "active"
    ? "Available after launch"
    : isTimed ? "Turn off timer" : "Turn on timer";

  if (isTimed) {
    ui.phaseReadyBar.hidden = true;
    ui.phaseReadyButton.hidden = true;
    ui.phaseReadyStatus.textContent = isHost
      ? "The host can switch to untimed mode if the group needs more reading or discussion time."
      : "The host controls timed mode for the room.";
    if (!room.phaseDeadlineMs) {
      ui.phaseDeadlineLabel.textContent = room.status === "lobby" ? "Waiting for host" : "No active timer";
      ui.phaseTimer.textContent = "--";
      return;
    }
    const remaining = Math.max(0, room.phaseDeadlineMs - Date.now());
    ui.phaseDeadlineLabel.textContent = "Time remaining";
    ui.phaseTimer.textContent = formatDuration(remaining);
    return;
  }

  ui.phaseDeadlineLabel.textContent = room.status === "lobby" ? "Available after launch" : "Manual group advance";
  ui.phaseTimer.textContent = "Off";
  ui.phaseReadyBar.hidden = !readyEligible;
  ui.phaseReadyButton.hidden = !readyEligible;
  if (readyEligible) {
    ui.phaseReadyButton.disabled = false;
    ui.phaseReadyButton.textContent = room.self.phaseReady ? "Not ready yet" : "Ready to continue";
    ui.phaseReadyPrompt.textContent = room.self.phaseReady
      ? "You have confirmed that you are ready. You can still switch back if the group needs more time."
      : "Each player must confirm separately. The room moves forward only after every participant has confirmed readiness.";
    ui.phaseReadyStatus.textContent = `${readyCount} of ${readyTotal} participants have confirmed. The next phase opens only when all players are ready.`;
  } else if (room.phase === "pre_vote") {
    ui.phaseReadyBar.hidden = true;
    ui.phaseReadyStatus.textContent = "This step advances after everyone submits a private pre-vote.";
  } else if (room.phase === "final_decision") {
    ui.phaseReadyBar.hidden = true;
    ui.phaseReadyStatus.textContent = "This step advances after everyone submits a final decision.";
  } else if (room.status === "lobby") {
    ui.phaseReadyBar.hidden = true;
    ui.phaseReadyStatus.textContent = "The host starts the room from Mission Control.";
  } else {
    ui.phaseReadyBar.hidden = true;
    ui.phaseReadyStatus.textContent = "This phase will open the next step once the room is ready.";
  }
}

function renderRoom(room) {
  appState.room = room;
  renderSetupSnapshot(room);
  setSimulationView("connected");
  ui.phaseGuideSidebar.hidden = false;
  ui.phaseTimerSidebar.hidden = false;
  ui.roomIdValue.textContent = room.roomID;
  ui.sessionUuidValue.textContent = room.sessionUUID;
  ui.participantRoleValue.textContent = room.self.role;
  ui.roundValue.textContent = room.status === "completed" ? "20 / 20" : `${room.currentRound} / 20`;
  ui.phaseRoundKicker.textContent = room.status === "completed" ? "Round 20 of 20" : `Round ${room.currentRound} of 20`;
  ui.startRoomButton.hidden = room.status !== "lobby";
  ui.startRoomButton.textContent = "Launch mission";
  ui.startRoomButton.disabled = !(room.self.isHost && room.participants.length >= 2 && room.participants.length <= room.maxPlayers);
  ui.startRoomStatus.hidden = true;
  ui.startRoomStatus.textContent = "";
  ui.startRoomNote.textContent = "";
  if (room.status === "lobby") {
    if (room.self.isHost) {
      ui.startRoomNote.textContent = room.participants.length >= 2
        ? "The room is ready. Launch the session when everyone is prepared."
        : `Waiting for ${Math.max(0, 2 - room.participants.length)} more participant(s) before launch.`;
    } else {
      ui.startRoomButton.hidden = true;
      ui.startRoomStatus.hidden = false;
      ui.startRoomStatus.textContent = room.participants.length >= 2 ? "Wait for the host to launch mission..." : "Waiting for room...";
      ui.startRoomNote.textContent = room.participants.length >= 2
        ? "The room is ready. Wait here for the host to launch mission."
        : "Stay connected while the host fills the room and starts the session.";
    }
  }
  ui.roomAlert.textContent = room.statusMessage || "";

  renderParticipants(room);
  renderIndicators(room);
  renderPhaseTracker(room.phase);
  updateTimer(room);

  clearPhasePanels();
  if (room.status === "lobby") {
    ui.phaseTitle.textContent = "Lobby";
    ui.lobbyPanel.hidden = false;
    ui.lobbySummary.textContent = `Participants: ${room.participants.length} of ${room.maxPlayers}. The host can start once at least two players are present.`;
    return;
  }

  if (room.status === "completed") {
    ui.phaseTitle.textContent = "Simulation complete";
    ui.phaseGuideSidebar.hidden = true;
    ui.phaseTimerSidebar.hidden = true;
    ui.completePanel.hidden = false;
    renderCompletion(room);
    return;
  }

  const phaseLabel = PHASE_LABELS.find(([key]) => key === room.phase)?.[1] || room.phase;
  ui.phaseTitle.textContent = phaseLabel;
  renderCrisis(room);

  if (room.phase === "crisis_reveal") {
    appState.draftSelections.preVoteOptionID = "";
    appState.draftSelections.preVoteConfidence = "";
    appState.draftSelections.finalVoteOptionID = "";
    appState.draftSelections.finalVoteConfidence = "";
    ui.crisisPanel.hidden = false;
  } else if (room.phase === "pre_vote") {
    ui.crisisPanel.hidden = false;
    ui.prevotePanel.hidden = false;
    const selectedPreVoteOptionID = room.self.preVoteSubmitted
      ? (room.self.preVoteOptionID || "")
      : (appState.draftSelections.preVoteOptionID || room.self.preVoteOptionID || "");
    const selectedPreVoteConfidence = room.self.preVoteSubmitted
      ? (room.self.preVoteConfidence ? String(room.self.preVoteConfidence) : "")
      : (appState.draftSelections.preVoteConfidence || (room.self.preVoteConfidence ? String(room.self.preVoteConfidence) : ""));
    renderOptions(ui.prevoteOptions, room.currentCrisis, "prevoteOption", selectedPreVoteOptionID);
    ui.prevoteConfidence.value = selectedPreVoteConfidence;
    ui.prevoteSubmitButton.disabled = Boolean(room.self.preVoteSubmitted);
    ui.prevoteStatus.textContent = room.self.preVoteSubmitted ? "Your pre-vote has been recorded confidentially." : "Your pre-vote remains private until the aggregated reveal.";
  } else if (room.phase === "aggregated_reveal") {
    appState.draftSelections.preVoteOptionID = room.self.preVoteOptionID || "";
    appState.draftSelections.preVoteConfidence = room.self.preVoteConfidence ? String(room.self.preVoteConfidence) : "";
    ui.crisisPanel.hidden = false;
    ui.aggregatePanel.hidden = false;
    renderAggregate(room);
  } else if (room.phase === "deliberation") {
    ui.crisisPanel.hidden = false;
    ui.aggregatePanel.hidden = false;
    ui.deliberationPanel.hidden = false;
    renderAggregate(room);
    renderMessages(room);
  } else if (room.phase === "final_decision") {
    ui.crisisPanel.hidden = false;
    ui.aggregatePanel.hidden = false;
    ui.finalPanel.hidden = false;
    renderAggregate(room);
    const selectedFinalVoteOptionID = room.self.finalVoteSubmitted
      ? (room.self.finalVoteOptionID || "")
      : (appState.draftSelections.finalVoteOptionID || room.self.finalVoteOptionID || "");
    const selectedFinalVoteConfidence = room.self.finalVoteSubmitted
      ? (room.self.finalVoteConfidence ? String(room.self.finalVoteConfidence) : "")
      : (appState.draftSelections.finalVoteConfidence || (room.self.finalVoteConfidence ? String(room.self.finalVoteConfidence) : ""));
    renderOptions(ui.finalOptions, room.currentCrisis, "finalOption", selectedFinalVoteOptionID);
    ui.finalConfidence.value = selectedFinalVoteConfidence;
    ui.finalSubmitButton.disabled = Boolean(room.self.finalVoteSubmitted);
    ui.finalStatus.textContent = room.self.finalVoteSubmitted
      ? room.self.voteShift
        ? "Final vote received. Your final vote differs from your pre-vote."
        : "Final vote received."
      : "Submit a final vote before the countdown ends.";
  } else if (room.phase === "indicator_update") {
    appState.draftSelections.finalVoteOptionID = room.self.finalVoteOptionID || "";
    appState.draftSelections.finalVoteConfidence = room.self.finalVoteConfidence ? String(room.self.finalVoteConfidence) : "";
    ui.updatePanel.hidden = false;
    renderUpdate(room);
    renderExpertExplanation(room.currentCrisis, room.self.finalVoteOptionID || room.roundSummary?.winningOptionID, room.self.finalVoteConfidence);
  }
}

function applyHighContrast(enabled) {
  appState.highContrast = enabled;
  document.body.classList.toggle("high-contrast", enabled);
  ui.contrastToggle.setAttribute("aria-pressed", String(enabled));
  ui.contrastToggle.textContent = `High contrast mode: ${enabled ? "On" : "Off"}`;
  if (ui.prefContrast) {
    ui.prefContrast.checked = enabled;
  }
}

function applyPreferences() {
  const preferences = appState.preferences;
  applyHighContrast(preferences.highContrast);
  document.body.classList.toggle("reduced-motion", preferences.reducedMotion);
  document.body.classList.toggle("focused-cards", preferences.focusedCards);
  document.documentElement.style.setProperty("--font-scale", `${preferences.fontScale}%`);
  if (ui.prefMotion) {
    ui.prefMotion.checked = preferences.reducedMotion;
  }
  if (ui.prefTimer) {
    ui.prefTimer.checked = preferences.showRoundTimer;
  }
  if (ui.prefFontScale) {
    ui.prefFontScale.value = String(preferences.fontScale);
  }
  if (ui.prefFontScaleValue) {
    ui.prefFontScaleValue.textContent = `${preferences.fontScale}%`;
  }
  if (ui.prefEmphasis) {
    ui.prefEmphasis.checked = preferences.focusedCards;
  }
}

function updatePreference(key, value) {
  appState.preferences[key] = value;
  persistPreferences();
  applyPreferences();
}

function resetPreferences() {
  appState.preferences = {
    highContrast: false,
    reducedMotion: false,
    showRoundTimer: false,
    fontScale: 100,
    focusedCards: false
  };
  persistPreferences();
  applyPreferences();
}

async function pollState() {
  if (!appState.roomId || !appState.participantUUID) {
    return false;
  }
  try {
    const query = new URLSearchParams({
      roomId: appState.roomId,
      participantUUID: appState.participantUUID
    });
    const data = await requestJSON(`/api/rooms/state?${query.toString()}`, { method: "GET" });
    renderRoom(data.room);
    return true;
  } catch (error) {
    if (error.message === "Room membership not found." || error.message === "Room not found.") {
      clearSessionState("The host ended the room. You were returned to the simulation home.");
      return false;
    }
    if (!appState.room && error.message === "Failed to fetch") {
      clearSessionState("Could not reconnect to the server. Create or join a room to continue.");
      setStatus("Could not reconnect to the server. Create or join a room to continue.", true);
      return false;
    }
    setStatus(error.message, true);
    return false;
  }
}

function startPolling() {
  if (appState.pollHandle) {
    window.clearInterval(appState.pollHandle);
  }
  appState.pollHandle = window.setInterval(() => {
    pollState();
  }, POLL_INTERVAL_MS);
}

async function handleCreateOrJoin(url, payload) {
  const data = await requestJSON(url, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  appState.roomId = data.room.roomID;
  appState.participantUUID = data.room.self.participantUUID;
  appState.displayName = data.room.self.displayName;
  saveSession();
  setStatus(`Connected to room ${appState.roomId}.`);
  renderRoom(data.room);
  startPolling();
}

function getSelectedRadio(name) {
  const input = document.querySelector(`input[name="${name}"]:checked`);
  return input ? input.value : "";
}

async function submitVote(kind) {
  const isPre = kind === "pre";
  const optionID = getSelectedRadio(isPre ? "prevoteOption" : "finalOption");
  const confidence = Number(isPre ? ui.prevoteConfidence.value : ui.finalConfidence.value);
  const submitButton = isPre ? ui.prevoteSubmitButton : ui.finalSubmitButton;
  if (!optionID || !confidence) {
    setStatus("Select an option and confidence rating before submitting.", true);
    return;
  }
  submitButton.disabled = true;
  await requestJSON(`/api/rooms/${isPre ? "pre-vote" : "final-vote"}`, {
    method: "POST",
    body: JSON.stringify({
      roomId: appState.roomId,
      participantUUID: appState.participantUUID,
      optionID,
      confidenceRating: confidence
    })
  });
  if (isPre) {
    appState.draftSelections.preVoteOptionID = optionID;
    appState.draftSelections.preVoteConfidence = String(confidence);
  } else {
    appState.draftSelections.finalVoteOptionID = optionID;
    appState.draftSelections.finalVoteConfidence = String(confidence);
  }
  await pollState();
}

async function bindEvents() {
  ui.createRole.addEventListener("change", () => clearFieldError(ui.createRole, ui.createRoleNote));
  ui.joinRole.addEventListener("change", () => clearFieldError(ui.joinRole, ui.joinRoleNote));

  ui.createForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearRoleFieldErrors();
    const form = new FormData(ui.createForm);
    try {
      await handleCreateOrJoin("/api/rooms/create", {
        displayName: String(form.get("displayName") || "").trim(),
        role: String(form.get("role") || ""),
        maxPlayers: Number(form.get("maxPlayers") || 4)
      });
    } catch (error) {
      if (error.message === "That role is already assigned in this room.") {
        showFieldError(ui.createRole, ui.createRoleNote, error.message);
      }
      setStatus(error.message, true);
    }
  });

  ui.joinForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearRoleFieldErrors();
    const form = new FormData(ui.joinForm);
    try {
      await handleCreateOrJoin("/api/rooms/join", {
        roomId: String(form.get("roomId") || "").trim().toUpperCase(),
        displayName: String(form.get("displayName") || "").trim(),
        role: String(form.get("role") || "")
      });
    } catch (error) {
      if (error.message === "That role is already assigned in this room.") {
        showFieldError(ui.joinRole, ui.joinRoleNote, error.message);
      }
      setStatus(error.message, true);
    }
  });

  ui.startRoomButton.addEventListener("click", async () => {
    try {
      await requestJSON("/api/rooms/start", {
        method: "POST",
        body: JSON.stringify({
          roomId: appState.roomId,
          participantUUID: appState.participantUUID
        })
      });
      await pollState();
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  ui.leaveRoomButton.addEventListener("click", async () => {
    if (!appState.roomId || !appState.participantUUID) {
      clearSessionState();
      return;
    }
    try {
      await requestJSON("/api/rooms/leave", {
        method: "POST",
        body: JSON.stringify({
          roomId: appState.roomId,
          participantUUID: appState.participantUUID
        })
      });
      clearSessionState("You left the room.");
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  ui.copyRoomIdButton.addEventListener("click", async () => {
    if (!appState.roomId) return;
    try {
      await navigator.clipboard.writeText(appState.roomId);
      setStatus(`Room ID ${appState.roomId} copied.`);
    } catch {
      setStatus(`Room ID: ${appState.roomId}`);
    }
  });

  ui.contrastToggle.addEventListener("click", () => {
    updatePreference("highContrast", !appState.preferences.highContrast);
  });

  ui.prefContrast.addEventListener("change", (event) => {
    updatePreference("highContrast", event.target.checked);
  });

  ui.prefMotion.addEventListener("change", (event) => {
    updatePreference("reducedMotion", event.target.checked);
  });

  ui.prefTimer.addEventListener("change", (event) => {
    updatePreference("showRoundTimer", event.target.checked);
  });

  ui.phaseTimerToggle.addEventListener("click", async () => {
    if (!appState.room || !appState.room.self.isHost) return;
    try {
      const data = await requestJSON("/api/rooms/timer-mode", {
        method: "POST",
        body: JSON.stringify({
          roomId: appState.roomId,
          participantUUID: appState.participantUUID,
          timerEnabled: !appState.room.timerEnabled
        })
      });
      renderRoom(data.room);
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  ui.phaseReadyButton.addEventListener("click", async () => {
    if (!appState.room || !appState.room.phaseReadyEligible) return;
    try {
      const data = await requestJSON("/api/rooms/ready", {
        method: "POST",
        body: JSON.stringify({
          roomId: appState.roomId,
          participantUUID: appState.participantUUID,
          isReady: !appState.room.self.phaseReady
        })
      });
      renderRoom(data.room);
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  ui.prefFontScale.addEventListener("input", (event) => {
    updatePreference("fontScale", Number(event.target.value));
  });

  ui.prefEmphasis.addEventListener("change", (event) => {
    updatePreference("focusedCards", event.target.checked);
  });

  ui.resetPreferences.addEventListener("click", () => {
    resetPreferences();
  });

  ui.prevoteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await submitVote("pre");
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  ui.finalForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await submitVote("final");
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  ui.prevoteOptions.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.name !== "prevoteOption") return;
    appState.draftSelections.preVoteOptionID = target.value;
  });

  ui.prevoteConfidence.addEventListener("change", () => {
    appState.draftSelections.preVoteConfidence = ui.prevoteConfidence.value;
  });

  ui.finalOptions.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.name !== "finalOption") return;
    appState.draftSelections.finalVoteOptionID = target.value;
  });

  ui.finalConfidence.addEventListener("change", () => {
    appState.draftSelections.finalVoteConfidence = ui.finalConfidence.value;
  });

  ui.messageForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = ui.messageInput.value.trim();
    if (!body) {
      setStatus("Enter a deliberation note before posting.", true);
      return;
    }
    try {
      await requestJSON("/api/rooms/message", {
        method: "POST",
        body: JSON.stringify({
          roomId: appState.roomId,
          participantUUID: appState.participantUUID,
          body
        })
      });
      ui.messageInput.value = "";
      await pollState();
    } catch (error) {
      setStatus(error.message, true);
    }
  });
}

async function init() {
  initRoleOptions();
  loadPreferences();
  applyPreferences();
  bindTabs();
  activateTab("tab-overview");
  loadSession();
  renderSetupSnapshot(null);
  setSimulationView("setup");
  bindEvents();
  if (appState.roomId && appState.participantUUID) {
    setStatus(`Restoring room ${appState.roomId}...`);
    const restored = await pollState();
    if (restored) {
      startPolling();
    }
  }
  window.setInterval(() => {
    if (appState.room) {
      updateTimer(appState.room);
    }
  }, 500);
}

init();
