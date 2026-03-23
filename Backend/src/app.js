const express = require("express");
const cookieParser = require("cookie-parser")
const cors = require("cors")

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())
app.use(cors({
    origin: "http://localhost:5175",
    credentials: true
}))




// require all the routes here
const authRouter = require("./routes/auth.routes")

// using all the routes here
app.use("/api/auth", authRouter)

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API starter is running",
  });
});


module.exports = app;
