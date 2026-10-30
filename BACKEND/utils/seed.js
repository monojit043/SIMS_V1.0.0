require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const { sequelize, connectDB } = require("../config/db");
const { epulsePool, ipmcsPool, connectExternalDbs } = require("../config/externalDb");

// Every model, so that connectDB()'s sync creates / updates all of SIMS' tables.
for (const f of fs.readdirSync(path.join(__dirname, "..", "models"))) require(`../models/${f}`);

// Nothing to seed: logins come from PC-2 (through ePULSE) and access from the IPMCS team.
// This checks that SIMS' own DB, ePULSE and IPMCS are reachable (and creates SIMS' tables).
async function check() {
  await connectDB();
  await connectExternalDbs();
  await sequelize.close();
  await Promise.all([epulsePool.end(), ipmcsPool.end()]);
  console.log("All databases reachable.");
}

check().catch((error) => {
  console.error("Database check failed:", error.message);
  process.exit(1);
});
