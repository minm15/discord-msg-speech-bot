import fs from "node:fs";
import path from "node:path";

export type BotConfig = {
  guildId: string;
  textChannelId: string;
  adminUserIds: string[];
  allowedUserIds: string[];
  maxMessageLength: number;
  ttsRetryCount: number;
  ttsVoice: string;
  ttsLanguage: string;
};

const configPath = path.resolve(process.cwd(), "config.json");

export function loadConfig(): BotConfig {
  if (!fs.existsSync(configPath)) {
    throw new Error("Missing config.json. Copy config.example.json and fill in Discord IDs.");
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as Partial<BotConfig>;
  const requiredKeys: Array<keyof BotConfig> = [
    "guildId",
    "textChannelId",
    "adminUserIds",
    "allowedUserIds",
    "maxMessageLength",
    "ttsRetryCount",
    "ttsVoice",
    "ttsLanguage"
  ];

  for (const key of requiredKeys) {
    if (config[key] === undefined) {
      throw new Error(`config.json is missing "${key}".`);
    }
  }

  return config as BotConfig;
}

export function loadEnv() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;

  if (!token) {
    throw new Error("Missing DISCORD_TOKEN in .env.");
  }

  if (!clientId) {
    throw new Error("Missing CLIENT_ID in .env.");
  }

  return { token, clientId };
}
