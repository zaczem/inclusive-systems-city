window.SCENARIOS_DATA = [
  {
    "id": 1,
    "category": "Technical Debt",
    "title": "Legacy CMS Accessibility Gap",
    "description": "Your CMS lacks semantic structure and proper ARIA support.",
    "choices": [
      {
        "text": "Rebuild CMS completely",
        "effects": {
          "budget": -35,
          "accessibility": 20,
          "legalRisk": -15,
          "trust": 10,
          "technicalDebt": -25
        },
        "hiddenEffects": {
          "budget": -5,
          "trust": 3
        },
        "hiddenReveal": "Migration overruns reduce budget, but transparency improves trust."
      },
      {
        "text": "Patch most critical components",
        "effects": {
          "budget": -15,
          "accessibility": 10,
          "legalRisk": -5,
          "trust": 5,
          "technicalDebt": -10
        },
        "hiddenEffects": {
          "technicalDebt": 4
        },
        "hiddenReveal": "Patchwork creates future maintenance drag."
      },
      {
        "text": "Delay until next fiscal year",
        "effects": {
          "budget": 0,
          "accessibility": -5,
          "legalRisk": 10,
          "trust": -8,
          "technicalDebt": 15
        },
        "hiddenEffects": {
          "legalRisk": 3,
          "trust": -3
        },
        "hiddenReveal": "Advocacy groups escalate pressure after delay."
      }
    ]
  },
  {
    "id": 2,
    "category": "Legal",
    "title": "Regulatory Complaint Filed",
    "description": "A disability rights organization files a complaint against your service.",
    "choices": [
      {
        "text": "Launch immediate compliance remediation",
        "effects": {
          "budget": -20,
          "accessibility": 15,
          "legalRisk": -20,
          "trust": 8,
          "technicalDebt": -5
        },
        "hiddenEffects": {
          "budget": -4
        },
        "hiddenReveal": "External auditors increase short-term spending."
      },
      {
        "text": "Issue public statement only",
        "effects": {
          "budget": -5,
          "accessibility": 0,
          "legalRisk": 5,
          "trust": -10,
          "technicalDebt": 0
        },
        "hiddenEffects": {
          "legalRisk": 4
        },
        "hiddenReveal": "Statement triggers further regulatory scrutiny."
      },
      {
        "text": "Ignore the complaint",
        "effects": {
          "budget": 0,
          "accessibility": -5,
          "legalRisk": 20,
          "trust": -20,
          "technicalDebt": 5
        },
        "hiddenEffects": {
          "legalRisk": 8,
          "trust": -6
        },
        "hiddenReveal": "A class-action threat emerges."
      }
    ]
  },
  {
    "id": 3,
    "category": "Training",
    "title": "Developer Accessibility Training",
    "description": "Your dev team lacks WCAG knowledge.",
    "choices": [
      {
        "text": "Invest in certified training program",
        "effects": {
          "budget": -15,
          "accessibility": 12,
          "legalRisk": -5,
          "trust": 5,
          "technicalDebt": -8
        },
        "hiddenEffects": {
          "technicalDebt": -2
        },
        "hiddenReveal": "Improved coding standards reduce future rework."
      },
      {
        "text": "Share internal guidelines only",
        "effects": {
          "budget": -3,
          "accessibility": 4,
          "legalRisk": -1,
          "trust": 2,
          "technicalDebt": -2
        },
        "hiddenEffects": {
          "trust": -1
        },
        "hiddenReveal": "Staff perceive support as minimal."
      },
      {
        "text": "No action",
        "effects": {
          "budget": 0,
          "accessibility": -4,
          "legalRisk": 5,
          "trust": -3,
          "technicalDebt": 6
        },
        "hiddenEffects": {
          "technicalDebt": 3
        },
        "hiddenReveal": "Repeated errors accumulate in sprint backlog."
      }
    ]
  },
  {
    "id": 4,
    "category": "Procurement",
    "title": "Third-Party Widget Renewal",
    "description": "A popular booking widget fails keyboard navigation standards.",
    "choices": [
      {
        "text": "Switch to accessible vendor",
        "effects": {
          "budget": -12,
          "accessibility": 10,
          "legalRisk": -6,
          "trust": 6,
          "technicalDebt": -4
        },
        "hiddenEffects": {
          "budget": -3
        },
        "hiddenReveal": "Contract transition incurs integration fees."
      },
      {
        "text": "Negotiate remediation timeline",
        "effects": {
          "budget": -4,
          "accessibility": 4,
          "legalRisk": -2,
          "trust": 1,
          "technicalDebt": -1
        },
        "hiddenEffects": {
          "legalRisk": 3
        },
        "hiddenReveal": "Vendor misses milestones, creating legal exposure."
      },
      {
        "text": "Renew as-is",
        "effects": {
          "budget": 3,
          "accessibility": -6,
          "legalRisk": 9,
          "trust": -7,
          "technicalDebt": 5
        },
        "hiddenEffects": {
          "trust": -2,
          "technicalDebt": 3
        },
        "hiddenReveal": "Support teams absorb a flood of user complaints."
      }
    ]
  },
  {
    "id": 5,
    "category": "Incident Response",
    "title": "Screen Reader Outage",
    "description": "A release breaks compatibility with two major screen readers.",
    "choices": [
      {
        "text": "Roll back release immediately",
        "effects": {
          "budget": -6,
          "accessibility": 8,
          "legalRisk": -4,
          "trust": 5,
          "technicalDebt": 2
        },
        "hiddenEffects": {
          "budget": -2
        },
        "hiddenReveal": "Emergency rollback consumes overtime budget."
      },
      {
        "text": "Hotfix in current sprint",
        "effects": {
          "budget": -8,
          "accessibility": 12,
          "legalRisk": -6,
          "trust": 4,
          "technicalDebt": -3
        },
        "hiddenEffects": {
          "technicalDebt": 2
        },
        "hiddenReveal": "Compressed timeline leaves hidden code shortcuts."
      },
      {
        "text": "Schedule fix for next release",
        "effects": {
          "budget": 0,
          "accessibility": -8,
          "legalRisk": 10,
          "trust": -9,
          "technicalDebt": 4
        },
        "hiddenEffects": {
          "legalRisk": 4
        },
        "hiddenReveal": "Regulators issue warning notice for delayed mitigation."
      }
    ]
  },
  {
    "id": 6,
    "category": "Governance",
    "title": "Executive KPI Reset",
    "description": "Leadership asks for performance metrics tied to inclusion outcomes.",
    "choices": [
      {
        "text": "Add accessibility KPIs to executive scorecard",
        "effects": {
          "budget": -4,
          "accessibility": 7,
          "legalRisk": -3,
          "trust": 8,
          "technicalDebt": -3
        },
        "hiddenEffects": {
          "trust": 3
        },
        "hiddenReveal": "Public commitment improves confidence among advocacy partners."
      },
      {
        "text": "Use optional monthly reporting",
        "effects": {
          "budget": -1,
          "accessibility": 2,
          "legalRisk": -1,
          "trust": 2,
          "technicalDebt": 0
        },
        "hiddenEffects": {
          "trust": -1
        },
        "hiddenReveal": "Inconsistent reporting limits credibility."
      },
      {
        "text": "Keep existing productivity-only KPIs",
        "effects": {
          "budget": 0,
          "accessibility": -3,
          "legalRisk": 3,
          "trust": -5,
          "technicalDebt": 2
        },
        "hiddenEffects": {
          "legalRisk": 2
        },
        "hiddenReveal": "Board committee flags governance blind spots."
      }
    ]
  },
  {
    "id": 7,
    "category": "Research",
    "title": "User Testing Budget Cycle",
    "description": "You can fund one of several accessibility testing options this quarter.",
    "choices": [
      {
        "text": "Fund monthly moderated testing",
        "effects": {
          "budget": -10,
          "accessibility": 11,
          "legalRisk": -5,
          "trust": 6,
          "technicalDebt": -4
        },
        "hiddenEffects": {
          "technicalDebt": -2
        },
        "hiddenReveal": "Earlier defect discovery lowers engineering drag."
      },
      {
        "text": "Run one annual study",
        "effects": {
          "budget": -4,
          "accessibility": 4,
          "legalRisk": -2,
          "trust": 2,
          "technicalDebt": -1
        },
        "hiddenEffects": {
          "accessibility": -1
        },
        "hiddenReveal": "Long testing gaps let issues accumulate."
      },
      {
        "text": "Use analytics only",
        "effects": {
          "budget": 2,
          "accessibility": -4,
          "legalRisk": 4,
          "trust": -6,
          "technicalDebt": 3
        },
        "hiddenEffects": {
          "trust": -2
        },
        "hiddenReveal": "Community users report feeling excluded from decisions."
      }
    ]
  },
  {
    "id": 8,
    "category": "Content",
    "title": "Video Archive Compliance",
    "description": "Thousands of videos are missing captions and transcripts.",
    "choices": [
      {
        "text": "Launch full captioning initiative",
        "effects": {
          "budget": -22,
          "accessibility": 18,
          "legalRisk": -12,
          "trust": 10,
          "technicalDebt": -3
        },
        "hiddenEffects": {
          "budget": -4
        },
        "hiddenReveal": "Vendor QA rounds increase production costs."
      },
      {
        "text": "Caption top 20% highest traffic content",
        "effects": {
          "budget": -10,
          "accessibility": 9,
          "legalRisk": -5,
          "trust": 5,
          "technicalDebt": -1
        },
        "hiddenEffects": {
          "trust": -1
        },
        "hiddenReveal": "Long-tail users complain about unequal access."
      },
      {
        "text": "Pause media uploads",
        "effects": {
          "budget": -3,
          "accessibility": 3,
          "legalRisk": -1,
          "trust": -4,
          "technicalDebt": 1
        },
        "hiddenEffects": {
          "budget": 2
        },
        "hiddenReveal": "Temporary pause lowers storage expenses."
      },
      {
        "text": "No change",
        "effects": {
          "budget": 0,
          "accessibility": -7,
          "legalRisk": 9,
          "trust": -9,
          "technicalDebt": 3
        },
        "hiddenEffects": {
          "legalRisk": 4
        },
        "hiddenReveal": "State attorneys issue inquiry letter."
      }
    ]
  },
  {
    "id": 9,
    "category": "Security",
    "title": "MFA Rollout Friction",
    "description": "New authentication flow conflicts with assistive tech patterns.",
    "choices": [
      {
        "text": "Redesign flow with inclusive security review",
        "effects": {
          "budget": -14,
          "accessibility": 12,
          "legalRisk": -5,
          "trust": 7,
          "technicalDebt": -5
        },
        "hiddenEffects": {
          "budget": -2
        },
        "hiddenReveal": "Extended UX testing increases immediate spend."
      },
      {
        "text": "Add temporary support workaround",
        "effects": {
          "budget": -6,
          "accessibility": 6,
          "legalRisk": -2,
          "trust": 2,
          "technicalDebt": 1
        },
        "hiddenEffects": {
          "technicalDebt": 2
        },
        "hiddenReveal": "Workaround hardens into permanent complexity."
      },
      {
        "text": "Proceed unchanged",
        "effects": {
          "budget": 0,
          "accessibility": -6,
          "legalRisk": 8,
          "trust": -8,
          "technicalDebt": 4
        },
        "hiddenEffects": {
          "trust": -3
        },
        "hiddenReveal": "Account lockouts trigger social backlash."
      }
    ]
  },
  {
    "id": 10,
    "category": "Hiring",
    "title": "Accessibility Lead Vacancy",
    "description": "Your accessibility lead resigns during a critical transformation.",
    "choices": [
      {
        "text": "Hire senior specialist immediately",
        "effects": {
          "budget": -12,
          "accessibility": 10,
          "legalRisk": -4,
          "trust": 6,
          "technicalDebt": -4
        },
        "hiddenEffects": {
          "trust": 2
        },
        "hiddenReveal": "External stakeholders view the hire as serious commitment."
      },
      {
        "text": "Split role across current managers",
        "effects": {
          "budget": -3,
          "accessibility": 3,
          "legalRisk": -1,
          "trust": 1,
          "technicalDebt": 1
        },
        "hiddenEffects": {
          "technicalDebt": 2
        },
        "hiddenReveal": "Part-time ownership weakens architecture governance."
      },
      {
        "text": "Freeze hiring",
        "effects": {
          "budget": 5,
          "accessibility": -5,
          "legalRisk": 4,
          "trust": -6,
          "technicalDebt": 5
        },
        "hiddenEffects": {
          "legalRisk": 3
        },
        "hiddenReveal": "Unowned backlog creates compliance bottlenecks."
      }
    ]
  },
  {
    "id": 11,
    "category": "Platform",
    "title": "Design System Fork",
    "description": "Teams diverged from the core design system and introduced inconsistent components.",
    "choices": [
      {
        "text": "Re-centralize under shared component governance",
        "effects": {
          "budget": -11,
          "accessibility": 11,
          "legalRisk": -4,
          "trust": 4,
          "technicalDebt": -12
        },
        "hiddenEffects": {
          "budget": -2
        },
        "hiddenReveal": "Migration effort requires additional staffing."
      },
      {
        "text": "Allow temporary forks with checklist",
        "effects": {
          "budget": -4,
          "accessibility": 4,
          "legalRisk": -1,
          "trust": 1,
          "technicalDebt": -2
        },
        "hiddenEffects": {
          "technicalDebt": 3
        },
        "hiddenReveal": "Fork reconciliation becomes delayed technical burden."
      },
      {
        "text": "Do nothing",
        "effects": {
          "budget": 0,
          "accessibility": -4,
          "legalRisk": 4,
          "trust": -4,
          "technicalDebt": 10
        },
        "hiddenEffects": {
          "accessibility": -2
        },
        "hiddenReveal": "Inconsistent controls degrade user experience quality."
      }
    ]
  },
  {
    "id": 12,
    "category": "Communications",
    "title": "Public Accessibility Roadmap Request",
    "description": "Community organizations ask for a transparent 12-month roadmap.",
    "choices": [
      {
        "text": "Publish roadmap with measurable milestones",
        "effects": {
          "budget": -5,
          "accessibility": 5,
          "legalRisk": -2,
          "trust": 10,
          "technicalDebt": -2
        },
        "hiddenEffects": {
          "trust": 2
        },
        "hiddenReveal": "Transparency increases partnership opportunities."
      },
      {
        "text": "Share high-level commitments only",
        "effects": {
          "budget": -2,
          "accessibility": 2,
          "legalRisk": 0,
          "trust": 2,
          "technicalDebt": 0
        },
        "hiddenEffects": {
          "trust": -2
        },
        "hiddenReveal": "Advocates perceive messaging as vague."
      },
      {
        "text": "Decline to publish roadmap",
        "effects": {
          "budget": 0,
          "accessibility": -2,
          "legalRisk": 3,
          "trust": -7,
          "technicalDebt": 1
        },
        "hiddenEffects": {
          "legalRisk": 2,
          "trust": -2
        },
        "hiddenReveal": "Complaint volume rises without a visible plan."
      }
    ]
  },
  {
    "id": 13,
    "category": "Operations",
    "title": "Support Ticket Surge",
    "description": "Support reports a spike in accessibility-related tickets.",
    "choices": [
      {
        "text": "Create cross-functional rapid response squad",
        "effects": {
          "budget": -9,
          "accessibility": 9,
          "legalRisk": -4,
          "trust": 7,
          "technicalDebt": -3
        },
        "hiddenEffects": {
          "budget": -2
        },
        "hiddenReveal": "Temporary squad requires contractor support."
      },
      {
        "text": "Prioritize tickets by severity only",
        "effects": {
          "budget": -3,
          "accessibility": 4,
          "legalRisk": -1,
          "trust": 2,
          "technicalDebt": 0
        },
        "hiddenEffects": {
          "trust": -1
        },
        "hiddenReveal": "Lower-severity users feel ignored."
      },
      {
        "text": "Redirect users to self-help pages",
        "effects": {
          "budget": 2,
          "accessibility": -3,
          "legalRisk": 4,
          "trust": -8,
          "technicalDebt": 2
        },
        "hiddenEffects": {
          "trust": -3
        },
        "hiddenReveal": "Escalations increase due to unresolved barriers."
      }
    ]
  },
  {
    "id": 14,
    "category": "Data",
    "title": "Accessibility Metrics Audit",
    "description": "Existing dashboards track only page speed and conversion.",
    "choices": [
      {
        "text": "Implement inclusive analytics framework",
        "effects": {
          "budget": -8,
          "accessibility": 8,
          "legalRisk": -3,
          "trust": 5,
          "technicalDebt": -3
        },
        "hiddenEffects": {
          "technicalDebt": -1
        },
        "hiddenReveal": "Better telemetry helps prevent recurring regressions."
      },
      {
        "text": "Add limited accessibility KPI panel",
        "effects": {
          "budget": -3,
          "accessibility": 3,
          "legalRisk": -1,
          "trust": 2,
          "technicalDebt": 0
        },
        "hiddenEffects": {
          "accessibility": 1
        },
        "hiddenReveal": "Focused metrics improve team awareness slightly."
      },
      {
        "text": "Maintain current analytics",
        "effects": {
          "budget": 0,
          "accessibility": -3,
          "legalRisk": 3,
          "trust": -3,
          "technicalDebt": 2
        },
        "hiddenEffects": {
          "legalRisk": 2
        },
        "hiddenReveal": "Lack of evidence weakens legal defense posture."
      }
    ]
  },
  {
    "id": 15,
    "category": "Mobile",
    "title": "Mobile App Relaunch Deadline",
    "description": "Product wants to ship before finishing assistive gesture testing.",
    "choices": [
      {
        "text": "Delay launch until inclusive QA sign-off",
        "effects": {
          "budget": -7,
          "accessibility": 10,
          "legalRisk": -5,
          "trust": 6,
          "technicalDebt": -2
        },
        "hiddenEffects": {
          "trust": 2
        },
        "hiddenReveal": "Users and partners appreciate quality-first approach."
      },
      {
        "text": "Ship with known issues and patch plan",
        "effects": {
          "budget": -2,
          "accessibility": 1,
          "legalRisk": 3,
          "trust": -3,
          "technicalDebt": 4
        },
        "hiddenEffects": {
          "technicalDebt": 2
        },
        "hiddenReveal": "Patch commitments are repeatedly deferred."
      },
      {
        "text": "Ship immediately without remediation",
        "effects": {
          "budget": 4,
          "accessibility": -8,
          "legalRisk": 10,
          "trust": -10,
          "technicalDebt": 6
        },
        "hiddenEffects": {
          "legalRisk": 5
        },
        "hiddenReveal": "App store complaints trigger regulator interest."
      }
    ]
  },
  {
    "id": 16,
    "category": "Finance",
    "title": "Cost-Cutting Mandate",
    "description": "CFO requests a 10% program cut across all departments.",
    "choices": [
      {
        "text": "Protect accessibility funding and cut elsewhere",
        "effects": {
          "budget": -8,
          "accessibility": 7,
          "legalRisk": -2,
          "trust": 5,
          "technicalDebt": -1
        },
        "hiddenEffects": {
          "trust": -2
        },
        "hiddenReveal": "Other teams resist reallocations, reducing internal trust."
      },
      {
        "text": "Apply proportional cuts everywhere",
        "effects": {
          "budget": 3,
          "accessibility": -2,
          "legalRisk": 2,
          "trust": -2,
          "technicalDebt": 2
        },
        "hiddenEffects": {
          "technicalDebt": 2
        },
        "hiddenReveal": "Reduced engineering bandwidth grows backlog debt."
      },
      {
        "text": "Cut accessibility initiatives first",
        "effects": {
          "budget": 8,
          "accessibility": -8,
          "legalRisk": 8,
          "trust": -9,
          "technicalDebt": 5
        },
        "hiddenEffects": {
          "legalRisk": 4,
          "trust": -2
        },
        "hiddenReveal": "External partners downgrade your inclusion credibility."
      }
    ]
  },
  {
    "id": 17,
    "category": "Policy",
    "title": "Procurement Policy Rewrite",
    "description": "New vendors can be required to meet accessibility conformance before contracts.",
    "choices": [
      {
        "text": "Mandate conformance in all RFPs",
        "effects": {
          "budget": -6,
          "accessibility": 8,
          "legalRisk": -4,
          "trust": 6,
          "technicalDebt": -2
        },
        "hiddenEffects": {
          "budget": -2
        },
        "hiddenReveal": "Fewer eligible vendors briefly raise procurement costs."
      },
      {
        "text": "Set optional conformance targets",
        "effects": {
          "budget": -1,
          "accessibility": 3,
          "legalRisk": -1,
          "trust": 2,
          "technicalDebt": 0
        },
        "hiddenEffects": {
          "legalRisk": 1
        },
        "hiddenReveal": "Optional clauses weaken enforceability in disputes."
      },
      {
        "text": "Keep policy unchanged",
        "effects": {
          "budget": 1,
          "accessibility": -3,
          "legalRisk": 4,
          "trust": -4,
          "technicalDebt": 3
        },
        "hiddenEffects": {
          "technicalDebt": 2
        },
        "hiddenReveal": "Non-compliant vendor tooling compounds integration issues."
      }
    ]
  },
  {
    "id": 18,
    "category": "Partnerships",
    "title": "Advisory Council Invitation",
    "description": "Disability advocates propose a paid advisory council.",
    "choices": [
      {
        "text": "Create council with decision input",
        "effects": {
          "budget": -9,
          "accessibility": 9,
          "legalRisk": -3,
          "trust": 11,
          "technicalDebt": -2
        },
        "hiddenEffects": {
          "trust": 3
        },
        "hiddenReveal": "Long-term partnership strengthens public trust."
      },
      {
        "text": "Host quarterly listening sessions",
        "effects": {
          "budget": -3,
          "accessibility": 4,
          "legalRisk": -1,
          "trust": 4,
          "technicalDebt": 0
        },
        "hiddenEffects": {
          "accessibility": 1
        },
        "hiddenReveal": "Recurring input catches small barriers earlier."
      },
      {
        "text": "Decline formal engagement",
        "effects": {
          "budget": 0,
          "accessibility": -3,
          "legalRisk": 3,
          "trust": -8,
          "technicalDebt": 1
        },
        "hiddenEffects": {
          "trust": -3
        },
        "hiddenReveal": "Advocacy groups publicly criticize your approach."
      }
    ]
  },
  {
    "id": 19,
    "category": "QA",
    "title": "Automation Coverage Debate",
    "description": "Engineers request budget for automated accessibility testing in CI.",
    "choices": [
      {
        "text": "Fund full CI accessibility suite",
        "effects": {
          "budget": -10,
          "accessibility": 10,
          "legalRisk": -4,
          "trust": 4,
          "technicalDebt": -8
        },
        "hiddenEffects": {
          "budget": -1
        },
        "hiddenReveal": "Tool licensing and maintenance add recurring cost."
      },
      {
        "text": "Pilot in high-risk services only",
        "effects": {
          "budget": -4,
          "accessibility": 5,
          "legalRisk": -2,
          "trust": 2,
          "technicalDebt": -3
        },
        "hiddenEffects": {
          "technicalDebt": 1
        },
        "hiddenReveal": "Uncovered services continue accumulating defects."
      },
      {
        "text": "Rely on manual QA only",
        "effects": {
          "budget": 2,
          "accessibility": -4,
          "legalRisk": 4,
          "trust": -3,
          "technicalDebt": 4
        },
        "hiddenEffects": {
          "legalRisk": 2
        },
        "hiddenReveal": "Regression escapes increase legal exposure."
      }
    ]
  },
  {
    "id": 20,
    "category": "Strategy",
    "title": "Annual Planning Summit",
    "description": "You must choose the organization-wide strategy theme for next year.",
    "choices": [
      {
        "text": "Inclusion-by-design transformation",
        "effects": {
          "budget": -14,
          "accessibility": 14,
          "legalRisk": -6,
          "trust": 9,
          "technicalDebt": -6
        },
        "hiddenEffects": {
          "trust": 2,
          "budget": -2
        },
        "hiddenReveal": "Ambitious transformation improves reputation but needs sustained funding."
      },
      {
        "text": "Balanced incremental improvements",
        "effects": {
          "budget": -6,
          "accessibility": 6,
          "legalRisk": -3,
          "trust": 4,
          "technicalDebt": -3
        },
        "hiddenEffects": {
          "technicalDebt": 1
        },
        "hiddenReveal": "Compromise pace leaves some structural debt unresolved."
      },
      {
        "text": "Growth-first roadmap",
        "effects": {
          "budget": 6,
          "accessibility": -6,
          "legalRisk": 6,
          "trust": -6,
          "technicalDebt": 5
        },
        "hiddenEffects": {
          "legalRisk": 3,
          "trust": -2
        },
        "hiddenReveal": "Fast expansion intensifies compliance and stakeholder pressure."
      }
    ]
  }
];
