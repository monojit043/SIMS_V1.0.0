// Loads .env by default, or a different file via `node server.js --env-file=.env.office`
// (see package.json's start:office/dev:office scripts) — lets us switch to the real office
// databases for testing without touching the local-dev .env at all.
const envFileArg = process.argv.find((arg) => arg.startsWith("--env-file="));
require("dotenv").config({ path: envFileArg ? envFileArg.split("=")[1] : ".env" });

const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const { connectDB } = require("./config/db");
const { connectExternalDbs } = require("./config/externalDb");
const apiRoutes = require("./routes");
const { notFound, errorHandler } = require("./middleware/error.middleware");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// Serve uploaded report/P&ID files directly (e.g. for previewing images in the frontend).
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api", apiRoutes);

// Serve the static frontend (login page, job form, etc.) so the whole app runs from one server.
const FRONTEND_DIR = path.join(__dirname, "..", "FRONTEND");
app.use(express.static(FRONTEND_DIR, { index: ["INDEX.HTML", "index.html"] }));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

function start() {
  app.listen(PORT, () => {
    console.log(`SIMS backend listening on http://localhost:${PORT}`);
  });

  connectDB()
    .then(() => console.log("PostgreSQL connection established."))
    .catch((error) => {
      console.error(
        `PostgreSQL connection failed (${error.message}). The server is still running, but any ` +
          "endpoint that touches the database will fail until PostgreSQL is reachable. " +
          "Check the PG* / DATABASE_URL settings in your .env file and that PostgreSQL is running."
      );
    });

  connectExternalDbs().catch((error) => {
    console.error(
      `Could not reach MASTER_EMPLOYEE_DB / PIMS_SQL (${error.message}). Login and the Job/Unit ` +
        "dropdowns will fail until those databases are reachable."
    );
  });
}

start();

module.exports = app;
