const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { Pool } = require("pg");
const helmet = require("helmet");
const waitPort = require("wait-port");

const app = express();

// Warte auf die Datenbank und starte den Server
async function startServer() {
  try {
    // Warte, bis Port 5432 der Datenbank erreichbar ist
    await waitPort({ host: "db", port: 5432, timeout: 30000 });
    console.log("Datenbank ist bereit!");

    // Datenbankverbindung herstellen
    const pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        "postgresql://postgres:postgres@db:5432/simpleboard",
    });

    // Teste die Verbindung
    await pool.query("SELECT 1");
    console.log("Datenbankverbindung erfolgreich!");

    // Erstelle die Tabelle "messages", falls sie nicht existiert
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        nickname VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Datenbanktabelle 'messages' ist bereit!");

    // Middleware und Routen hier ...
    app.use(cors({ origin: "http://localhost", credentials: true }));
    app.use(helmet());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(
      session({
        secret: process.env.SESSION_SECRET || "mysecret",
        resave: false,
        saveUninitialized: true,
      }),
    );

    // API-Routen hier ...
    app.post("/api/set-nickname", (req, res) => {
      const { nickname } = req.body;
      if (
        !nickname ||
        typeof nickname !== "string" ||
        nickname.trim().length === 0
      ) {
        return res.status(400).json({ error: "Nickname erforderlich" });
      }
      req.session.nickname = nickname.trim();
      res.json({ success: true });
    });

    app.post("/api/send-message", async (req, res) => {
      const { message } = req.body;
      const nickname = req.session.nickname;
      if (!nickname) {
        return res
          .status(401)
          .json({ error: "Bitte setze zuerst einen Nickname" });
      }
      if (
        !message ||
        typeof message !== "string" ||
        message.trim().length === 0
      ) {
        return res.status(400).json({ error: "Nachricht erforderlich" });
      }
      try {
        await pool.query(
          "INSERT INTO messages (nickname, message) VALUES ($1, $2)",
          [nickname.substring(0, 20), message.substring(0, 280)],
        );
        res.json({ success: true });
      } catch (err) {
        console.error("Fehler beim Speichern der Nachricht:", err);
        res.status(500).json({ error: "Fehler beim Speichern der Nachricht" });
      }
    });

    app.get("/api/get-messages", async (req, res) => {
      try {
        const result = await pool.query(
          "SELECT id, nickname, message, timestamp FROM messages ORDER BY timestamp DESC LIMIT 100",
        );
        res.json(result.rows);
      } catch (err) {
        console.error("Fehler beim Abrufen der Nachrichten:", err);
        res.status(500).json({ error: "Fehler beim Abrufen der Nachrichten" });
      }
    });

    // Server starten
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server läuft auf Port ${PORT}`);
    });
  } catch (err) {
    console.error("Fehler beim Starten des Servers:", err);
    process.exit(1); // Beende den Container, falls die Datenbank nicht erreichbar ist
  }
}

startServer(); // Starte den Server
