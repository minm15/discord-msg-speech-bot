import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  StreamType,
  VoiceConnectionStatus,
  type DiscordGatewayAdapterCreator
} from "@discordjs/voice";
import type { VoiceBasedChannel } from "discord.js";
import type { RuntimeState } from "../state/runtime-state.js";
import { synthesizeWithRetry } from "../tts/edge-tts.js";

export class VoiceSession {
  private readonly audioPlayer = createAudioPlayer();
  private loggedConnectionIds = new Set<string>();

  constructor(private readonly state: RuntimeState) {}

  async join(channel: VoiceBasedChannel) {
    console.log(`[voice] join requested: #${channel.name} (${channel.id})`);

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
      selfDeaf: false
    });

    this.attachDebugLogs(channel.id);
    connection.subscribe(this.audioPlayer);
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

    this.state.voiceChannelId = channel.id;
    this.state.voiceChannelName = channel.name;
    console.log(`[voice] ready: #${channel.name} (${channel.id})`);
  }

  leave() {
    this.audioPlayer.stop(true);
    const connection = this.state.voiceChannelId
      ? getVoiceConnection(this.state.config.guildId)
      : null;

    connection?.destroy();
    this.state.voiceChannelId = null;
    this.state.voiceChannelName = null;
    this.state.isPlaying = false;
  }

  isConnected() {
    return Boolean(this.state.voiceChannelId && getVoiceConnection(this.state.config.guildId));
  }

  skip() {
    this.audioPlayer.stop(true);
  }

  async playText(text: string) {
    if (!this.isConnected()) {
      console.log("[playback] skipped: bot is not connected to voice");
      return;
    }

    let filePath: string | null = null;

    try {
      console.log(`[tts] start: ${preview(text)}`);
      const result = await synthesizeWithRetry(text, this.state.config);
      filePath = result.filePath;
      const stat = await fs.stat(filePath);
      console.log(`[tts] done: ${filePath} (${stat.size} bytes)`);

      const resource = createAudioResource(createReadStream(filePath), {
        inputType: StreamType.Arbitrary
      });

      this.state.isPlaying = true;
      console.log("[playback] start");
      this.audioPlayer.play(resource);

      await new Promise<void>((resolve, reject) => {
        const onIdle = () => {
          cleanup();
          resolve();
        };
        const onError = (error: Error) => {
          cleanup();
          reject(error);
        };
        const cleanup = () => {
          this.audioPlayer.off(AudioPlayerStatus.Idle, onIdle);
          this.audioPlayer.off("error", onError);
        };

        this.audioPlayer.once(AudioPlayerStatus.Idle, onIdle);
        this.audioPlayer.once("error", onError);
      });
      console.log("[playback] finished");
    } catch (error) {
      console.error("Failed to play TTS message:", error);
    } finally {
      this.state.isPlaying = false;

      if (filePath) {
        await fs.unlink(filePath).catch(() => undefined);
        console.log(`[tts] cleaned: ${filePath}`);
      }
    }
  }

  private attachDebugLogs(channelId: string) {
    if (this.loggedConnectionIds.has(channelId)) {
      return;
    }

    this.loggedConnectionIds.add(channelId);
    const connection = getVoiceConnection(this.state.config.guildId);

    connection?.on("stateChange", (oldState, newState) => {
      console.log(`[voice] ${oldState.status} -> ${newState.status}`);
    });

    connection?.on("error", (error) => {
      console.error("[voice] connection error:", error);
    });
  }
}

function preview(text: string) {
  return text.length > 40 ? `${text.slice(0, 40)}...` : text;
}
