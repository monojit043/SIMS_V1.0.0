require("dotenv").config();

const { sequelize, connectDB } = require("../config/db");
const { employeeSequelize, pimsSequelize, connectExternalDbs } = require("../config/externalDb");
const EmployeeDetails = require("../models/EmployeeDetails");

// Login now comes from MASTER_EMPLOYEE_DB.employee_details — there's no local account to seed
// anymore. This just verifies all three databases are reachable and prints a real employee_id
// you can log in with (passwords in that table are employee_id + "EIL", e.g. A365 -> A365EIL).
async function seed() {
  await connectDB();
  await connectExternalDbs();

  const sample = await EmployeeDetails.findOne({ order: [["employee_id", "ASC"]] });
  if (sample) {
    console.log(`Sample login: username "${sample.employee_id}" (see employee_details.password for the password).`);
  } else {
    console.log("employee_details has no rows — nothing to log in with yet.");
  }

  await sequelize.close();
  await employeeSequelize.close();
  await pimsSequelize.close();
}

seed().catch((error) => {
  console.error("Seed check failed:", error);
  process.exit(1);
});
