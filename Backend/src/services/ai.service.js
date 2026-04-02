const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
const puppeteer = require("puppeteer")
const { z } = require("zod")
const { default: zodToJsonSchema } = require("zod-to-json-schema")



function getAiClient() {
    const apiKey = process.env.GROQ_API_KEY
    const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b"

    if (!apiKey) {
        throw new Error(
            "UNAUTHENTICATED: GROQ_API_KEY is missing. Add it to Backend/src/.env or set the environment variable before generating an interview report."
        )
    }

    return { apiKey, model }
}

function toArray(value) {
    if (Array.isArray(value)) {
        return value
    }

    if (value && typeof value === "object") {
        return [value]
    }

    return []
}

function normalizeQuestionItems(items) {
    return toArray(items)
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
            question: String(item.question || "").trim(),
            intention: String(item.intention || "").trim(),
            answer: String(item.answer || "").trim(),
        }))
        .filter((item) => item.question && item.intention && item.answer)
}

function normalizeSkillGapItems(items) {
    return toArray(items)
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
            skill: String(item.skill || "").trim(),
            severity: ["low", "medium", "high"].includes(String(item.severity || "").toLowerCase())
                ? String(item.severity).toLowerCase()
                : "medium",
        }))
        .filter((item) => item.skill)
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
}

function toTitleCase(value) {
    return String(value || "")
        .replace(/[_/.-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase())
}

function inferRoleTitle(jobDescription) {
    const cleaned = String(jobDescription || "").replace(/\s+/g, " ").trim()

    if (!cleaned) {
        return "Target Role"
    }

    const normalized = cleaned
        .replace(/^(overview|job description|summary)[:\s-]*/i, "")
        .replace(/^we are (looking for|hiring|seeking)\s+(an?\s+)?/i, "")
        .replace(/^position[:\s-]*/i, "")
        .replace(/^role[:\s-]*/i, "")

    const titlePatterns = [
        /((?:senior|junior|lead|principal|staff)?\s*(?:full stack|frontend|front end|backend|back end|software|web|mobile|devops|data|platform|product)?\s*(?:engineer|developer|architect|manager|analyst))/i,
        /(?:role|position)\s*(?:is|:)?\s*([A-Z][A-Za-z0-9/&,+\- ]{4,60})/i,
        /(?:hiring|looking for|seeking)\s+(?:an?\s+)?([A-Z][A-Za-z0-9/&,+\- ]{4,60})/i,
    ]

    for (const pattern of titlePatterns) {
        const match = normalized.match(pattern)

        if (match?.[1]) {
            return toTitleCase(match[1])
        }
    }

    const firstMeaningfulChunk = normalized
        .split(/[.!?\n]/)
        .map((part) => part.trim())
        .find(Boolean)

    return toTitleCase((firstMeaningfulChunk || "Target Role").slice(0, 60))
}

function normalizeRoadmapTopic(value) {
    const raw = String(value || "").trim()

    if (!raw) {
        return ""
    }

    const cleaned = raw
        .replace(/\b(depth|practice|examples|storytelling|communication|overview|alignment|interview|gap)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim()

    const lower = cleaned.toLowerCase()

    if (!cleaned || cleaned.length < 3) {
        return ""
    }

    if (["building", "motivated", "looking", "overview"].includes(lower)) {
        return ""
    }

    if (lower === "apis" || lower === "api") {
        return "API design and integration"
    }

    if (lower === "nestjs") {
        return "NestJS backend patterns"
    }

    if (lower === "performance") {
        return "Performance optimization"
    }

    if (lower === "react") {
        return "React application architecture"
    }

    return toTitleCase(cleaned)
}

function getMissingKeywords(candidateKeywords = [], jobKeywords = [], limit = 6) {
    const candidateSet = new Set(
        candidateKeywords
            .map((keyword) => String(keyword || "").trim().toLowerCase())
            .filter(Boolean)
    )

    return jobKeywords
        .map((keyword) => String(keyword || "").trim())
        .filter(Boolean)
        .filter((keyword) => !candidateSet.has(keyword.toLowerCase()))
        .slice(0, limit)
}

function isLowSignalPreparationPlan(items) {
    const normalizedItems = toArray(items)

    if (normalizedItems.length === 0) {
        return true
    }

    const genericFocusPattern = /^Interview preparation for day \d+$/i
    const allGenericFocus = normalizedItems.every((item) =>
        genericFocusPattern.test(String(item?.focus || "").trim())
    )
    const taskSignatures = new Set(
        normalizedItems.map((item) =>
            toArray(item?.tasks)
                .map((task) => String(task || "").trim().toLowerCase())
                .join("|")
        )
    )

    return allGenericFocus || taskSignatures.size <= 1
}

function isLowSignalSkillGaps(items) {
    const normalizedItems = normalizeSkillGapItems(items)

    if (normalizedItems.length === 0) {
        return true
    }

    const staticFallbackSkills = new Set([
        "advanced system design communication",
        "performance optimization storytelling",
        "production incident examples",
    ])

    return normalizedItems.every((item) => staticFallbackSkills.has(item.skill.toLowerCase()))
}

function buildDynamicSkillGaps({ candidateKeywords = [], jobKeywords = [] }) {
    const missingKeywords = getMissingKeywords(candidateKeywords, jobKeywords, 5)

    if (missingKeywords.length > 0) {
        return missingKeywords.slice(0, 3).map((keyword, index) => ({
            skill: `${toTitleCase(keyword)} depth`,
            severity: index === 0 ? "high" : index === 1 ? "medium" : "low",
        }))
    }

    const fallbackSkills = jobKeywords.slice(0, 3)

    if (fallbackSkills.length > 0) {
        return fallbackSkills.map((keyword, index) => ({
            skill: `${toTitleCase(keyword)} interview examples`,
            severity: index === 0 ? "medium" : "low",
        }))
    }

    return [
        { skill: "Role-specific project storytelling", severity: "medium" },
        { skill: "Targeted interview examples", severity: "medium" },
        { skill: "Clear impact communication", severity: "low" },
    ]
}

function buildDynamicPreparationPlan({
    roadmapDays = 7,
    roleTitle,
    skillGaps = [],
    candidateKeywords = [],
    jobKeywords = [],
}) {
    const safeRoadmapDays = Math.max(1, Math.floor(Number(roadmapDays) || 7))
    const prioritizedGaps = skillGaps
        .map((item) => normalizeRoadmapTopic(item?.skill))
        .filter(Boolean)
        .slice(0, 4)
    const keywordBackups = getMissingKeywords(candidateKeywords, jobKeywords, 6)
        .map((keyword) => normalizeRoadmapTopic(keyword))
        .filter(Boolean)
    const strengthTopics = candidateKeywords
        .slice(0, 4)
        .map((keyword) => normalizeRoadmapTopic(keyword))
        .filter(Boolean)
    const focusPool = [...new Set([...prioritizedGaps, ...keywordBackups, ...strengthTopics])]
    const mainRole = roleTitle || "target role"
    const items = []
    const middleDayTemplates = [
        {
            focus: (topic) => `${topic} foundations and project mapping`,
            tasks: (topic) => [
                `Review the core concepts behind ${topic} and relate them to what the job expects.`,
                `Pick one of your past projects where ${topic} appeared and write down the exact decisions you made.`,
                `Prepare two short explanations showing how your current experience can transfer to stronger ${topic} delivery.`,
            ],
        },
        {
            focus: (topic) => `${topic} implementation drill`,
            tasks: (topic) => [
                `Outline how you would build or improve a feature involving ${topic} for this role.`,
                `Practice technical questions that test implementation choices, tradeoffs, and debugging around ${topic}.`,
                `Write a compact talking point sheet with architecture, bottlenecks, and measurable impact for ${topic}.`,
            ],
        },
        {
            focus: (topic) => `${topic} interview answer rehearsal`,
            tasks: (topic) => [
                `Turn your strongest ${topic} example into a clear interview story with context, action, and outcome.`,
                `Practice follow-up questions that challenge your design choices, performance assumptions, or edge cases.`,
                `Refine your answers so they sound specific to this job description instead of generic preparation.`,
            ],
        },
        {
            focus: (topic) => `${topic} revision and gap closing`,
            tasks: (topic) => [
                `Identify what still feels weak in ${topic} and close it with focused revision or a mini build exercise.`,
                `Compare the job requirement for ${topic} with your resume and add one stronger example you can mention live.`,
                `Rehearse concise answers that connect ${topic} to business impact, scalability, or delivery quality.`,
            ],
        },
    ]

    for (let day = 1; day <= safeRoadmapDays; day += 1) {
        let focus
        let tasks

        if (day === 1) {
            focus = `${mainRole} gap mapping and interview strategy`
            tasks = [
                `Review the ${mainRole} requirements and identify the most important technologies, ownership expectations, and delivery signals.`,
                "Map your resume projects to the job description and mark where your examples feel weak or outdated.",
                `Choose the top ${Math.min(4, Math.max(2, focusPool.length || 2))} study themes for the rest of the roadmap.`,
            ]
        } else if (day === safeRoadmapDays) {
            focus = `Final rehearsal for the ${mainRole} interview`
            tasks = [
                "Run a timed mock interview covering both technical and behavioral questions.",
                "Refine the weakest answers, especially around tradeoffs, impact, and ownership.",
                "Prepare a final review sheet with metrics, stories, and role-aligned talking points.",
            ]
        } else if (day === Math.ceil(safeRoadmapDays / 2)) {
            const midGap = focusPool[(day - 2) % Math.max(focusPool.length, 1)] || "behavioral communication"
            focus = `Behavioral story rehearsal around ${midGap}`
            tasks = [
                `Prepare STAR stories that show ownership, collaboration, and learning around ${midGap}.`,
                "Practice concise answers for conflict, pressure, feedback, and stakeholder communication.",
                "Add measurable outcomes and a clear takeaway to each story.",
            ]
        } else {
            const selectedGap = focusPool[(day - 2) % Math.max(focusPool.length, 1)] || `${mainRole} core preparation`
            const template = middleDayTemplates[(day - 2) % middleDayTemplates.length]
            focus = template.focus(selectedGap)
            tasks = template.tasks(selectedGap)
        }

        items.push({ day, focus, tasks })
    }

    return items
}

function normalizePreparationPlanItems(items, targetDays = 7) {
    const safeTargetDays = Math.max(1, Math.floor(Number(targetDays) || 7))
    const normalizedItems = toArray(items)
        .filter((item) => item && typeof item === "object")
        .map((item, index) => ({
            day: Number(item.day) || index + 1,
            focus: String(item.focus || "").trim(),
            tasks: Array.isArray(item.tasks)
                ? item.tasks.map((task) => String(task).trim()).filter(Boolean)
                : [],
        }))
        .filter((item) => item.focus && item.tasks.length > 0)
        .sort((a, b) => a.day - b.day)

    const uniqueItems = []
    const seenDays = new Set()

    for (const item of normalizedItems) {
        if (item.day < 1 || item.day > safeTargetDays || seenDays.has(item.day)) {
            continue
        }

        seenDays.add(item.day)
        uniqueItems.push(item)
    }

    return uniqueItems.sort((a, b) => a.day - b.day)
}

function buildFallbackQuestionSet(type, jobDescription) {
    const roleHint = jobDescription
        ? `for the role: ${jobDescription.slice(0, 120)}`
        : "for the target role"

    if (type === "technical") {
        return [
            {
                question: `What are the most important technical challenges you expect ${roleHint}?`,
                intention: "To evaluate whether the candidate understands the technical expectations of the role.",
                answer: "Connect your past projects to the stack, architecture, scalability, and debugging challenges relevant to the role.",
            },
            {
                question: "Can you describe a project where you solved a difficult backend or system design problem?",
                intention: "To assess real-world engineering depth and problem-solving ability.",
                answer: "Explain the problem, constraints, the design decisions you made, tradeoffs, and the measurable result.",
            },
            {
                question: "How do you debug production issues in a live application?",
                intention: "To assess troubleshooting approach, ownership, and operational awareness.",
                answer: "Discuss logs, metrics, reproducing issues, narrowing hypotheses, validating fixes, and preventing recurrence.",
            },
            {
                question: "How would you map your strongest technical skills to the highest-priority requirements in this job description?",
                intention: "To evaluate whether the candidate can connect experience directly to job needs.",
                answer: "Highlight the strongest overlap first, then mention one gap and explain how you would close it quickly.",
            },
            {
                question: "What tradeoffs did you make in a recent project involving performance, scalability, or maintainability?",
                intention: "To assess engineering judgment and practical decision-making.",
                answer: "Describe the context, options considered, why you chose one path, and what happened after launch.",
            },
            {
                question: "Which part of your project work best demonstrates your ability to learn a required technology quickly?",
                intention: "To measure adaptability against missing or emerging role requirements.",
                answer: "Show how you ramped up, delivered value quickly, and validated your implementation with measurable outcomes.",
            },
            {
                question: "How do you ensure code quality when building features under time pressure?",
                intention: "To assess engineering discipline and delivery habits.",
                answer: "Discuss testing strategy, code review, incremental releases, and how you balance speed with reliability.",
            },
            {
                question: "Tell me about a complex bug or outage you owned from investigation through resolution.",
                intention: "To assess depth in diagnosis, communication, and ownership.",
                answer: "Walk through symptoms, hypotheses, debugging steps, the fix, and how you prevented repeat failures.",
            },
            {
                question: "How would you explain the architecture of your most relevant project to this hiring team?",
                intention: "To assess system understanding and communication clarity.",
                answer: "Explain the core components, data flow, major decisions, and how that project relates to this role.",
            },
            {
                question: "Which technical gap between your background and this role would you prioritize closing first?",
                intention: "To assess self-awareness and practical growth planning.",
                answer: "Identify the gap honestly, explain why it matters, and outline a concrete plan to close it fast.",
            },
            {
                question: "What metrics or signals do you use to judge whether a technical solution is successful?",
                intention: "To assess product awareness and outcome-oriented thinking.",
                answer: "Talk about correctness, latency, reliability, business impact, and post-release monitoring.",
            },
            {
                question: "How would you prepare for a technical area in this role that appears in the job description but less often in your recent work?",
                intention: "To assess preparation strategy and proactive learning.",
                answer: "Show a concrete ramp-up plan using docs, hands-on practice, project mapping, and mock interview rehearsal.",
            },
        ]
    }

    return [
        {
            question: "Tell me about a time you handled a disagreement with a teammate.",
            intention: "To assess communication, maturity, and collaboration.",
            answer: "Use STAR format and show how you listened, aligned on facts, and moved toward a constructive outcome.",
        },
        {
            question: "Describe a time you had to learn something quickly to deliver a project.",
            intention: "To evaluate adaptability and self-learning ability.",
            answer: "Explain the context, how you learned fast, how you applied it, and the outcome you achieved.",
        },
        {
            question: "Tell me about a time you received difficult feedback and how you responded.",
            intention: "To assess coachability, maturity, and growth mindset.",
            answer: "Share the feedback clearly, explain your response without defensiveness, and show the improvement that followed.",
        },
        {
            question: "Describe a situation where priorities changed suddenly during a project.",
            intention: "To evaluate adaptability and communication under change.",
            answer: "Use STAR format and show how you re-prioritized, aligned stakeholders, and delivered the most important outcome.",
        },
        {
            question: "Tell me about a time you had to explain a complex idea to a non-technical person.",
            intention: "To assess communication clarity and audience awareness.",
            answer: "Focus on how you simplified the message, checked understanding, and helped the other person make a decision.",
        },
        {
            question: "Describe a time you had multiple deadlines competing for your attention.",
            intention: "To assess time management and judgment.",
            answer: "Explain how you prioritized, communicated tradeoffs, and kept delivery quality under control.",
        },
        {
            question: "Tell me about a time you took ownership of a problem that was not explicitly assigned to you.",
            intention: "To assess initiative and accountability.",
            answer: "Show the problem, why you stepped in, what actions you took, and the impact on the team or project.",
        },
        {
            question: "Describe a challenging collaboration with a teammate or stakeholder and how you made it productive.",
            intention: "To assess collaboration, empathy, and conflict resolution.",
            answer: "Explain the friction, how you found alignment, and what improved because of your approach.",
        },
        {
            question: "Tell me about a time you had to stay calm and effective under pressure.",
            intention: "To assess resilience, composure, and execution in stressful situations.",
            answer: "Describe the pressure clearly, the actions you took, and how you kept the team or project moving productively.",
        },
    ]
}

function ensureMinimumItems(items, fallbackItems, minimumCount) {
    const normalizedItems = [...items]

    for (const item of fallbackItems) {
        if (normalizedItems.length >= minimumCount) {
            break
        }

        normalizedItems.push(item)
    }

    return normalizedItems
}

function determineQuestionTargets({ candidateKeywords = [], jobKeywords = [] }) {
    const candidateKeywordSet = new Set(
        candidateKeywords.map((keyword) => String(keyword || "").toLowerCase()).filter(Boolean)
    )
    const missingKeywordCount = jobKeywords.filter(
        (keyword) => keyword && !candidateKeywordSet.has(String(keyword).toLowerCase())
    ).length

    return {
        technicalQuestionTarget: Math.max(7, Math.min(12, 7 + Math.ceil(missingKeywordCount / 2))),
        behavioralQuestionTarget: Math.max(5, Math.min(8, 5 + Math.ceil(missingKeywordCount / 4))),
    }
}

function buildInterviewReportJsonSchema({ technicalQuestionTarget, behavioralQuestionTarget, roadmapDays }) {
    return {
        type: "object",
        additionalProperties: false,
        properties: {
            title: {
                type: "string"
            },
            matchScore: {
                type: "number",
                minimum: 0,
                maximum: 100
            },
            technicalQuestions: {
                type: "array",
                minItems: technicalQuestionTarget,
                items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        question: { type: "string" },
                        intention: { type: "string" },
                        answer: { type: "string" }
                    },
                    required: ["question", "intention", "answer"]
                }
            },
            behavioralQuestions: {
                type: "array",
                minItems: behavioralQuestionTarget,
                items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        question: { type: "string" },
                        intention: { type: "string" },
                        answer: { type: "string" }
                    },
                    required: ["question", "intention", "answer"]
                }
            },
            skillGaps: {
                type: "array",
                minItems: 1,
                items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        skill: { type: "string" },
                        severity: {
                            type: "string",
                            enum: ["low", "medium", "high"]
                        }
                    },
                    required: ["skill", "severity"]
                }
            },
            preparationPlan: {
                type: "array",
                minItems: roadmapDays,
                maxItems: roadmapDays,
                items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        day: {
                            type: "number",
                            minimum: 1,
                            maximum: roadmapDays
                        },
                        focus: { type: "string" },
                        tasks: {
                            type: "array",
                            minItems: 1,
                            items: { type: "string" }
                        }
                    },
                    required: ["day", "focus", "tasks"]
                }
            }
        },
        required: [
            "title",
            "matchScore",
            "technicalQuestions",
            "behavioralQuestions",
            "skillGaps",
            "preparationPlan"
        ]
    }
}

function normalizeInterviewReport(report, {
    personalizationBrief,
    jobDescription,
    roleTitle,
    roadmapDays,
    technicalQuestionTarget,
    behavioralQuestionTarget
}) {
    const flattenedReport =
        report?.technicalQuestions &&
        !Array.isArray(report.technicalQuestions) &&
        typeof report.technicalQuestions === "object" &&
        (
            report.technicalQuestions.technicalQuestions ||
            report.technicalQuestions.behavioralQuestions ||
            report.technicalQuestions.skillGaps ||
            report.technicalQuestions.preparationPlan ||
            report.technicalQuestions.prepratonPlan
        )
            ? {
                title: report.title,
                matchScore: report.matchScore,
                technicalQuestions: report.technicalQuestions.technicalQuestions,
                behavioralQuestions: report.technicalQuestions.behavioralQuestions,
                skillGaps: report.technicalQuestions.skillGaps,
                preparationPlan:
                    report.technicalQuestions.preparationPlan ||
                    report.technicalQuestions.prepratonPlan,
            }
            : report

    const normalizedReport = {
        title: String(flattenedReport?.title || "Personalized Interview Preparation Plan").trim(),
        matchScore: Number(flattenedReport?.matchScore) || 0,
        technicalQuestions: normalizeQuestionItems(flattenedReport?.technicalQuestions),
        behavioralQuestions: normalizeQuestionItems(flattenedReport?.behavioralQuestions),
        skillGaps: normalizeSkillGapItems(flattenedReport?.skillGaps),
        preparationPlan: normalizePreparationPlanItems(flattenedReport?.preparationPlan, roadmapDays),
    }

    normalizedReport.matchScore = Math.max(0, Math.min(100, normalizedReport.matchScore || 65))
    normalizedReport.technicalQuestions = ensureMinimumItems(
        normalizedReport.technicalQuestions,
        buildFallbackQuestionSet("technical", jobDescription),
        technicalQuestionTarget
    )
    normalizedReport.behavioralQuestions = ensureMinimumItems(
        normalizedReport.behavioralQuestions,
        buildFallbackQuestionSet("behavioral", jobDescription),
        behavioralQuestionTarget
    )
    const dynamicSkillGaps = buildDynamicSkillGaps({
        candidateKeywords: personalizationBrief?.candidateKeywords || [],
        jobKeywords: personalizationBrief?.jobKeywords || [],
    })

    normalizedReport.skillGaps = ensureMinimumItems(normalizedReport.skillGaps, dynamicSkillGaps, 3)

    if (isLowSignalSkillGaps(normalizedReport.skillGaps)) {
        normalizedReport.skillGaps = dynamicSkillGaps
    }

    if (
        normalizedReport.preparationPlan.length !== Math.max(1, Math.floor(Number(roadmapDays) || 7)) ||
        isLowSignalPreparationPlan(normalizedReport.preparationPlan)
    ) {
        normalizedReport.preparationPlan = buildDynamicPreparationPlan({
            roadmapDays,
            roleTitle,
            skillGaps: normalizedReport.skillGaps,
            candidateKeywords: personalizationBrief?.candidateKeywords || [],
            jobKeywords: personalizationBrief?.jobKeywords || [],
        })
    }

    return normalizedReport
}

function sanitizeInlineText(value, maxLength = 4000) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength)
}

function extractKeywords(text, limit = 12) {
    const stopWords = new Set([
        "the", "and", "for", "with", "that", "this", "from", "into", "your",
        "have", "will", "their", "they", "about", "there", "them", "using",
        "used", "you", "our", "are", "job", "role", "team", "candidate",
        "experience", "work", "skills", "skill", "years", "year", "required",
        "preferred", "ability", "strong", "knowledge"
    ])

    const matches = sanitizeInlineText(text, 6000)
        .match(/[A-Za-z][A-Za-z0-9.+#/-]{1,}/g) || []

    const ranked = new Map()

    for (const rawMatch of matches) {
        const original = rawMatch.trim()
        const normalized = original.toLowerCase()

        if (normalized.length < 3 || stopWords.has(normalized)) {
            continue
        }

        ranked.set(original, (ranked.get(original) || 0) + 1)
    }

    return [...ranked.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, limit)
        .map(([keyword]) => keyword)
}

function buildPersonalizationBrief({ resume, selfDescription, jobDescription }) {
    const candidateKeywords = extractKeywords(`${resume} ${selfDescription}`, 10)
    const jobKeywords = extractKeywords(jobDescription, 12)

    return {
        candidateSnapshot: sanitizeInlineText(resume, 3500),
        selfSnapshot: sanitizeInlineText(selfDescription || "Not provided by the candidate.", 1800),
        jobSnapshot: sanitizeInlineText(jobDescription, 3500),
        candidateKeywords,
        jobKeywords,
    }
}

function parseJsonResponse(rawText) {
    const trimmedText = String(rawText || "").trim()

    if (!trimmedText) {
        return {}
    }

    try {
        return JSON.parse(trimmedText)
    } catch (error) {
        const fencedMatch = trimmedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)

        if (fencedMatch?.[1]) {
            return JSON.parse(fencedMatch[1])
        }

        const jsonMatch = trimmedText.match(/\{[\s\S]*\}/)

        if (jsonMatch?.[0]) {
            return JSON.parse(jsonMatch[0])
        }

        throw new Error("Groq returned unreadable JSON.")
    }
}

function extractHtmlResponse(rawText) {
    const trimmedText = String(rawText || "").trim()

    if (!trimmedText) {
        throw new Error("Groq returned empty HTML.")
    }

    const fencedMatch = trimmedText.match(/```(?:html)?\s*([\s\S]*?)\s*```/i)

    if (fencedMatch?.[1]) {
        return fencedMatch[1].trim()
    }

    return trimmedText
}

async function requestGroqInterviewReport({
    apiKey,
    model,
    prompt,
    strict = true,
    useJsonObjectMode = false,
    systemPrompt = "You are an expert interview coach and career strategist. Return only schema-compliant JSON.",
    jsonSchemaName = "interview_report",
    jsonSchema,
    useTextMode = false
}) {
    const requestBody = {
        model,
        temperature: 0.9,
        messages: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: prompt
            }
        ]
    }

    if (useTextMode) {
        // Intentionally omit response_format so Groq can return plain text/HTML.
    } else if (useJsonObjectMode) {
        requestBody.response_format = {
            type: "json_object"
        }
    } else {
        requestBody.response_format = {
            type: "json_schema",
            json_schema: {
                name: jsonSchemaName,
                strict,
                schema: jsonSchema
            }
        }
    }

    const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
    })

    const responseBody = await response.json().catch(() => ({}))

    if (!response.ok) {
        const apiMessage =
            responseBody?.error?.message ||
            responseBody?.message ||
            `Groq API request failed with status ${response.status}.`
        const error = new Error(apiMessage)
        error.status = response.status
        error.payload = responseBody
        throw error
    }

    return responseBody
}

async function generateInterviewReport({ resume, selfDescription, jobDescription, roadmapDays = 7 }) {
    if (!resume?.trim() || !jobDescription?.trim()) {
        throw new Error(
            "resume and jobDescription are required to generate an interview report."
        )
    }

    const safeRoadmapDays = Math.max(1, Math.floor(Number(roadmapDays) || 7))
    const requestFingerprint = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const personalizationBrief = buildPersonalizationBrief({
        resume,
        selfDescription,
        jobDescription
    })
    const roleTitle = inferRoleTitle(jobDescription)
    const questionTargets = determineQuestionTargets(personalizationBrief)
    const jsonSchema = buildInterviewReportJsonSchema({
        technicalQuestionTarget: questionTargets.technicalQuestionTarget,
        behavioralQuestionTarget: questionTargets.behavioralQuestionTarget,
        roadmapDays: safeRoadmapDays,
    })
    
    const prompt = `Generate a deeply personalized interview report for a single candidate.

    Return valid JSON only with this exact top-level structure:
    {
      "title": string,
      "matchScore": number,
      "technicalQuestions": [{ "question": string, "intention": string, "answer": string }],
      "behavioralQuestions": [{ "question": string, "intention": string, "answer": string }],
      "skillGaps": [{ "skill": string, "severity": "low" | "medium" | "high" }],
      "preparationPlan": [{ "day": number, "focus": string, "tasks": [string] }]
    }

    Generate multiple items for each array and keep the answers practical, specific, and interview-focused.
    The title should be short, specific to the target role, and different when the candidate/job changes.
    The number of technical questions must adapt to the resume, job description, and likely skill gaps, with at least ${questionTargets.technicalQuestionTarget} technical questions.
    The number of behavioral questions must adapt to the candidate profile and role expectations, with at least ${questionTargets.behavioralQuestionTarget} behavioral questions.
    The preparationPlan must include exactly ${safeRoadmapDays} separate day entries in order from day 1 through day ${safeRoadmapDays}.
    Do not skip any day and do not repeat the same day number.
    Each roadmap day must have a different focus and different tasks that evolve across the plan.
    skillGaps must come from the actual mismatch between the candidate profile and the job description. Do not use generic placeholder gaps.
    Do not write generic questions that could fit any candidate.
    Every question and answer must clearly reflect the candidate background and the job requirements below.
    Use the candidate's likely projects, tools, domain, and experience level when forming the report.
    If important details are missing, infer cautiously from the supplied resume/self-description and job description instead of inventing unrelated content.
    Make the behavioral questions different from the technical questions.
    Match score must be justified by the actual overlap between candidate and job requirements.
    Spread the roadmap naturally across the requested duration so shorter plans feel concentrated and longer plans feel more progressive.

    Request fingerprint: ${requestFingerprint}
    Generated on: ${new Date().toISOString()}
    Requested roadmap days: ${safeRoadmapDays}

    Candidate keywords: ${personalizationBrief.candidateKeywords.join(", ") || "None extracted"}
    Job keywords: ${personalizationBrief.jobKeywords.join(", ") || "None extracted"}

    Resume: ${personalizationBrief.candidateSnapshot}
    Self Description: ${personalizationBrief.selfSnapshot}
    Job Description: ${personalizationBrief.jobSnapshot}`

    const ai = getAiClient()
    
    try {
        let response

        try {
            response = await requestGroqInterviewReport({
                apiKey: ai.apiKey,
                model: ai.model,
                prompt,
                strict: true,
                jsonSchema
            })
        } catch (strictError) {
            const strictMessage = String(strictError?.message || strictError || "")
            const strictStatus = Number(strictError?.status || 0)

            if (strictStatus !== 400) {
                throw strictError
            }

            console.info("Groq strict structured output needed a retry; switching to best-effort schema mode:", strictMessage)

            try {
                response = await requestGroqInterviewReport({
                    apiKey: ai.apiKey,
                    model: ai.model,
                    prompt,
                    strict: false,
                    jsonSchema
                })
            } catch (bestEffortError) {
                const bestEffortStatus = Number(bestEffortError?.status || 0)

                if (bestEffortStatus !== 400) {
                    throw bestEffortError
                }

                console.info("Groq schema mode needed another retry; switching to JSON object mode.")
                response = await requestGroqInterviewReport({
                    apiKey: ai.apiKey,
                    model: ai.model,
                    prompt,
                    useJsonObjectMode: true
                })
            }
        }

        const rawContent = response?.choices?.[0]?.message?.content

        if (!rawContent) {
            throw new Error("AI service returned an empty response. Please try again.")
        }

        const parsed = parseJsonResponse(rawContent)
        const normalized = normalizeInterviewReport(parsed, {
            personalizationBrief,
            jobDescription,
            roleTitle,
            roadmapDays: safeRoadmapDays,
            technicalQuestionTarget: questionTargets.technicalQuestionTarget,
            behavioralQuestionTarget: questionTargets.behavioralQuestionTarget,
        })
        normalized.source = "ai"
        normalized.title = String(parsed?.title || normalized.title || "Personalized Interview Preparation Plan").trim()
        console.info("AI Service: returned live Groq report")
        return normalized
    } catch (error) {
        console.error("AI Service Error:", error)
        const message = String(error?.message || error?.toString() || "")
        const status = Number(error?.status || 0)

        if (
            status === 429 ||
            message.includes("429") ||
            message.toLowerCase().includes("quota") ||
            message.toLowerCase().includes("rate limit")
        ) {
            throw new Error("Groq API rate limit or quota reached. A live report could not be generated right now.")
        }

        if (
            status === 401 ||
            status === 403 ||
            message.includes("401") ||
            message.includes("403") ||
            message.includes("UNAUTHENTICATED") ||
            message.toLowerCase().includes("authentication") ||
            message.toLowerCase().includes("api key")
        ) {
            throw new Error("API authentication failed. Please check your GROQ_API_KEY is valid.")
        }

        if (
            status === 400 ||
            message.includes("400") ||
            message.includes("INVALID_ARGUMENT") ||
            message.toLowerCase().includes("invalid")
        ) {
            throw new Error("Invalid request to AI service. Please try with different input.")
        }

        throw error
    }
}


async function genratePdfFromHtml(htmlContent) {
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
    const launchAttempts = [
        {
            headless: "new",
            protocolTimeout: 120000,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--no-zygote",
            ],
        },
        {
            headless: true,
            protocolTimeout: 120000,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
            ],
        },
    ].map((options) => (
        executablePath ? { ...options, executablePath } : options
    ))

    let lastError

    for (const launchOptions of launchAttempts) {
        let browser

        try {
            browser = await puppeteer.launch(launchOptions)
            const page = await browser.newPage()
            page.setDefaultNavigationTimeout(30000)
            await page.setViewport({ width: 1280, height: 1810, deviceScaleFactor: 1 })
            await page.setContent(htmlContent, { waitUntil: "domcontentloaded" })
            await page.emulateMediaType("screen")

            const pdfBuffer = await page.pdf({
                format: "A4",
                printBackground: true,
                preferCSSPageSize: true,
                margin: {
                    top: "20mm",
                    right: "15mm",
                    bottom: "20mm",
                    left: "15mm"
                }
            })

            await browser.close()
            return pdfBuffer
        } catch (error) {
            lastError = error
            console.error("PDF generation attempt failed:", error.message)

            if (browser) {
                await browser.close().catch(() => {})
            }
        }
    }

    throw lastError || new Error("Failed to generate PDF.")
}


async function generateResumePdf({ resume, selfDescription, jobDescription }) {
    const fallbackHtml = buildFallbackResumeHtml({ resume, selfDescription, jobDescription })
    const prompt = `
You are an expert resume writer and ATS optimization system.

Your task is to MODIFY and IMPROVE an existing resume while STRICTLY preserving its original design, layout, structure, and formatting.

⚠️ VERY IMPORTANT RULES:
- DO NOT change the layout, structure, or section order
- DO NOT redesign the resume
- DO NOT add new sections unless absolutely necessary
- KEEP the same formatting style (font style, spacing, alignment)
- KEEP it strictly ONE PAGE
- ONLY improve and tailor the content based on the Job Description
- Maintain a professional, ATS-friendly tone
- Keep bullet points concise, impactful, and metric-driven

---

🎯 INPUT DATA:

EXISTING RESUME (THIS IS THE BASE TEMPLATE — FOLLOW IT STRICTLY):
${resume}

SELF DESCRIPTION:
${selfDescription || "Not provided"}

TARGET JOB DESCRIPTION:
${jobDescription}

---

🎯 YOUR TASK:

1. Carefully analyze the job description
2. Update the resume content to maximize job relevance
3. Improve:
   - Summary (make it role-specific)
   - Skills (prioritize matching skills from JD)
   - Experience bullet points (add impact + metrics + keywords)
   - Projects (align with JD technologies)
4. Keep tone strong, confident, and results-driven

---

🎨 OUTPUT REQUIREMENTS:

- Return ONLY clean HTML (no markdown, no explanation)
- Include <style> block optimized for A4 PDF (Puppeteer friendly)
- Maintain EXACT SAME STRUCTURE as input resume
- Use clean typography similar to original resume
- Keep it ONE PAGE (very important)
- Use proper spacing and alignment for professional look

---

💡 CONTENT OPTIMIZATION RULES:

- Use action verbs: Developed, Engineered, Optimized, Implemented
- Add metrics wherever possible (%, performance, scale)
- Match keywords from job description (VERY IMPORTANT for ATS)
- Keep bullets short (1–2 lines max)
- Avoid unnecessary fluff

---

🚫 DO NOT:
- Change layout
- Add fancy UI/design
- Make it multi-page
- Return JSON or explanations

---

✅ FINAL OUTPUT:
A polished, ATS-optimized, one-page HTML resume that looks visually identical to the original but content is improved for the given job description.
`
    let htmlContent = fallbackHtml

    try {
        const ai = getAiClient()
        const response = await requestGroqInterviewReport({
            apiKey: ai.apiKey,
            model: ai.model,
            prompt,
            useTextMode: true,
            systemPrompt: "You generate clean, printable resume HTML. Return only HTML with inline CSS."
        })

        const rawContent = response?.choices?.[0]?.message?.content

        if (!rawContent) {
            throw new Error("AI service returned an empty response for resume PDF generation.")
        }

        htmlContent = extractHtmlResponse(rawContent)
    } catch (error) {
        console.warn("Resume HTML generation fell back to the local template:", error.message)
    }

    try {
        return await genratePdfFromHtml(htmlContent)
    } catch (error) {
        if (htmlContent !== fallbackHtml) {
            console.warn("Primary resume PDF render failed, retrying with the fallback template:", error.message)
            return genratePdfFromHtml(fallbackHtml)
        }

        throw error
    }
}

function buildFallbackResumeHtml({ resume, selfDescription, jobDescription }) {
    const roleTitle = inferRoleTitle(jobDescription)
    const summary = selfDescription?.trim() || "Candidate profile generated from the uploaded resume."
    const resumeBlocks = String(resume || "")
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .slice(0, 8)

    const resumeSections = resumeBlocks.length > 0
        ? resumeBlocks.map((block) => `<section class="resume-section"><p>${escapeHtml(block).replace(/\n/g, "<br/>")}</p></section>`).join("")
        : `<section class="resume-section"><p>${escapeHtml(summary)}</p></section>`

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(roleTitle)} Resume</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 32px;
            font-family: Arial, sans-serif;
            color: #111827;
            background: #ffffff;
            line-height: 1.45;
        }
        .resume-shell {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
        }
        .resume-header {
            border-bottom: 2px solid #1f2937;
            padding-bottom: 16px;
            margin-bottom: 20px;
        }
        .resume-title {
            margin: 0 0 8px;
            font-size: 28px;
            font-weight: 700;
        }
        .resume-subtitle {
            margin: 0;
            font-size: 15px;
            color: #4b5563;
        }
        .resume-section {
            margin-bottom: 16px;
        }
        .resume-section h2 {
            margin: 0 0 8px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #374151;
        }
        .resume-section p {
            margin: 0;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="resume-shell">
        <header class="resume-header">
            <h1 class="resume-title">${escapeHtml(roleTitle)} Resume</h1>
            <p class="resume-subtitle">${escapeHtml(summary)}</p>
        </header>
        <section class="resume-section">
            <h2>Target Job</h2>
            <p>${escapeHtml(jobDescription || "No job description provided.").replace(/\n/g, "<br/>")}</p>
        </section>
        ${resumeSections}
    </div>
</body>
</html>`
}

module.exports = {generateInterviewReport, generateResumePdf}
