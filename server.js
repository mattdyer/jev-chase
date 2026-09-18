import express from "express";
import { readFileSync } from "fs";
import yaml from "js-yaml";
import { TypeSafeClient, choice } from "@typesafe-ai/sdk";

const app = express();
const PORT = process.env.PORT || 3000;

const credentials = yaml.load(readFileSync("credentials.yaml", "utf-8"));
process.env.TYPESAFE_API_KEY = credentials.apikey;

app.use(express.json());
app.use(express.static("public"));

app.post("/api/enemy-move", async (req, res) => {
  const { player, enemy } = req.body;

  if (!player || !enemy) {
    return res.status(400).json({ error: "Missing player or enemy position." });
  }

  try {
    const client = new TypeSafeClient();

    const state = JSON.stringify({
      player: { x: player.x, y: player.y },
      enemy: { x: enemy.x, y: enemy.y },
    });

    const response = await client.systemOne({
      state: state,
      questions: {
        nextMove: choice("Which direction should the enemy move to catch the player?", {
          up: null,
          down: null,
          left: null,
          right: null,
        }),
      },
    });

    const result = response.answers.nextMove;

    res.json({
      move: result.choice,
      probabilities: result.probabilities,
      confidence: result.confidence,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("TypeSafe API error:", detail);
    const isAuthError =
      detail.includes("401") ||
      detail.includes("authentication") ||
      detail.includes("API key");
    const msg = isAuthError
      ? "Invalid API key. Check credentials.yaml."
      : "Failed to compute enemy move.";
    res.status(isAuthError ? 401 : 500).json({ error: msg });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
