import type { BotConfig } from "../config.js";

export type RuntimeState = {
  config: BotConfig;
  allowedUserIds: Set<string>;
  voiceChannelId: string | null;
  voiceChannelName: string | null;
  isPlaying: boolean;
};

export function createRuntimeState(config: BotConfig): RuntimeState {
  return {
    config,
    allowedUserIds: new Set(config.allowedUserIds),
    voiceChannelId: null,
    voiceChannelName: null,
    isPlaying: false
  };
}
