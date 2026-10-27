const { Sequelize } = require("sequelize");

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: "postgres",
      logging: false,
    })
  : new Sequelize(
      process.env.PGDATABASE || "sims",
      process.env.PGUSER || "postgres",
      process.env.PGPASSWORD || "postgres",
      {
        host: process.env.PGHOST || "127.0.0.1",
        port: process.env.PGPORT || 5432,
        dialect: "postgres",
        logging: false,
      }
    );

async function connectDB() {
  await sequelize.authenticate();
  console.log(`PostgreSQL connected: ${sequelize.config.host}:${sequelize.config.port}/${sequelize.config.database}`);

  // Creates tables that don't exist yet and adds missing columns; does not drop data.
  // For production use, replace with proper sequelize-cli migrations.
  await sequelize.sync({ alter: true });
}

module.exports = { sequelize, connectDB };
