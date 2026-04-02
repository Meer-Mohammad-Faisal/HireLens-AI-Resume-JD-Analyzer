require('dns').setDefaultResultOrder('ipv4first');

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "src/.env") });

const app = require("./src/app");
const connectToDB = require("./config/database");

connectToDB();

const port = Number(process.env.PORT) || 3000

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

