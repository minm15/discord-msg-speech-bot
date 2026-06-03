import "dotenv/config";
import { Events } from "discord.js";
import { loadConfig, loadEnv } from "./config.js";
import { AudioQueue } from "./queue/audio-queue.js";
import { createRuntimeState } from "./state/runtime-state.js";
import { createDiscordClient } from "./discord/client.js";
import { registerGuildCommands, registerInteractionHandlers } from "./discord/commands.js";
import { registerMessageListener } from "./discord/message-listener.js";
import { VoiceSession } from "./discord/voice-session.js";

async function main() {
  const env = loadEnv();
  const config = loadConfig();
  const state = createRuntimeState(config);
  const client = createDiscordClient();
  const voiceSession = new VoiceSession(state);
  const queue = new AudioQueue(voiceSession);

  registerInteractionHandlers(client, state, queue, voiceSession);
  registerMessageListener(client, state, queue);

  client.once(Events.ClientReady, async (readyClient) => {
    await registerGuildCommands(env.clientId, env.token, config.guildId);
    console.log(`Logged in as ${readyClient.user.tag}`);
  });

  await client.login(env.token);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
