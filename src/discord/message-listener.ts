import { type Client, Events } from "discord.js";
import type { AudioQueue } from "../queue/audio-queue.js";
import type { RuntimeState } from "../state/runtime-state.js";
import { cleanMessageText } from "../tts/text-cleaner.js";

export function registerMessageListener(client: Client, state: RuntimeState, queue: AudioQueue) {
  client.on(Events.MessageCreate, (message) => {
    if (message.author.bot) {
      return;
    }

    console.log(
      `[message] received guild=${message.guildId ?? "dm"} channel=${message.channelId} author=${message.author.username} (${message.author.id})`
    );

    if (message.guildId !== state.config.guildId) {
      console.log("[message] ignored: guild does not match config");
      return;
    }

    if (message.channelId !== state.config.textChannelId) {
      console.log("[message] ignored: channel does not match config");
      return;
    }

    if (!state.allowedUserIds.has(message.author.id)) {
      console.log("[message] ignored: author is not in read-list");
      return;
    }

    if (!state.voiceChannelId) {
      console.log("[message] ignored: bot is not connected to voice");
      return;
    }

    const text = cleanMessageText(message, state.config.maxMessageLength);
    if (!text) {
      console.log("[message] ignored: cleaned text is empty");
      return;
    }

    console.log(`[message] queued: ${text.length} chars`);
    queue.enqueue({
      text,
      authorName: message.member?.displayName ?? message.author.username
    });
  });
}
