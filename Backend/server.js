const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "src/.env") });

const app = require("./src/app");
const connectToDB = require("./config/database");
const { invokeGeminiAi } = require("./src/services/ai.service")


const PORT = process.env.PORT || 3000;



async function startServer() {
  await connectToDB();

  try {
    await invokeGeminiAi()
  } catch (error) {
    console.error("Gemini startup check failed:", error.message)
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();
