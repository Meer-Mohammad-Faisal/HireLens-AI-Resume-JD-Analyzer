const mongoose = require("mongoose")


const technicalQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true, "Technical question is required"]
    },
    intention: {
        type: String,
        required: [true, "Intention behind the question is required"]
    }, 
    answer: {
        type: String,
        required: [true, "Answer to the technical question is required"]
    }

}, {
    _id: false
})


const behavioralQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true, "Behavioral question is required"]
    },
    intention: {
        type: String,
        required: [true, "Intention behind the question is required"]
    },
    answer: {
        type: String,
        required: [true, "Answer to the behavioral question is required"]
    }

}, {
    _id: false
})


const skillGapSchema = new mongoose.Schema({
    skill: {
        type: String,
        required: [true, "Skill gap is required"]
    },
    severity: {
        type: String,
        enum: ["low", "medium", "high"],
        required: [true, "Severity of the skill gap is required"]
    }

}, {
    _id: false
})



const preprationPlanSchema = new mongoose.Schema({
    day: {
        type: Number,
        required: [true, "Day for preparation plan is required"]
    },
    focus: {
        type: String,
        required: [true, "Focus for the day in preparation plan is required"]
    },
    tasks: [{
        type: String,
        required: [true, "Tasks for the day in preparation plan is required"]   

    }]

}, {
    _id: false
})



const interviewReportSchema = new mongoose.Schema({
    jobDescription: {
        type: String,
        required: [true, "Job description is required"]
    },

    resume: {
        type: String,
        default: ""
    },

    selfDescription: {
        type: String,
        default: ""
    },

    matchScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },

    technicalQuestions: [ technicalQuestionSchema ],
    behavioralQuestions: [ behavioralQuestionSchema ],
    skillGaps: [ skillGapSchema ],
    preparationPlan: [ preprationPlanSchema ],
    user: {
        type: String,
        default: "guest_user"
    },
    title: {
        type: String,
        default: "Interview Preparation Plan"
    }
    ,
    source: {
        type: String,
        enum: ["ai", "fallback", "unknown"],
        default: "unknown"
    }
}, {
    timestamps: true
})

const interviewReportModel = mongoose.model("interviewReports", interviewReportSchema)

module.exports = interviewReportModel