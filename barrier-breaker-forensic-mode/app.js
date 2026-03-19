const SCORE_WEIGHTS = {
  classification: 40,
  spatial: 20,
  affectedGroup: 20,
  justification: 20
};

const PREFERENCES_KEY = "barrier_breaker_interface_preferences_v1";
const SESSION_STATE_KEY = "barrier_breaker_runtime_session_v1";

const CASE_TARGETS = {
  "L1-C01": {
    correctTarget: "primary-cta",
    targets: [
      { id: "page-title", label: "Primary heading", role: "Text heading", context: "Top content heading inside the card" },
      { id: "primary-cta", label: "Submit Request button", role: "Primary action button", context: "Center action control with low text/background contrast" },
      { id: "body-copy", label: "Body content lines", role: "Informational text block", context: "Supporting content below the heading" }
    ]
  },
  "L2-C01": {
    correctTarget: "icon-control",
    targets: [
      { id: "payment-option", label: "Payment option row", role: "Selection row", context: "Main payment method row" },
      { id: "icon-control", label: "Icon-only add control", role: "Small interactive icon", context: "Likely missing robust keyboard focus visibility and operability" },
      { id: "continue-btn", label: "Continue button", role: "Form submit action", context: "Primary action at the lower section" }
    ]
  },
  "L3-C01": {
    correctTarget: "placeholder-input",
    targets: [
      { id: "placeholder-input", label: "Email field with placeholder-only cue", role: "Form input", context: "Input relying on placeholder text without persistent visible label" },
      { id: "phone-input", label: "Phone number input", role: "Form input", context: "Field with explicit preceding label" },
      { id: "save-btn", label: "Save button", role: "Primary action", context: "Action control at lower section" }
    ]
  },
  "L4-C01": {
    correctTarget: "nav-order",
    targets: [
      { id: "brand-header", label: "Brand area", role: "Header branding", context: "System product identifier at top-left" },
      { id: "nav-order", label: "Top navigation sequence", role: "Global navigation", context: "Navigation order differs from equivalent screens" },
      { id: "dashboard-cards", label: "Dashboard cards", role: "Content regions", context: "Three analytic content cards" }
    ]
  }
};

const GENERIC_SEMANTIC_TERMS = [
  "accessibility", "contrast", "read", "keyboard", "focus", "label", "instruction", "placeholder", "semantic", "structure", "navigation", "consistent", "predictable", "operable", "screen", "reader", "vision", "cognitive", "context"
];

const CATEGORY_DISPLAY_LABELS = {
  "Color contrast failure": "Color contrast problem (text is hard to read)",
  "Inconsistent navigation": "Inconsistent navigation (the menu does not stay predictable)",
  "Keyboard/focus issue": "Keyboard access problem (users cannot reach all controls with the keyboard)",
  "Missing or unclear label": "Missing label (the field is not clearly described)",
  "Non-text content issue": "Non-text content issue (meaning is shown visually but not clearly explained)",
  "Semantic structure error": "Structure problem (headings or page relationships are unclear)",
  "Time/auto-update issue": "Timing or auto-update problem (the screen changes without enough control)"
};

const CATEGORY_FOCUS_HINTS = {
  "Color contrast failure": "Focus on whether the text can still be read clearly against its background.",
  "Inconsistent navigation": "Focus on whether the main navigation stays in a stable order and structure.",
  "Keyboard/focus issue": "Focus on whether you can move with Tab, reach the close button, and clearly see where you are.",
  "Missing or unclear label": "Focus on whether the field or control is clearly described with a visible label.",
  "Non-text content issue": "Focus on whether the message depends too much on an icon, image, or visual signal alone.",
  "Semantic structure error": "Focus on whether headings, sections, and relationships are communicated clearly.",
  "Time/auto-update issue": "Focus on whether timed or changing content gives people enough control and enough time."
};

const CATEGORY_PLAIN_EXPLANATIONS = {
  "Color contrast failure": "The text or control does not stand out enough from the background. This makes reading and decision-making harder.",
  "Inconsistent navigation": "The main navigation is not presented in a consistent way. People have to re-learn where things are instead of moving through the system with confidence.",
  "Keyboard/focus issue": "Users cannot easily reach every control with the keyboard, or they cannot tell where the keyboard is on the screen.",
  "Missing or unclear label": "The field or control is not clearly described. Once someone starts typing or navigating, they may not know what information is expected.",
  "Non-text content issue": "Important meaning is shown through a visual signal alone. People who do not see that signal clearly may miss the message.",
  "Semantic structure error": "The page structure does not clearly communicate headings, sections, or relationships. This makes the content harder to understand and navigate.",
  "Time/auto-update issue": "The screen changes or applies time pressure without giving enough control. People may lose information or run out of time."
};

class BarrierBreakerApp {
  constructor() {
    this.currentUtterance = null;
    this.selectedSpeechVoice = null;

    this.state = {
      sessionUUID: this.createUUID(),
      experimentCondition: "untimed",
      caseOrderSeed: this.randomSeed(),
      randomizedCaseOrder: [],
      datasetVersion: "v2.0-research",
      cases: [],
      issueTypes: [],
      caseIndex: 0,
      selectedPoint: null,
      keyboardPoint: null,
      selectedTarget: "",
      caseStartMs: 0,
      totalScore: 0,
      submissionCount: 0,
      caseResults: [],
      logs: [],
      timerEnabled: false,
      alternativeMode: false,
      zoomEnabled: false,
      zoomLevel: 1,
      panX: 0,
      panY: 0,
      isPanning: false,
      panStartClient: null,
      panStartOffset: null,
      zoomUsedThisCase: false,
      submittedCurrentCase: false,
      lastSubmissionScore: null,
      pendingZoomRecenter: false,
      accessRole: "public",
      anonymizedMode: true,
      participantCode: "",
      consentResearch: false,
      caseIndicatorChanges: new Set(),
      narrationTriggersCase: 0,
      narrationTimeMsCase: 0,
      narrationActive: false,
      narrationStartMs: 0,
      currentNarrationContext: "",
      currentNarrationText: "",
      voicesAvailable: false,
      pendingAccessAction: "activate",
      lastFocusedElement: null,
      preferences: {
        highContrast: false,
        reducedMotion: false,
        fontScale: 100,
        alternativeMode: false,
        zoomEnabled: false,
        timerEnabled: false,
        wcagPreview: false
      }
    };

    this.hydrateSessionState();

    this.el = this.mapElements();
    this.ctx = this.el.canvas.getContext("2d");
  }

  mapElements() {
    return {
      sessionInfo: document.getElementById("session-info"),
      sessionId: document.getElementById("session-id"),
      casePosition: document.getElementById("case-position"),
      researchModeBadge: document.getElementById("research-mode-badge"),
      levelTag: document.getElementById("level-tag"),
      caseMeta: document.getElementById("case-meta"),
      caseJump: document.getElementById("case-jump"),
      caseDescription: document.getElementById("case-description"),
      image: document.getElementById("case-image"),
      canvas: document.getElementById("analysis-canvas"),
      zoomViewport: document.getElementById("zoom-viewport"),
      zoomLayer: document.getElementById("zoom-layer"),
      selectionReadout: document.getElementById("selection-readout"),
      answerForm: document.getElementById("answer-form"),
      errorSummary: document.getElementById("error-summary"),
      barrierType: document.getElementById("barrier-type"),
      affectedGroup: document.getElementById("affected-group"),
      rationale: document.getElementById("rationale"),
      rationaleCount: document.getElementById("rationale-count"),
      confidenceRating: document.getElementById("confidence-rating"),
      audioSupportMessage: document.getElementById("audio-support-message"),
      audioControlGroups: Array.from(document.querySelectorAll(".audio-controls")),
      caseAudioPlay: document.getElementById("case-audio-play"),
      caseAudioPause: document.getElementById("case-audio-pause"),
      caseAudioSpeed: document.getElementById("case-audio-speed"),
      instructionsAudioPlay: document.getElementById("instructions-audio-play"),
      instructionsAudioPause: document.getElementById("instructions-audio-pause"),
      instructionsAudioSpeed: document.getElementById("instructions-audio-speed"),
      expertAudioPlay: document.getElementById("expert-audio-play"),
      expertAudioPause: document.getElementById("expert-audio-pause"),
      expertAudioSpeed: document.getElementById("expert-audio-speed"),
      interactionAudioPlay: document.getElementById("interaction-audio-play"),
      interactionAudioPause: document.getElementById("interaction-audio-pause"),
      interactionAudioSpeed: document.getElementById("interaction-audio-speed"),
      keyboardAudioPlay: document.getElementById("keyboard-audio-play"),
      keyboardAudioPause: document.getElementById("keyboard-audio-pause"),
      keyboardAudioSpeed: document.getElementById("keyboard-audio-speed"),
      instructionsContent: document.getElementById("instructions-content"),
      interactionContent: document.querySelector("#panel-interaction .tab-content"),
      keyboardContent: document.querySelector("#panel-keyboard .plain-list"),
      expertExplanationBlock: document.getElementById("expert-explanation-block"),
      expertExplanationText: document.getElementById("expert-explanation-text"),
      referenceResponseBlock: document.getElementById("reference-response-block"),
      referenceResponseContent: document.getElementById("reference-response-content"),
      submitAnswer: document.getElementById("submit-answer"),
      nextCase: document.getElementById("next-case"),
      resultSummary: document.getElementById("result-summary"),
      scoreBreakdown: document.getElementById("score-breakdown"),
      runSummaryBlock: document.getElementById("run-summary-block"),
      runSummaryContent: document.getElementById("run-summary-content"),
      finalScore: document.getElementById("final-score"),
      logCount: document.getElementById("log-count"),
      researchDataPanel: document.getElementById("research-data-panel"),
      exportJson: document.getElementById("export-json"),
      exportCsv: document.getElementById("export-csv"),
      contrastToggle: document.getElementById("contrast-toggle"),
      motionToggle: document.getElementById("motion-toggle"),
      fontScale: document.getElementById("font-scale"),
      fontScaleValue: document.getElementById("font-scale-value"),
      alternativeToggle: document.getElementById("alternative-mode-toggle"),
      alternativePanel: document.getElementById("alternative-panel"),
      violationTarget: document.getElementById("violation-target"),
      targetList: document.getElementById("target-list"),
      zoomToggle: document.getElementById("zoom-toggle"),
      timerToggle: document.getElementById("timer-toggle"),
      wcagPreviewToggle: document.getElementById("wcag-preview-toggle"),
      resetInterface: document.getElementById("reset-interface"),
      activateResearchMode: document.getElementById("activate-research-mode"),
      currentAccessStatus: document.getElementById("current-access-status"),
      startModal: document.getElementById("start-modal"),
      startModalClose: document.getElementById("start-modal-close"),
      startForm: document.getElementById("start-form"),
      participantCode: document.getElementById("participant-code"),
      consentResearch: document.getElementById("consent-research"),
      beginSimulation: document.getElementById("begin-simulation"),
      accessModal: document.getElementById("access-modal"),
      accessModalClose: document.getElementById("access-modal-close"),
      accessModalTitle: document.getElementById("access-modal-title"),
      accessModalDescription: document.getElementById("access-modal-description"),
      accessForm: document.getElementById("access-form"),
      accessPassword: document.getElementById("access-password"),
      accessCancel: document.getElementById("access-cancel"),
      accessSubmit: document.getElementById("access-submit"),
      overviewResearchNote: document.getElementById("overview-research-note"),
      tabs: Array.from(document.querySelectorAll('[role="tab"]')),
      tabPanels: Array.from(document.querySelectorAll('[role="tabpanel"]'))
    };
  }

  async init() {
    this.state.accessRole = await this.detectRole();
    this.el.sessionId.textContent = this.state.sessionUUID;
    this.bindTabs();
    this.bindUI();
    this.initSpeechNarration();
    this.loadPreferences();
    this.applyPreferencesToUI();
    this.applyAccessRole();
    this.openStartModal();

    try {
      const response = await fetch("cases.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.state.datasetVersion = data.cases?.[0]?.datasetVersion || this.state.datasetVersion;
      this.state.cases = this.buildCounterbalancedCaseOrder(data.cases || []);
      this.state.randomizedCaseOrder = this.state.cases.map((c) => c.id);
      this.state.issueTypes = data.issueTypes;
      this.state.experimentCondition = this.pickExperimentCondition(this.state.caseOrderSeed);
      this.applyExperimentCondition();
      this.populateBarrierTypes();
      this.populateCaseJump();
      this.loadInitialCase();
    } catch (error) {
      this.el.resultSummary.innerHTML = `<p class="result-bad">Failed to load cases.json (${error.message}). Serve files from a local web server and retry.</p>`;
      this.el.submitAnswer.disabled = true;
      this.el.nextCase.disabled = true;
    }
  }

  updateOverviewResearchNote() {
    if (!this.el.overviewResearchNote) return;
    this.el.overviewResearchNote.hidden = this.state.accessRole !== "research";
  }

  async detectRole() {
    return this.fetchSessionRole();
  }

  async fetchSessionRole() {
    try {
      const res = await fetch("/api/admin/session-role", { credentials: "same-origin" });
      if (!res.ok) return "public";
      const data = await res.json();
      return data?.role === "research" ? "research" : "public";
    } catch {
      return "public";
    }
  }

  randomSeed() {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return Number(a[0]);
    }
    return Math.floor(Math.random() * 2147483647);
  }

  hydrateSessionState() {
    try {
      const raw = sessionStorage.getItem(SESSION_STATE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.sessionUUID) this.state.sessionUUID = saved.sessionUUID;
      if (Number.isInteger(saved?.caseOrderSeed)) this.state.caseOrderSeed = saved.caseOrderSeed;
      if (Number.isInteger(saved?.caseIndex) && saved.caseIndex >= 0) this.state.caseIndex = saved.caseIndex;
      if (Array.isArray(saved?.randomizedCaseOrder)) this.state.randomizedCaseOrder = saved.randomizedCaseOrder;
    } catch {
      // Ignore malformed session payload.
    }
  }

  persistSessionState() {
    try {
      sessionStorage.setItem(
        SESSION_STATE_KEY,
        JSON.stringify({
          sessionUUID: this.state.sessionUUID,
          caseOrderSeed: this.state.caseOrderSeed,
          caseIndex: this.state.caseIndex,
          randomizedCaseOrder: this.state.randomizedCaseOrder
        })
      );
    } catch {
      // Ignore storage failures.
    }
  }

  pickExperimentCondition(seed) {
    const options = ["timed", "untimed", "hint-disabled"];
    return options[seed % options.length];
  }

  applyExperimentCondition() {
    const condition = this.state.experimentCondition;
    if (condition === "timed") {
      this.state.preferences.timerEnabled = true;
    } else {
      this.state.preferences.timerEnabled = false;
    }
    if (condition === "hint-disabled") {
      this.state.preferences.wcagPreview = false;
    }
    this.persistPreferences();
  }

  buildCounterbalancedCaseOrder(cases) {
    const rng = mulberry32(this.state.caseOrderSeed || 1);
    const byPrinciple = new Map();
    for (const c of cases) {
      const key = c.principleCategory || "Systemic";
      if (!byPrinciple.has(key)) byPrinciple.set(key, []);
      byPrinciple.get(key).push(c);
    }

    for (const arr of byPrinciple.values()) {
      seededShuffle(arr, rng);
    }

    const groups = Array.from(byPrinciple.entries());
    seededShuffle(groups, rng);
    const out = [];
    while (groups.some(([, arr]) => arr.length > 0)) {
      groups.sort((a, b) => b[1].length - a[1].length);
      for (const [, arr] of groups) {
        if (arr.length > 0) out.push(arr.shift());
      }
    }
    return out;
  }

  loadInitialCase() {
    const params = new URLSearchParams(window.location.search);
    const caseId = params.get("case");
    if (caseId) {
      const requestedIndex = this.state.cases.findIndex((c) => c.id === caseId);
      if (requestedIndex >= 0) {
        this.loadCase(requestedIndex);
        return;
      }
    }

    const restoredIndex = clamp(this.state.caseIndex, 0, Math.max(this.state.cases.length - 1, 0));
    this.loadCase(restoredIndex);
  }

  bindTabs() {
    this.el.tabs.forEach((tab) => {
      tab.addEventListener("click", () => this.activateTab(tab.id));
      tab.addEventListener("keydown", (event) => this.handleTabKeydown(event));
    });
  }

  handleTabKeydown(event) {
    const currentIndex = this.el.tabs.findIndex((t) => t.id === event.currentTarget.id);
    if (currentIndex < 0) return;

    let targetIndex = currentIndex;
    if (event.key === "ArrowRight") targetIndex = (currentIndex + 1) % this.el.tabs.length;
    else if (event.key === "ArrowLeft") targetIndex = (currentIndex - 1 + this.el.tabs.length) % this.el.tabs.length;
    else if (event.key === "Home") targetIndex = 0;
    else if (event.key === "End") targetIndex = this.el.tabs.length - 1;
    else if (event.key === "Enter" || event.key === " ") {
      this.activateTab(event.currentTarget.id);
      event.preventDefault();
      return;
    } else return;

    event.preventDefault();
    this.el.tabs[targetIndex].focus();
    this.activateTab(this.el.tabs[targetIndex].id);
  }

  activateTab(tabId) {
    this.el.tabs.forEach((tab) => {
      const active = tab.id === tabId;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });

    this.el.tabPanels.forEach((panel) => {
      const active = panel.getAttribute("aria-labelledby") === tabId;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });

    if (tabId === "tab-simulation") {
      this.syncCanvasSize();
      if (this.state.zoomEnabled && this.state.pendingZoomRecenter) {
        this.centerPan();
        this.applyZoomTransform();
        this.redrawCanvas(this.state.submittedCurrentCase);
        this.state.pendingZoomRecenter = false;
      }
    }
  }

  bindUI() {
    this.el.image.addEventListener("load", () => {
      this.syncCanvasSize();
      if (this.state.zoomEnabled) this.centerPan();
      else this.resetPan();
      this.applyZoomTransform();
      this.redrawCanvas();
    });

    window.addEventListener("resize", () => {
      this.syncCanvasSize();
      this.clampPan();
      this.applyZoomTransform();
      this.redrawCanvas();
    });

    this.el.zoomViewport.addEventListener("click", (event) => {
      if (this.state.alternativeMode || this.state.submittedCurrentCase) return;
      const p = this.toImageCoordinates(event.clientX, event.clientY);
      this.setSelectedPoint(p.x, p.y);
    });

    this.el.zoomViewport.addEventListener("mousedown", (event) => this.startPan(event));
    window.addEventListener("mousemove", (event) => this.movePan(event));
    window.addEventListener("mouseup", () => this.endPan());
    this.el.zoomViewport.addEventListener("mouseleave", () => this.endPan());

    this.el.zoomViewport.addEventListener("keydown", (event) => {
      const step = event.shiftKey ? 40 : 20;

      if (this.state.zoomEnabled && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        if (event.key === "ArrowLeft") this.state.panX += step;
        if (event.key === "ArrowRight") this.state.panX -= step;
        if (event.key === "ArrowUp") this.state.panY += step;
        if (event.key === "ArrowDown") this.state.panY -= step;
        this.clampPan();
        this.applyZoomTransform();
        event.preventDefault();
        return;
      }

      if (this.state.alternativeMode || this.state.submittedCurrentCase) return;

      if (!this.state.keyboardPoint) {
        const c = this.currentCase();
        this.state.keyboardPoint = { x: c.screenshot.width / 2, y: c.screenshot.height / 2 };
      }

      const markStep = event.shiftKey ? 25 : 10;
      if (event.key === "ArrowLeft") this.state.keyboardPoint.x -= markStep;
      else if (event.key === "ArrowRight") this.state.keyboardPoint.x += markStep;
      else if (event.key === "ArrowUp") this.state.keyboardPoint.y -= markStep;
      else if (event.key === "ArrowDown") this.state.keyboardPoint.y += markStep;
      else if (event.key === "Enter" || event.key === " ") this.setSelectedPoint(this.state.keyboardPoint.x, this.state.keyboardPoint.y);
      else return;

      const c = this.currentCase().screenshot;
      this.state.keyboardPoint.x = clamp(this.state.keyboardPoint.x, 0, c.width);
      this.state.keyboardPoint.y = clamp(this.state.keyboardPoint.y, 0, c.height);
      this.redrawCanvas();
      event.preventDefault();
    });

    this.el.rationale.addEventListener("input", () => {
      const length = this.el.rationale.value.length;
      this.el.rationaleCount.textContent = `${length} / 150`;
      this.el.rationaleCount.classList.toggle("counter-warning", length >= 140);
    });

    this.el.answerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      void this.handleSubmit();
    });

    this.el.nextCase.addEventListener("click", () => this.loadCase(this.state.caseIndex + 1));
    this.el.caseJump.addEventListener("change", (event) => {
      const index = Number(event.target.value);
      if (Number.isInteger(index) && index >= 0) this.loadCase(index);
    });
    this.el.exportJson.addEventListener("click", () => this.exportLogs("json"));
    this.el.exportCsv.addEventListener("click", () => this.exportLogs("csv"));

    this.el.contrastToggle.addEventListener("change", (e) => this.updatePreference("highContrast", e.target.checked));
    this.el.motionToggle.addEventListener("change", (e) => this.updatePreference("reducedMotion", e.target.checked));
    this.el.fontScale.addEventListener("input", (e) => this.updatePreference("fontScale", Number(e.target.value)));
    this.el.alternativeToggle.addEventListener("change", (e) => this.updatePreference("alternativeMode", e.target.checked));
    this.el.zoomToggle.addEventListener("change", (e) => {
      const wasEnabled = this.state.preferences.zoomEnabled;
      if (e.target.checked) this.state.zoomUsedThisCase = true;
      this.updatePreference("zoomEnabled", e.target.checked);
      if (!wasEnabled && e.target.checked) {
        if (this.el.zoomViewport.clientWidth > 0 && this.el.zoomViewport.clientHeight > 0) {
          this.centerPan();
          this.applyZoomTransform();
          this.state.pendingZoomRecenter = false;
        } else {
          this.state.pendingZoomRecenter = true;
        }
      }
      if (!e.target.checked) this.state.pendingZoomRecenter = false;
    });
    this.el.timerToggle.addEventListener("change", (e) => this.updatePreference("timerEnabled", e.target.checked));
    this.el.wcagPreviewToggle.addEventListener("change", (e) => this.updatePreference("wcagPreview", e.target.checked));
    this.el.caseAudioPlay.addEventListener("click", () => this.startNarration("case"));
    this.el.caseAudioPause.addEventListener("click", () => this.pauseNarration());
    this.el.instructionsAudioPlay.addEventListener("click", () => this.startNarration("instructions"));
    this.el.instructionsAudioPause.addEventListener("click", () => this.pauseNarration());
    this.el.expertAudioPlay.addEventListener("click", () => this.startNarration("expert"));
    this.el.expertAudioPause.addEventListener("click", () => this.pauseNarration());
    this.el.interactionAudioPlay.addEventListener("click", () => this.startNarration("interaction"));
    this.el.interactionAudioPause.addEventListener("click", () => this.pauseNarration());
    this.el.keyboardAudioPlay.addEventListener("click", () => this.startNarration("keyboard"));
    this.el.keyboardAudioPause.addEventListener("click", () => this.pauseNarration());

    this.el.violationTarget.addEventListener("change", (e) => {
      this.state.selectedTarget = e.target.value;
      this.updateSelectionReadout();
    });

    this.el.startForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!this.el.consentResearch.checked) return;
      this.state.participantCode = this.el.participantCode.value.trim();
      this.state.consentResearch = true;
      this.state.anonymizedMode = true;
      this.closeStartModal();
      this.activateTab("tab-simulation");
    });

    this.el.consentResearch.addEventListener("change", () => {
      this.el.beginSimulation.disabled = !this.el.consentResearch.checked;
    });

    this.el.resetInterface.addEventListener("click", () => this.resetInterfacePreferences());
    this.el.activateResearchMode.addEventListener("click", () => this.toggleResearchMode());
    this.el.startModalClose.addEventListener("click", () => this.closeStartModal());
    this.el.accessModalClose.addEventListener("click", () => this.closeAccessModal());
    this.el.accessCancel.addEventListener("click", () => this.closeAccessModal());
    this.el.accessForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await this.unlockResearchMode();
    });
    this.el.startModal.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.closeStartModal();
    });
    this.el.accessModal.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.closeAccessModal();
    });
    this.updateNarrationButtons();
  }

  initSpeechNarration() {
    if (!this.narrationSupported()) {
      this.state.voicesAvailable = false;
      this.updateNarrationButtons();
      return;
    }

    this.selectEnglishVoice();
    this.refreshVoices();
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      this.selectEnglishVoice();
      this.refreshVoices();
      this.updateNarrationButtons();
    });
  }

  refreshVoices() {
    if (!this.narrationSupported()) {
      this.state.voicesAvailable = false;
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    this.state.voicesAvailable = Array.isArray(voices) && voices.length > 0;
  }

  applyAccessRole() {
    const isResearch = this.state.accessRole === "research";

    if (this.el.sessionInfo) this.el.sessionInfo.hidden = !isResearch;
    if (this.el.researchModeBadge) this.el.researchModeBadge.hidden = !isResearch;
    if (this.el.researchDataPanel) this.el.researchDataPanel.hidden = !isResearch;
    if (this.el.exportJson) this.el.exportJson.disabled = !isResearch;
    if (this.el.exportCsv) this.el.exportCsv.disabled = !isResearch;
    if (this.el.logCount) this.el.logCount.textContent = String(this.state.submissionCount);
    if (this.el.currentAccessStatus) {
      this.el.currentAccessStatus.textContent = isResearch ? "Current access: Research mode" : "Current access: Public mode";
    }
    if (this.el.activateResearchMode) {
      this.el.activateResearchMode.textContent = isResearch ? "Close Research Mode" : "Activate Research Mode";
      this.el.activateResearchMode.setAttribute("aria-label", isResearch ? "Close research mode" : "Activate research mode");
      this.el.activateResearchMode.setAttribute("aria-pressed", String(isResearch));
    }

    this.updateOverviewResearchNote();
  }

  openStartModal() {
    this.rememberDialogTrigger();
    this.el.beginSimulation.disabled = !this.el.consentResearch.checked;
    if (typeof this.el.startModal.showModal === "function") {
      this.el.startModal.showModal();
    } else {
      this.el.startModal.setAttribute("open", "");
    }
    this.el.participantCode.focus();
  }

  closeStartModal() {
    if (typeof this.el.startModal.close === "function") {
      this.el.startModal.close();
    } else {
      this.el.startModal.removeAttribute("open");
    }
    this.restoreDialogFocus();
  }

  openAccessModal(action = "activate") {
    this.rememberDialogTrigger();
    this.state.pendingAccessAction = action === "deactivate" ? "deactivate" : "activate";
    if (this.el.accessModalTitle) {
      this.el.accessModalTitle.textContent = this.state.pendingAccessAction === "deactivate" ? "Close Research Mode" : "Restricted Access";
    }
    if (this.el.accessModalDescription) {
      this.el.accessModalDescription.textContent =
        this.state.pendingAccessAction === "deactivate"
          ? "Enter the access code to close Research Mode for this browser session."
          : "Enter the access code to enable Research Mode.";
    }
    if (this.el.accessSubmit) {
      this.el.accessSubmit.textContent = this.state.pendingAccessAction === "deactivate" ? "Close Research Mode" : "Unlock";
    }
    if (typeof this.el.accessModal.showModal === "function") {
      this.el.accessModal.showModal();
    } else {
      this.el.accessModal.setAttribute("open", "");
    }
    this.el.accessPassword.value = "";
    this.el.accessPassword.focus();
  }

  closeAccessModal() {
    if (typeof this.el.accessModal.close === "function") {
      this.el.accessModal.close();
    } else {
      this.el.accessModal.removeAttribute("open");
    }
    this.restoreDialogFocus();
  }

  rememberDialogTrigger() {
    const active = document.activeElement;
    this.state.lastFocusedElement = active instanceof HTMLElement ? active : null;
  }

  restoreDialogFocus() {
    const target = this.state.lastFocusedElement;
    this.state.lastFocusedElement = null;
    if (target && target.isConnected && typeof target.focus === "function") {
      target.focus();
      return;
    }
    const fallback = this.el.tabs.find((tab) => tab.getAttribute("aria-selected") === "true") || this.el.tabs[0];
    fallback?.focus();
  }

  toggleResearchMode() {
    this.openAccessModal(this.state.accessRole === "research" ? "deactivate" : "activate");
  }

  async unlockResearchMode() {
    const accessCode = this.el.accessPassword.value.trim();
    const action = this.state.pendingAccessAction === "deactivate" ? "deactivate" : "activate";
    try {
      const endpoint = `/api/admin/session-role?token=${encodeURIComponent(accessCode)}&action=${encodeURIComponent(action)}`;
      const response = await fetch(endpoint, { credentials: "same-origin" });
      if (!response.ok) {
        this.closeAccessModal();
        return;
      }
      const payload = await response.json();
      this.state.accessRole = payload?.role === "research" ? "research" : "public";
      this.applyAccessRole();
    } catch {
      // Keep unlock flow silent for invalid/failed attempts.
    }
    this.closeAccessModal();
  }

  selectEnglishVoice() {
    if (!this.narrationSupported()) return null;
    const voices = window.speechSynthesis.getVoices();
    const englishVoice =
      voices.find((voice) => (voice.lang || "").toLowerCase().startsWith("en-us")) ||
      voices.find((voice) => (voice.lang || "").toLowerCase().startsWith("en")) ||
      null;
    this.selectedSpeechVoice = englishVoice;
    return englishVoice;
  }

  updatePreference(key, value) {
    const previous = this.state.preferences[key];
    if (previous !== value) {
      this.state.caseIndicatorChanges.add(key);
    }
    this.state.preferences[key] = value;
    this.applyPreferencesToUI();
    this.persistPreferences();
  }

  loadPreferences() {
    try {
      const raw = localStorage.getItem(PREFERENCES_KEY);
      if (!raw) return;
      this.state.preferences = { ...this.state.preferences, ...JSON.parse(raw) };
    } catch {
      // Ignore malformed preference payload.
    }
  }

  persistPreferences() {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(this.state.preferences));
  }

  applyPreferencesToUI() {
    const p = this.state.preferences;
    this.state.alternativeMode = p.alternativeMode;
    this.state.zoomEnabled = p.zoomEnabled;
    this.state.zoomLevel = p.zoomEnabled ? 2 : 1;
    this.state.timerEnabled = p.timerEnabled;

    this.el.contrastToggle.checked = p.highContrast;
    this.el.motionToggle.checked = p.reducedMotion;
    this.el.fontScale.value = String(p.fontScale);
    this.el.fontScaleValue.textContent = `${p.fontScale}%`;
    this.el.alternativeToggle.checked = p.alternativeMode;
    this.el.zoomToggle.checked = p.zoomEnabled;
    this.el.timerToggle.checked = p.timerEnabled;
    this.el.wcagPreviewToggle.checked = p.wcagPreview;
    this.el.timerToggle.disabled = true;
    this.el.wcagPreviewToggle.disabled = this.state.experimentCondition === "hint-disabled";

    document.body.classList.toggle("high-contrast", p.highContrast);
    document.body.classList.toggle("reduced-motion", p.reducedMotion);
    document.documentElement.style.setProperty("--font-scale", `${p.fontScale}%`);

    this.el.alternativePanel.hidden = !this.state.alternativeMode;
    this.updateNarrationButtons();

    if (!p.zoomEnabled) this.resetPan();
    this.clampPan();
    this.applyZoomTransform();
    this.updateSelectionReadout();
    this.redrawCanvas(this.state.submittedCurrentCase);
  }

  resetInterfacePreferences() {
    this.state.preferences = {
      highContrast: false,
      reducedMotion: false,
      fontScale: 100,
      alternativeMode: false,
      zoomEnabled: false,
      timerEnabled: false,
      wcagPreview: false
    };
    this.resetPan();
    this.persistPreferences();
    this.applyPreferencesToUI();
  }

  populateBarrierTypes() {
    const frag = document.createDocumentFragment();
    for (const type of this.state.issueTypes) {
      const opt = document.createElement("option");
      opt.value = type;
      opt.textContent = type;
      frag.appendChild(opt);
    }
    this.el.barrierType.appendChild(frag);
  }

  populateCaseJump() {
    this.el.caseJump.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select case";
    this.el.caseJump.appendChild(placeholder);

    const frag = document.createDocumentFragment();
    this.state.cases.forEach((caseData, index) => {
      const opt = document.createElement("option");
      opt.value = String(index);
      opt.textContent = `${index + 1}. ${caseData.id} - ${caseData.level}`;
      frag.appendChild(opt);
    });
    this.el.caseJump.appendChild(frag);
  }

  currentCase() {
    return this.state.cases[this.state.caseIndex];
  }

  currentCaseTargets() {
    const c = this.currentCase();
    return CASE_TARGETS[c.id] || {
      correctTarget: "main-issue-zone",
      targets: [{ id: "main-issue-zone", label: "Primary suspected issue region", role: "UI region", context: "Main element region associated with the case issue" }]
    };
  }

  loadCase(index) {
    if (index >= this.state.cases.length) {
      this.finishRun();
      return;
    }

    this.state.caseIndex = index;
    this.persistSessionState();
    this.state.selectedPoint = null;
    this.state.keyboardPoint = null;
    this.state.selectedTarget = "";
    this.state.zoomUsedThisCase = false;
    this.state.caseIndicatorChanges = new Set();
    this.state.submittedCurrentCase = false;
    this.state.lastSubmissionScore = null;
    this.state.narrationTriggersCase = 0;
    this.state.narrationTimeMsCase = 0;
    this.state.narrationActive = false;
    this.state.narrationStartMs = 0;
    this.state.currentNarrationContext = "";
    this.state.currentNarrationText = "";
    this.state.caseStartMs = Date.now();
    this.stopNarration();

    const caseData = this.currentCase();
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(caseData.screenshot.svg)}`;

    this.el.image.src = svgUrl;
    this.el.image.alt = `Case ${caseData.id}, ${caseData.level}`;
    this.el.casePosition.textContent = `${index + 1} / ${this.state.cases.length}`;
    this.el.caseJump.value = String(index);
    this.el.levelTag.textContent = caseData.level;
    this.el.caseMeta.textContent = `${caseData.id} | Difficulty: ${caseData.difficulty} | Assessment mode: competency analysis`;

    this.renderNeutralDescription(caseData);
    this.populateViolationTargets();
    this.populateAffectedGroups(caseData);

    this.el.barrierType.value = "";
    this.el.affectedGroup.value = "";
    this.el.rationale.value = "";
    this.el.rationaleCount.textContent = "0 / 150";
    this.el.rationaleCount.classList.remove("counter-warning");
    this.el.confidenceRating.value = "";
    this.el.submitAnswer.disabled = false;
    this.el.nextCase.disabled = true;
    this.clearErrors();
    this.clearAnswerStateStyles();

    this.el.resultSummary.innerHTML = `
      <p class="instruction-kicker">Feedback Note</p>
      <p>After you submit, this panel will show the main issue, why it matters, and how your answer compares with the reference answer.</p>
    `;
    this.el.scoreBreakdown.innerHTML = "";
    this.el.scoreBreakdown.hidden = true;
    this.el.expertExplanationBlock.hidden = true;
    this.el.expertExplanationText.textContent = "";
    this.el.referenceResponseBlock.hidden = true;
    this.el.referenceResponseContent.innerHTML = "";
    this.el.runSummaryBlock.hidden = true;
    this.el.runSummaryContent.innerHTML = "";

    this.updateSelectionReadout();
    this.syncCanvasSize();
    this.applyPreferencesToUI();
    this.redrawCanvas(false);
  }

  renderNeutralDescription(caseData) {
    const lines = (caseData.neutralDescription.elements || [])
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("");

    this.el.caseDescription.innerHTML = `
      <div class="description-guide-box" role="note" aria-label="How to read this section">
        <p class="instruction-kicker">Guidance</p>
        <p class="description-guide"><strong>How to read this section:</strong> This is a neutral overview of the screen you are about to inspect. It helps you understand what kind of page you are looking at without revealing the barrier.</p>
        <p class="description-guide">Read the layout line first for the overall page structure. Then use the interface element list as a checklist of the main parts that appear in the screenshot.</p>
        <p class="description-guide">Next step: inspect the screenshot and decide which single area or interface element is most likely creating the accessibility barrier.</p>
      </div>
      <p><strong>Layout:</strong> ${escapeHtml(caseData.neutralDescription.layout)}</p>
      <p><strong>Interface elements:</strong></p>
      <ul>${lines}</ul>
    `;
  }

  populateViolationTargets() {
    const mapping = this.currentCaseTargets();
    this.el.violationTarget.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select interface element under review";
    this.el.violationTarget.appendChild(placeholder);

    const frag = document.createDocumentFragment();
    this.el.targetList.innerHTML = "";

    for (const t of mapping.targets) {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = `${t.label} (${t.role})`;
      frag.appendChild(opt);

      const li = document.createElement("li");
      li.textContent = `${t.label}: ${t.context}`;
      this.el.targetList.appendChild(li);
    }

    this.el.violationTarget.appendChild(frag);
    this.el.violationTarget.value = "";
  }

  populateAffectedGroups(caseData) {
    this.el.affectedGroup.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select affected group";
    this.el.affectedGroup.appendChild(placeholder);

    const frag = document.createDocumentFragment();
    for (const group of caseData.affectedGroups || []) {
      const opt = document.createElement("option");
      opt.value = group;
      opt.textContent = group;
      frag.appendChild(opt);
    }
    this.el.affectedGroup.appendChild(frag);
  }

  syncCanvasSize() {
    this.el.canvas.width = this.el.image.clientWidth;
    this.el.canvas.height = this.el.image.clientHeight;
  }

  toImageCoordinates(clientX, clientY) {
    const rect = this.el.image.getBoundingClientRect();
    const caseData = this.currentCase();
    return {
      x: clamp((clientX - rect.left) * (caseData.screenshot.width / rect.width), 0, caseData.screenshot.width),
      y: clamp((clientY - rect.top) * (caseData.screenshot.height / rect.height), 0, caseData.screenshot.height)
    };
  }

  toCanvasCoordinates(x, y) {
    const c = this.currentCase().screenshot;
    const sx = this.el.canvas.width / c.width;
    const sy = this.el.canvas.height / c.height;
    return { x: x * sx, y: y * sy, sx, sy };
  }

  setSelectedPoint(x, y) {
    this.state.selectedPoint = { x, y };
    this.updateSelectionReadout();
    this.redrawCanvas(this.state.submittedCurrentCase);
  }

  updateSelectionReadout() {
    if (this.state.alternativeMode) {
      this.el.selectionReadout.textContent = this.state.selectedTarget
        ? `Structured target selected: ${this.state.selectedTarget}`
        : "Structured Analysis Mode is enabled. Select the interface element you believe is creating the barrier.";
      return;
    }

    this.el.selectionReadout.textContent = this.state.selectedPoint
      ? `Marked at x:${Math.round(this.state.selectedPoint.x)}, y:${Math.round(this.state.selectedPoint.y)}`
      : "No point marked yet. Click the part of the screenshot that you think is causing the accessibility barrier.";
  }

  clearAnswerStateStyles() {
    [this.el.barrierType, this.el.affectedGroup, this.el.rationale, this.el.confidenceRating].forEach((field) => {
      field.classList.remove("field-correct", "field-incorrect");
    });
  }

  applyAnswerStateStyles(caseData, score, affectedGroup) {
    this.clearAnswerStateStyles();

    const affectedGroupCorrect = (caseData.affectedGroups || []).includes(affectedGroup);

    this.el.barrierType.classList.add(score.classificationCorrect ? "field-correct" : "field-incorrect");
    this.el.affectedGroup.classList.add(affectedGroupCorrect ? "field-correct" : "field-incorrect");
  }

  redrawCanvas(showZone) {
    this.ctx.clearRect(0, 0, this.el.canvas.width, this.el.canvas.height);
    const score = this.state.lastSubmissionScore;
    const submitted = this.state.submittedCurrentCase;
    const spatialCorrect = Boolean(score && score.spatialAccuracy);
    const pointColor = submitted && !spatialCorrect ? "rgba(193, 18, 31, 0.95)" : "rgba(15, 118, 110, 0.9)";
    const zoneStroke = spatialCorrect ? "rgba(42, 157, 143, 0.98)" : "rgba(193, 18, 31, 0.95)";
    const zoneFill = spatialCorrect ? "rgba(42, 157, 143, 0.18)" : "rgba(193, 18, 31, 0.15)";

    if (!this.state.alternativeMode && this.state.keyboardPoint) {
      const p = this.toCanvasCoordinates(this.state.keyboardPoint.x, this.state.keyboardPoint.y);
      this.ctx.strokeStyle = submitted && !spatialCorrect ? "#c1121f" : "#0f766e";
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([4, 3]);
      this.ctx.beginPath();
      this.ctx.moveTo(p.x - 10, p.y);
      this.ctx.lineTo(p.x + 10, p.y);
      this.ctx.moveTo(p.x, p.y - 10);
      this.ctx.lineTo(p.x, p.y + 10);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    if (!this.state.alternativeMode && this.state.selectedPoint) {
      const p = this.toCanvasCoordinates(this.state.selectedPoint.x, this.state.selectedPoint.y);
      this.ctx.fillStyle = pointColor;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      this.ctx.fill();
    }

    if (showZone && this.currentCase()) {
      const zone = this.currentCase().problemZone;
      const p = this.toCanvasCoordinates(zone.x, zone.y);
      this.ctx.strokeStyle = zoneStroke;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(p.x, p.y, zone.width * p.sx, zone.height * p.sy);
      this.ctx.fillStyle = zoneFill;
      this.ctx.fillRect(p.x, p.y, zone.width * p.sx, zone.height * p.sy);
    }
  }

  startPan(event) {
    if (!this.state.zoomEnabled) return;
    this.state.isPanning = true;
    this.el.zoomViewport.classList.add("panning");
    this.state.panStartClient = { x: event.clientX, y: event.clientY };
    this.state.panStartOffset = { x: this.state.panX, y: this.state.panY };
    event.preventDefault();
  }

  movePan(event) {
    if (!this.state.zoomEnabled || !this.state.isPanning || !this.state.panStartClient) return;
    this.state.panX = this.state.panStartOffset.x + (event.clientX - this.state.panStartClient.x);
    this.state.panY = this.state.panStartOffset.y + (event.clientY - this.state.panStartClient.y);
    this.clampPan();
    this.applyZoomTransform();
  }

  endPan() {
    this.state.isPanning = false;
    this.el.zoomViewport.classList.remove("panning");
    this.state.panStartClient = null;
    this.state.panStartOffset = null;
  }

  resetPan() {
    this.state.panX = 0;
    this.state.panY = 0;
  }

  centerPan() {
    if (!this.state.zoomEnabled) {
      this.resetPan();
      return;
    }
    const viewportW = this.el.zoomViewport.clientWidth;
    const viewportH = this.el.zoomViewport.clientHeight;
    this.state.panX = (viewportW - viewportW * this.state.zoomLevel) / 2;
    this.state.panY = (viewportH - viewportH * this.state.zoomLevel) / 2;
    this.clampPan();
  }

  clampPan() {
    if (!this.state.zoomEnabled) {
      this.resetPan();
      return;
    }

    const viewportW = this.el.zoomViewport.clientWidth;
    const viewportH = this.el.zoomViewport.clientHeight;
    const minX = viewportW - viewportW * this.state.zoomLevel;
    const minY = viewportH - viewportH * this.state.zoomLevel;

    this.state.panX = clamp(this.state.panX, minX, 0);
    this.state.panY = clamp(this.state.panY, minY, 0);
  }

  applyZoomTransform() {
    this.el.zoomViewport.classList.toggle("zoomed", this.state.zoomEnabled);
    this.el.zoomLayer.style.transform = `translate(${this.state.panX}px, ${this.state.panY}px) scale(${this.state.zoomLevel})`;
  }

  clearErrors() {
    this.el.errorSummary.hidden = true;
    this.el.errorSummary.innerHTML = "";
  }

  showErrors(messages) {
    this.el.errorSummary.hidden = false;
    const items = messages.map((m) => `<li>${escapeHtml(m)}</li>`).join("");
    this.el.errorSummary.innerHTML = `<p><strong>Please resolve the following before submission:</strong></p><ul>${items}</ul>`;
    this.el.errorSummary.focus();
  }

  async handleSubmit() {
    const caseData = this.currentCase();
    const barrierType = this.el.barrierType.value;
    const affectedGroup = this.el.affectedGroup.value;
    const rationale = this.el.rationale.value.trim();
    const confidenceScore = Number(this.el.confidenceRating.value || 0);
    const errors = [];

    if (this.state.alternativeMode) {
      if (!this.state.selectedTarget) errors.push("Select an interface element under review.");
    } else if (!this.state.selectedPoint) {
      errors.push("Select a problem area on the screenshot.");
    }

    if (!barrierType) errors.push("Select the main issue.");
    if (!affectedGroup) errors.push("Select who is most affected.");
    if (!rationale) errors.push("Provide a rationale.");
    if (rationale.length > 150) errors.push("Rationale must not exceed 150 characters.");
    if (!confidenceScore || confidenceScore < 1 || confidenceScore > 5) errors.push("Select how confident you are (1-5).");

    if (errors.length) {
      this.showErrors(errors);
      this.el.resultSummary.innerHTML = "<p class='result-bad'>Submission blocked until required fields are completed.</p>";
      return;
    }

    this.clearErrors();

    const responseTimeMs = Date.now() - this.state.caseStartMs;
    const score = this.scoreSubmission(caseData, barrierType, rationale, affectedGroup);
    const classificationCorrect = score.classificationCorrect;
    const spatialAccuracy = score.spatialAccuracy;
    this.captureNarrationElapsed();

    this.state.totalScore += score.total;
    this.state.submittedCurrentCase = true;
    this.state.lastSubmissionScore = score;
    this.state.submissionCount += 1;

    const decisionTimestamp = new Date().toISOString();
    const submissionRecord = {
      sessionUUID: this.state.sessionUUID,
      round: this.state.caseIndex + 1,
      caseID: caseData.id,
      decisionTimestamp,
      responseTimeMs,
      clickX: this.state.selectedPoint ? Math.round(this.state.selectedPoint.x) : null,
      clickY: this.state.selectedPoint ? Math.round(this.state.selectedPoint.y) : null,
      spatialAccuracy,
      issueClassification: barrierType,
      classificationCorrect,
      justificationText: rationale,
      justificationScore: Number(score.justificationSemanticScore.toFixed(4)),
      confidenceRating: confidenceScore,
      barrierComplexityScore: Number(caseData.barrierComplexityScore || 0),
      visualSalienceScore: Number(caseData.visualSalienceScore || 0),
      severityIndex: Number(caseData.severityIndex || 0),
      experimentCondition: this.state.experimentCondition,
      researchMode: this.state.accessRole === "research",
      anonymizedMode: Boolean(this.state.anonymizedMode),
      datasetVersion: this.state.datasetVersion,
      caseOrderSeed: this.state.caseOrderSeed,
      randomizedCaseOrder: this.state.randomizedCaseOrder,
      role: this.state.accessRole,
      mode: this.state.alternativeMode ? "structured" : "spatial",
      indicatorChanges: Array.from(this.state.caseIndicatorChanges),
      participantCode: this.state.participantCode,
      consentResearch: this.state.consentResearch
    };
    await this.logSessionSubmission(submissionRecord);
    this.state.caseResults.push({
      caseID: caseData.id,
      score,
      submissionRecord
    });
    if (this.state.accessRole === "research") this.state.logs.push(submissionRecord);
    if (this.el.logCount) this.el.logCount.textContent = String(this.state.submissionCount);

    this.applyAnswerStateStyles(caseData, score, affectedGroup);
    this.redrawCanvas(true);
    this.el.submitAnswer.disabled = true;
    this.el.nextCase.disabled = false;

    this.el.resultSummary.innerHTML = this.buildResultSummary(caseData, barrierType, classificationCorrect, spatialAccuracy);
    this.el.expertExplanationText.innerHTML = this.buildIssueExplanation(caseData);
    this.el.expertExplanationBlock.hidden = false;
    this.el.referenceResponseContent.innerHTML = this.buildReferenceResponse(caseData, score);
    this.el.referenceResponseBlock.hidden = false;

    this.el.scoreBreakdown.innerHTML = `
      <ul class="score-list">
        <li>Finding the right area: ${score.spatialPoints.toFixed(1)} / ${SCORE_WEIGHTS.spatial} (${spatialAccuracy ? "correct area selected" : score.spatialPoints > 0 ? "close to the correct area" : "different area selected"})</li>
        <li>Identifying the main issue: ${score.classificationPoints.toFixed(1)} / ${SCORE_WEIGHTS.classification}</li>
        <li>Choosing who is most affected: ${score.affectedGroupPoints.toFixed(1)} / ${SCORE_WEIGHTS.affectedGroup}</li>
        <li>Writing a helpful rationale: ${score.justificationPoints.toFixed(1)} / ${SCORE_WEIGHTS.justification}</li>
        <li><strong>Case score: ${score.total.toFixed(1)}</strong></li>
      </ul>
    `;
    this.el.scoreBreakdown.hidden = false;

    this.el.finalScore.textContent = `Cumulative score: ${this.state.totalScore.toFixed(1)}`;
  }

  scoreSubmission(caseData, barrierType, rationale, affectedGroup) {
    let spatialAccuracyRaw = 0;
    if (this.state.alternativeMode) {
      spatialAccuracyRaw = this.state.selectedTarget === this.currentCaseTargets().correctTarget ? 1 : 0;
    } else {
      spatialAccuracyRaw = this.computeSpatialAccuracy(this.state.selectedPoint, caseData.problemZone, caseData.tolerance);
    }

    const spatialAccuracy = spatialAccuracyRaw >= 0.7;
    const classificationCorrect = barrierType === caseData.category;
    const affectedGroupCorrect = (caseData.affectedGroups || []).includes(affectedGroup);
    const spatialPoints = SCORE_WEIGHTS.spatial * spatialAccuracyRaw;
    const classificationPoints = classificationCorrect ? SCORE_WEIGHTS.classification : 0;
    const affectedGroupPoints = affectedGroupCorrect ? SCORE_WEIGHTS.affectedGroup : 0;
    const justificationSemanticScore = scoreJustificationWeighted(rationale, caseData.keywords);
    const justificationPoints = SCORE_WEIGHTS.justification * justificationSemanticScore;

    return {
      spatialAccuracy,
      spatialAccuracyRaw,
      spatialPoints,
      classificationPoints,
      affectedGroupPoints,
      justificationPoints,
      justificationSemanticScore,
      classificationCorrect,
      affectedGroupCorrect,
      total: spatialPoints + classificationPoints + affectedGroupPoints + justificationPoints
    };
  }

  async logSessionSubmission(payload) {
    try {
      await fetch("/api/log-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch {
      // Logging is silent by design; the simulation flow must continue.
    }
  }

  async exportLogs(format) {
    if (this.state.accessRole !== "research") return;
    const endpoint = format === "csv" ? "/api/admin/logs.csv" : "/api/admin/logs";
    const response = await fetch(endpoint, { credentials: "same-origin" });
    if (!response.ok) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    if (format === "csv") {
      const csv = await response.text();
      downloadFile(csv, `barrier-breaker-research-${timestamp}.csv`, "text/csv;charset=utf-8");
      return;
    }

    const json = await response.json();
    const payload = Array.isArray(json.items) ? json.items : [];
    downloadFile(JSON.stringify(payload, null, 2), `barrier-breaker-research-${timestamp}.json`, "application/json");
  }

  computeSpatialAccuracy(point, zone, tolerance) {
    if (!point) return 0;

    const inside = point.x >= zone.x && point.x <= zone.x + zone.width && point.y >= zone.y && point.y <= zone.y + zone.height;
    if (inside) return 1;

    const dx = Math.max(zone.x - point.x, 0, point.x - (zone.x + zone.width));
    const dy = Math.max(zone.y - point.y, 0, point.y - (zone.y + zone.height));
    const distance = Math.hypot(dx, dy);
    if (distance > tolerance) return 0;
    return 0.7 * (1 - distance / tolerance);
  }

  finishRun() {
    this.stopNarration();
    this.el.caseMeta.textContent = "All levels completed.";
    this.el.levelTag.textContent = "Complete";
    this.el.image.removeAttribute("src");
    this.ctx.clearRect(0, 0, this.el.canvas.width, this.el.canvas.height);
    this.el.selectionReadout.textContent = "Assessment complete.";
    this.el.answerForm.reset();
    this.el.submitAnswer.disabled = true;
    this.el.nextCase.disabled = true;
    this.el.casePosition.textContent = `${this.state.cases.length} / ${this.state.cases.length}`;

    this.el.resultSummary.innerHTML = "<p class='result-good'>Assessment run complete.</p>";
    this.el.scoreBreakdown.innerHTML = `<p><strong>Final score:</strong> ${this.state.totalScore.toFixed(1)}</p>`;
    this.el.scoreBreakdown.hidden = false;
    this.el.runSummaryContent.innerHTML = this.buildRunSummary();
    this.el.runSummaryBlock.hidden = false;
    this.el.finalScore.textContent = `Submissions logged: ${this.state.submissionCount}`;
  }

  buildReferenceResponse(caseData, score) {
    const directGroup = formatGroupList(caseData.affectedGroups || []);
    const guidanceText = this.buildWhatToCheck(caseData);
    const issueText = this.referenceIssueSummary(caseData);

    return `
      <div class="reference-answer-card">
        <p>${escapeHtml(issueText)} This mainly affects ${escapeHtml(directGroup)}. Next time, ${escapeHtml(lowercaseFirst(guidanceText))}</p>
      </div>
    `;
  }

  referenceIssueSummary(caseData) {
    if (caseData.id === "L2-C03") {
      return "The main issue is keyboard access. The close button should be reachable with Tab, and people should be able to close the dialog with the keyboard.";
    }
    return `The main issue is ${lowercaseFirst(formatBarrierLabel(caseData.category))}.`;
  }

  referenceTargetLabel(caseData) {
    const mapping = CASE_TARGETS[caseData.id];
    const target = mapping?.targets?.find((item) => item.id === mapping.correctTarget);
    if (target) return `The correct element is ${target.label.toLowerCase()}. It is highlighted after submission.`;
    return "The correct area is highlighted on the screenshot after submission.";
  }

  referenceZoneLabel(caseData) {
    return "The correct area is highlighted on the screenshot after submission.";
  }

  buildReferenceRationale(caseData) {
    return simplifyTechnicalText(caseData.impact || CATEGORY_PLAIN_EXPLANATIONS[caseData.category] || "");
  }

  buildResultSummary(caseData, selectedBarrier, classificationCorrect, spatialAccuracy) {
    const selectedLabel = selectedBarrier ? formatBarrierLabel(selectedBarrier) : "No barrier type selected";
    const correctLabel = formatBarrierLabel(caseData.category);
    const statusText = classificationCorrect
      ? "Your choices in the fields below match the main issue."
      : "Your choices in the fields below do not match the main issue.";
    const areaStatusText = spatialAccuracy
      ? "You selected the correct area on the screenshot."
      : "You selected a different area from the main problem.";

    const correctionText = classificationCorrect
      ? "You focused on the right barrier category for this screen."
      : this.buildWrongAnswerGuidance(caseData, selectedLabel, correctLabel);

    return `
      <div class="feedback-stack">
        <section class="explanation-section">
          <h3>Your answer</h3>
          <p class="${spatialAccuracy ? "result-good" : "result-bad"}"><strong>${escapeHtml(areaStatusText)}</strong></p>
          <p class="${classificationCorrect ? "result-good" : "result-bad"}"><strong>${statusText}</strong></p>
          <p>${escapeHtml(correctionText)}</p>
          <p class="feedback-note-inline"><strong>Standards reference:</strong> ${escapeHtml(caseData.wcag)}</p>
        </section>
      </div>
    `;
  }

  buildIssueExplanation(caseData) {
    return `
      <div class="feedback-stack">
        <section class="explanation-section">
          <h4>What is the issue</h4>
          <p>${escapeHtml(this.referenceIssueSummary(caseData))}</p>
        </section>
        <section class="explanation-section">
          <h4>Why it is a problem</h4>
          <p>${escapeHtml(this.feedbackProblemExplanation(caseData))}</p>
        </section>
        <section class="explanation-section">
          <h4>Who it affects</h4>
          <p>${escapeHtml(formatGroupList(caseData.affectedGroups || []))}</p>
        </section>
        <section class="explanation-section">
          <h4>What to check</h4>
          <p>${escapeHtml(this.buildWhatToCheck(caseData))}</p>
        </section>
      </div>
    `;
  }

  buildWrongAnswerGuidance(caseData, selectedLabel, correctLabel) {
    if (caseData.id === "L2-C03") {
      return `You selected “${selectedLabel}”, but the main issue here is “${correctLabel}”. This case is about how the dialog works with the keyboard. Focus on whether you can use Tab to reach the close button and close the dialog with the keyboard.`;
    }
    return `You selected “${selectedLabel}”, but the main issue here is “${correctLabel}”. ${categoryFocusHint(caseData.category)}`;
  }

  feedbackProblemExplanation(caseData) {
    if (caseData.id === "L2-C03") {
      return "People can get stuck in the dialog if they cannot reach the close button with Tab or close it with Escape.";
    }
    return simplifyTechnicalText(caseData.expertExplanation || categoryProblemExplanation(caseData.category));
  }

  buildWhatToCheck(caseData) {
    if (caseData.id === "L2-C03") {
      return "Try using the Tab key to move between elements and see if you can reach the close button and clearly see where you are.";
    }
    return categoryFocusHint(caseData.category);
  }

  buildRunSummary() {
    const results = this.state.caseResults;
    if (!results.length) return "<p>No completed cases are available for summary.</p>";

    const totalPossible = results.length * 100;
    const totalScore = this.state.totalScore;
    const percentage = totalPossible ? (totalScore / totalPossible) * 100 : 0;
    const classificationHits = results.filter((entry) => entry.score.classificationCorrect).length;
    const spatialHits = results.filter((entry) => entry.score.spatialAccuracy).length;
    const avgJustification = average(results.map((entry) => entry.score.justificationSemanticScore)) * 100;
    const avgConfidence = average(results.map((entry) => Number(entry.submissionRecord.confidenceRating || 0)));

    const strengths = [];
    const improvements = [];

    if (classificationHits / results.length >= 0.75) strengths.push("Barrier classification was consistently strong across the run.");
    else improvements.push("Spend a little more time distinguishing between category labels before submitting.");

    if (spatialHits / results.length >= 0.75) strengths.push("Spatial detection was precise in most cases.");
    else improvements.push("Use the screenshot evidence more deliberately before marking the problem area.");

    if (avgJustification >= 70) strengths.push("Your rationale statements were usually relevant and evidence-based.");
    else improvements.push("Make each rationale more specific by naming the barrier and the user impact in one sentence.");

    const overallComment =
      percentage >= 85
        ? "This was a strong run with accurate classification, clear evidence use, and good consistency."
        : percentage >= 65
          ? "This was a solid run with good analytical foundation and a few areas where more precision will improve consistency."
          : "This run shows useful emerging skill. The next improvement step is to slow down slightly and align the selected area, category, and rationale more tightly.";

    return `
      <p><strong>Overall score:</strong> ${totalScore.toFixed(1)} / ${totalPossible.toFixed(1)} (${percentage.toFixed(1)}%)</p>
      <p><strong>Completed cases:</strong> ${results.length}</p>
      <p><strong>Overall comment:</strong> ${escapeHtml(overallComment)}</p>
      <ul class="score-list">
        <li>You identified the main issue correctly in ${classificationHits} of ${results.length} cases.</li>
        <li>You selected the right area in ${spatialHits} of ${results.length} cases.</li>
        <li>Average rationale quality: ${avgJustification.toFixed(1)}%.</li>
        <li>Average confidence rating recorded: ${avgConfidence.toFixed(1)} / 5.</li>
      </ul>
      <p><strong>What went well</strong></p>
      <ul class="score-list">${strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>Completion data is available, but no dominant strength pattern was detected yet.</li>"}</ul>
      <p><strong>Advice for improvement</strong></p>
      <ul class="score-list">${improvements.map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>Keep using the same method: read the neutral description, inspect the screenshot, classify carefully, and justify briefly.</li>"}</ul>
    `;
  }

  narrationSupported() {
    return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  }

  playButtons() {
    return [this.el.caseAudioPlay, this.el.instructionsAudioPlay, this.el.expertAudioPlay, this.el.interactionAudioPlay, this.el.keyboardAudioPlay];
  }

  pauseButtons() {
    return [this.el.caseAudioPause, this.el.instructionsAudioPause, this.el.expertAudioPause, this.el.interactionAudioPause, this.el.keyboardAudioPause];
  }

  updateNarrationButtons() {
    const supported = this.narrationSupported();
    const ready = this.state.voicesAvailable;
    const controlsVisible = supported;
    const synth = supported ? window.speechSynthesis : null;
    const paused = Boolean(synth && synth.paused);
    const activelyNarrating = Boolean(this.state.narrationActive && !paused);

    for (const group of this.el.audioControlGroups) {
      group.hidden = !controlsVisible;
    }

    for (const btn of this.playButtons()) {
      btn.disabled = !controlsVisible || (activelyNarrating && !paused);
    }
    for (const btn of this.pauseButtons()) {
      btn.disabled = !controlsVisible || !activelyNarrating || paused;
    }

    if (!supported) {
      this.stopNarration();
      this.el.audioSupportMessage.hidden = false;
      this.el.audioSupportMessage.textContent = "Audio not supported in this browser.";
      return;
    }

    if (!ready) {
      this.el.audioSupportMessage.hidden = false;
      this.el.audioSupportMessage.textContent = "Loading narration voices…";
      return;
    }

    this.el.audioSupportMessage.hidden = true;
    this.el.audioSupportMessage.textContent = "";
  }

  narrationRateFor(context) {
    const map = {
      case: this.el.caseAudioSpeed,
      instructions: this.el.instructionsAudioSpeed,
      expert: this.el.expertAudioSpeed,
      interaction: this.el.interactionAudioSpeed,
      keyboard: this.el.keyboardAudioSpeed
    };
    return Number(map[context]?.value || 1);
  }

  narrationTextFor(context) {
    if (context === "case") return this.el.caseDescription.innerText.trim();
    if (context === "instructions") return this.el.instructionsContent?.innerText.trim() || "";
    if (context === "expert") return this.el.expertExplanationText?.innerText.trim() || "";
    if (context === "interaction") return this.el.interactionContent?.innerText.trim() || "";
    if (context === "keyboard") return this.el.keyboardContent?.innerText.trim() || "";
    return "";
  }

  startNarration(context) {
    if (!this.narrationSupported()) return;

    const text = this.narrationTextFor(context);
    if (!text) return;

    const synth = window.speechSynthesis;
    if (synth.paused && this.state.currentNarrationContext === context && this.currentUtterance) {
      synth.resume();
      this.state.narrationActive = true;
      this.state.narrationStartMs = Date.now();
      this.updateNarrationButtons();
      return;
    }

    // Prevent overlap across sections/contexts.
    if (synth.speaking || synth.paused) this.stopNarration();

    const shouldCreateUtterance =
      !this.currentUtterance ||
      this.state.currentNarrationContext !== context ||
      this.state.currentNarrationText !== text;

    if (shouldCreateUtterance) {
      this.currentUtterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance.lang = "en-US";
      const voice = this.selectedSpeechVoice || this.selectEnglishVoice();
      if (voice) {
        this.currentUtterance.voice = voice;
      }
      this.currentUtterance.rate = this.narrationRateFor(context);
      this.currentUtterance.onstart = () => {
        this.state.narrationActive = true;
        this.state.narrationStartMs = Date.now();
        this.updateNarrationButtons();
      };
      this.currentUtterance.onpause = () => {
        this.captureNarrationElapsed();
        this.updateNarrationButtons();
      };
      this.currentUtterance.onresume = () => {
        this.state.narrationActive = true;
        this.state.narrationStartMs = Date.now();
        this.updateNarrationButtons();
      };
      this.currentUtterance.onend = () => {
        this.captureNarrationElapsed();
        this.updateNarrationButtons();
      };
      this.currentUtterance.onerror = () => {
        this.captureNarrationElapsed();
        this.updateNarrationButtons();
      };
    } else {
      this.currentUtterance.rate = this.narrationRateFor(context);
    }

    this.state.currentNarrationContext = context;
    this.state.currentNarrationText = text;
    this.state.narrationTriggersCase += 1;
    synth.speak(this.currentUtterance);
    this.updateNarrationButtons();
  }

  pauseNarration() {
    if (!this.narrationSupported()) return;
    const synth = window.speechSynthesis;
    if (synth.speaking && !synth.paused) {
      synth.pause();
      this.captureNarrationElapsed();
    }
    this.updateNarrationButtons();
  }

  captureNarrationElapsed() {
    if (!this.state.narrationActive || !this.state.narrationStartMs) return;
    this.state.narrationTimeMsCase += Math.max(0, Date.now() - this.state.narrationStartMs);
    this.state.narrationActive = false;
    this.state.narrationStartMs = 0;
  }

  stopNarration() {
    if (!this.narrationSupported()) return;
    this.captureNarrationElapsed();
    window.speechSynthesis.cancel();
    this.state.currentNarrationContext = "";
    this.state.currentNarrationText = "";
    this.state.narrationActive = false;
    this.state.narrationStartMs = 0;
    this.currentUtterance = null;
    // Re-apply button state on next frame to avoid transient browser
    // speaking flags immediately after cancel().
    this.updateNarrationButtons();
    window.setTimeout(() => this.updateNarrationButtons(), 0);
  }

  createUUID() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

function scoreJustificationWeighted(text, keywords) {
  const normalizedText = normalizeText(text);
  const textTokens = tokenize(normalizedText);

  let weightedMatch = 0;
  let maxWeight = 0;

  keywords.forEach((keyword, idx) => {
    const weight = Math.max(0.55, 1 - idx * 0.12);
    const strength = phraseMatchStrength(normalizedText, textTokens, normalizeText(keyword));
    weightedMatch += weight * strength;
    maxWeight += weight;
  });

  let semanticHits = 0;
  for (const term of GENERIC_SEMANTIC_TERMS) {
    if (textContainsStem(textTokens, term)) semanticHits += 1;
  }

  const semanticBoost = Math.min(0.2, semanticHits * 0.02);
  const baseline = maxWeight > 0 ? weightedMatch / maxWeight : 0;
  return clamp(baseline + semanticBoost, 0, 1);
}

function phraseMatchStrength(normalizedText, textTokens, keyword) {
  if (!keyword) return 0;
  if (normalizedText.includes(keyword)) return 1;

  const keywordTokens = tokenize(keyword);
  if (!keywordTokens.length) return 0;

  let tokenMatches = 0;
  for (const kt of keywordTokens) {
    if (textContainsStem(textTokens, kt)) tokenMatches += 1;
  }

  if (tokenMatches > 0) return Math.max(0.4, tokenMatches / keywordTokens.length * 0.85);

  if (keywordTokens.length === 1) {
    const key = keywordTokens[0];
    for (const tk of textTokens) {
      if (levenshtein(tk, key) <= 2) return 0.45;
    }
  }

  return 0;
}

function textContainsStem(tokens, rawTerm) {
  const term = rawTerm.toLowerCase();
  const stem = term.length > 5 ? term.slice(0, 5) : term;
  return tokens.some((tk) => tk.includes(stem) || stem.includes(tk));
}

function normalizeText(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(normalizedText) {
  return normalizedText ? normalizedText.split(" ").filter(Boolean) : [];
}

function levenshtein(a, b) {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const dp = Array.from({ length: al + 1 }, () => Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i += 1) dp[i][0] = i;
  for (let j = 0; j <= bl; j += 1) dp[0][j] = j;

  for (let i = 1; i <= al; i += 1) {
    for (let j = 1; j <= bl; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[al][bl];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatBarrierLabel(category) {
  return CATEGORY_DISPLAY_LABELS[category] || category;
}

function categoryFocusHint(category) {
  return CATEGORY_FOCUS_HINTS[category] || "Focus on the main element description and the user impact instead of smaller visual details.";
}

function categoryProblemExplanation(category) {
  return CATEGORY_PLAIN_EXPLANATIONS[category] || "This issue makes the screen harder to understand, use, or trust.";
}

function formatGroupList(groups) {
  if (!groups.length) return "People affected by this barrier in the current case.";
  if (groups.length === 1) return groups[0];
  if (groups.length === 2) return `${groups[0]} and ${groups[1]}`;
  return `${groups.slice(0, -1).join(", ")}, and ${groups.at(-1)}`;
}

function simplifyTechnicalText(text) {
  const replacements = [
    [/primary cue/gi, "main clue"],
    [/persistent label/gi, "visible label"],
    [/luminance contrast/gi, "contrast"],
    [/discoverability/gi, "noticeability"],
    [/completion errors/gi, "mistakes"],
    [/orientation declines/gi, "orientation becomes harder"],
    [/landmark order/gi, "the page order"],
    [/predictability/gi, "consistency"],
    [/robust keyboard focus visibility/gi, "clear keyboard focus"],
    [/operability/gi, "use"],
    [/precision-limited users/gi, "people with limited precision"],
    [/semantic structure/gi, "page structure"],
    [/non-text content/gi, "images, icons, or other visual content"],
    [/auto-advancing/gi, "moving"],
    [/input purpose can become unclear during entry/gi, "the field becomes unclear once you start typing"],
    [/increasing data quality and completion errors/gi, "which can lead to mistakes and slower completion"],
    [/reducing text legibility/gi, "making the text harder to read"],
    [/reducing consistency and predictability/gi, "making the screen less predictable"],
    [/screen reader users/gi, "screen reader users"],
    [/cognitive load/gi, "mental effort"]
  ];

  let simplified = String(text || "").replace(/\s+/g, " ").trim();
  for (const [pattern, replacement] of replacements) {
    simplified = simplified.replace(pattern, replacement);
  }

  simplified = simplified.replace(/\bThis ([a-z])/g, (m, g1) => `This ${g1}`);
  return simplified;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function lowercaseFirst(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function trimToWordBoundary(text, maxLength) {
  const value = String(text || "").trim();
  if (value.length <= maxLength) return value;
  const sliced = value.slice(0, maxLength + 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const output = lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced.slice(0, maxLength);
  return `${output.trim()}.`;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(array, rng) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const app = new BarrierBreakerApp();
app.init();
