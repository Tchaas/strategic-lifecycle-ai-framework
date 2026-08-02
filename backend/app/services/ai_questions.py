"""Static AI question sets — a Python constant, NOT database rows.

Each resource type has a fixed set of plain-language questions. Every populatable
field on the resource's Pydantic schema is covered by exactly one question via its
``fields`` list (camelCase, matching the API alias). ``MAX_ANSWER_LENGTH`` is enforced
server-side on the user's answers (the schemas themselves carry no length limits).
"""

from typing import Any

QUESTION_SET_VERSION = 1
MAX_ANSWER_LENGTH = 600

RESOURCE_TYPES = ("strategic_objective", "lean_business_case", "discovery")

# resource_type -> ordered list of question dicts.
_QUESTIONS: dict[str, list[dict[str, Any]]] = {
    "strategic_objective": [
        {
            "id": "initiative",
            "prompt": "What is this strategic initiative, and what should it achieve at the executive level?",
            "helper": "Name the initiative, the headline objective leadership cares about, and the kind of "
            "strategic value it drives (e.g. revenue growth, cost reduction, customer experience).",
            "input_type": "textarea",
            "required": True,
            "max_length": MAX_ANSWER_LENGTH,
            "fields": ["strategicInitiativeName", "executiveObjective", "strategicValueCategory"],
        },
        {
            "id": "outcomes",
            "prompt": "What business outcome and financial impact do you expect, and is the value "
            "financial, operational, or mixed?",
            "helper": "Describe the concrete outcome, the money involved, and whether the payoff is mostly "
            "financial, operational, or a mix of both.",
            "input_type": "textarea",
            "required": False,
            "max_length": MAX_ANSWER_LENGTH,
            "fields": ["expectedBusinessOutcome", "financialImpact", "expectedValueType"],
        },
        {
            "id": "urgency_timeline",
            "prompt": "Why is this urgent, and when should it be implemented?",
            "helper": "Explain the urgency and give a target year plus rough start and end dates if you have them.",
            "input_type": "textarea",
            "required": False,
            "max_length": MAX_ANSWER_LENGTH,
            "fields": [
                "urgencyRationale",
                "targetImplementationYear",
                "targetImplementationStartDate",
                "targetImplementationEndDate",
            ],
        },
        {
            "id": "problem",
            "prompt": "What problem or opportunity is this addressing, and what happens if nothing changes?",
            "helper": "Describe the problem or opportunity, today's limitation, the cost of inaction, and whether "
            "it is a customer problem, an internal problem, or both.",
            "input_type": "textarea",
            "required": False,
            "max_length": MAX_ANSWER_LENGTH,
            "fields": ["problemOpportunityStatement", "costOfInaction", "currentLimitation", "problemType"],
        },
        {
            "id": "impact_hypothesis",
            "prompt": "Who is impacted, and what is your hypothesis about the value this will create?",
            "helper": "List the teams or groups affected and state your value hypothesis — what you believe will "
            "improve and why.",
            "input_type": "textarea",
            "required": False,
            "max_length": MAX_ANSWER_LENGTH,
            "fields": ["impactedTeams", "valueHypothesis"],
        },
        {
            "id": "measurement",
            "prompt": "How will you measure the value, and over what timeframe will it be realized?",
            "helper": "Describe how you'll measure success and how long until the value is expected to materialize.",
            "input_type": "textarea",
            "required": False,
            "max_length": MAX_ANSWER_LENGTH,
            "fields": ["valueMeasurementApproach", "valueRealizationTimeframe"],
        },
    ],
    "lean_business_case": [
        {
            "id": "title_summary",
            "prompt": "What would you call this business case, and how would you summarize it in a sentence or two?",
            "helper": "Give a short title and a brief summary of what the case proposes.",
            "input_type": "textarea",
            "required": True,
            "max_length": MAX_ANSWER_LENGTH,
            "fields": ["title", "summary"],
        },
        {
            "id": "problem",
            "prompt": "What problem or opportunity does this business case address?",
            "helper": "Describe the specific problem or opportunity the case is responding to.",
            "input_type": "textarea",
            "required": False,
            "max_length": MAX_ANSWER_LENGTH,
            "fields": ["problemOpportunityStatement"],
        },
        {
            "id": "value",
            "prompt": "What value do you expect, and what type of value is it?",
            "helper": "State your value hypothesis and whether the value is cost savings, revenue, risk "
            "reduction, or efficiency.",
            "input_type": "textarea",
            "required": False,
            "max_length": MAX_ANSWER_LENGTH,
            "fields": ["valueHypothesis", "valueType"],
        },
        {
            "id": "priority",
            "prompt": "How would you prioritize this business case?",
            "helper": "Indicate whether this is low, medium, or high priority and why.",
            "input_type": "textarea",
            "required": False,
            "max_length": MAX_ANSWER_LENGTH,
            "fields": ["priority"],
        },
        {
            "id": "financials",
            "prompt": "What are the forecast cost and forecast value for this business case?",
            "helper": "Give your best estimate of the cost to deliver it and the value it is expected to return.",
            "input_type": "textarea",
            "required": False,
            "max_length": MAX_ANSWER_LENGTH,
            "fields": ["forecastCost", "forecastValue"],
        },
    ],
    "discovery": [
        {
            "id": "problem",
            "prompt": "What is the core problem this discovery is investigating?",
            "helper": "State the problem the discovery work is exploring.",
            "input_type": "textarea",
            "required": False,
            "max_length": MAX_ANSWER_LENGTH,
            "fields": ["problemStatement"],
        },
        {
            "id": "personas_journey",
            "prompt": "What have you learned about the people involved and their journey?",
            "helper": "Summarize persona findings and how those people move through the current journey.",
            "input_type": "textarea",
            "required": False,
            "max_length": MAX_ANSWER_LENGTH,
            "fields": ["personaFindings", "journeyMap"],
        },
        {
            "id": "current_process",
            "prompt": "What does the current process look like, and where are the bottlenecks?",
            "helper": "Describe the current-state process and where it breaks down or slows people down.",
            "input_type": "textarea",
            "required": False,
            "max_length": MAX_ANSWER_LENGTH,
            "fields": ["currentStateProcessMap", "bottleneckAnalysis"],
        },
        {
            "id": "data",
            "prompt": "What have you found in the data?",
            "helper": "Summarize the relevant data findings that informed this discovery.",
            "input_type": "textarea",
            "required": False,
            "max_length": MAX_ANSWER_LENGTH,
            "fields": ["dataFindings"],
        },
        {
            "id": "constraints",
            "prompt": "What legacy systems or constraints limit what's possible here?",
            "helper": "Describe legacy constraints — technical, organizational, or otherwise — that "
            "shape the solution.",
            "input_type": "textarea",
            "required": False,
            "max_length": MAX_ANSWER_LENGTH,
            "fields": ["legacyConstraints"],
        },
        {
            "id": "future_metrics",
            "prompt": "What does the future state need to deliver, and how will you measure discovery progress?",
            "helper": "Describe the needs the future state must satisfy and the metrics you'll track.",
            "input_type": "textarea",
            "required": False,
            "max_length": MAX_ANSWER_LENGTH,
            "fields": ["futureStateNeeds", "discoveryMetrics"],
        },
        {
            "id": "governance",
            "prompt": "What governance considerations came out of this discovery?",
            "helper": "Note any governance, compliance, or oversight findings.",
            "input_type": "textarea",
            "required": False,
            "max_length": MAX_ANSWER_LENGTH,
            "fields": ["governanceFindings"],
        },
    ],
}


def question_set(resource_type: str) -> dict[str, Any]:
    """Return the versioned question set for a resource type, or raise KeyError."""
    return {
        "resource_type": resource_type,
        "version": QUESTION_SET_VERSION,
        "questions": _QUESTIONS[resource_type],
    }
