const express = require("express");
const cookieParser = require("cookie-parser")
const cors = require("cors")

const app = express();

function getAllowedOrigins() {
    const configuredOrigins = (
        process.env.CORS_ORIGIN ||
        process.env.FRONTEND_URL ||
        ""
    )
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)

    const defaultOrigins = [
        "http://localhost:5173",
        "http://localhost:5175"
    ]

    return [...new Set([...defaultOrigins, ...configuredOrigins])]
}

if (process.env.NODE_ENV === "production" || process.env.TRUST_PROXY === "true") {
    app.set("trust proxy", 1)
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = getAllowedOrigins()

        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true)
        }

        return callback(new Error("Not allowed by CORS"))
    },
    credentials: true
}))




// require all the routes here
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")

// using all the routes here
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API starter is running",
  });
});


module.exports = app;
