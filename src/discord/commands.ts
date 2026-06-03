import {
  ChannelType,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client
} from "discord.js";
import type { AudioQueue } from "../queue/audio-queue.js";
import type { RuntimeState } from "../state/runtime-state.js";
import type { VoiceSession } from "./voice-session.js";

export async function registerGuildCommands(clientId: string, token: string, guildId: string) {
  const commands = [
    new SlashCommandBuilder().setName("join").setDescription("讓 bot 加入你目前所在的語音頻道"),
    new SlashCommandBuilder().setName("leave").setDescription("讓 bot 離開語音頻道並清空佇列"),
    new SlashCommandBuilder().setName("status").setDescription("查看 bot 目前設定與狀態"),
    new SlashCommandBuilder().setName("skip").setDescription("跳過目前正在朗讀的訊息"),
    new SlashCommandBuilder().setName("clear").setDescription("清空等待播放的訊息"),
    new SlashCommandBuilder()
      .setName("add-user")
      .setDescription("加入要朗讀的使用者")
      .addUserOption((option) =>
        option.setName("user").setDescription("要加入朗讀名單的使用者").setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("remove-user")
      .setDescription("移除要朗讀的使用者")
      .addUserOption((option) =>
        option.setName("user").setDescription("要移出朗讀名單的使用者").setRequired(true)
      ),
    new SlashCommandBuilder().setName("list-users").setDescription("列出目前會被朗讀的使用者")
  ].map((command) => command.toJSON());

  const rest = new REST({ version: "10" }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
}

export function registerInteractionHandlers(
  client: Client,
  state: RuntimeState,
  queue: AudioQueue,
  voiceSession: VoiceSession
) {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    try {
      if (interaction.guildId !== state.config.guildId) {
        await interaction.reply({ content: "這個 bot 目前只設定給指定 server 使用。", ephemeral: true });
        return;
      }

      if (interaction.commandName === "join") {
        await handleJoin(interaction, voiceSession);
        return;
      }

      if (interaction.commandName === "leave") {
        queue.clear();
        voiceSession.leave();
        await interaction.reply("已離開語音頻道並清空佇列。");
        return;
      }

      if (interaction.commandName === "status") {
        await interaction.reply(await buildStatusMessage(interaction, state, queue));
        return;
      }

      if (interaction.commandName === "skip") {
        voiceSession.skip();
        await interaction.reply("已跳過目前朗讀。");
        return;
      }

      if (interaction.commandName === "clear") {
        queue.clear();
        await interaction.reply("已清空等待播放的訊息。");
        return;
      }

      if (interaction.commandName === "add-user") {
        if (!(await requireAdmin(interaction, state))) {
          return;
        }

        const user = interaction.options.getUser("user", true);
        state.allowedUserIds.add(user.id);
        await interaction.reply(`已加入朗讀名單：${user.displayName}`);
        return;
      }

      if (interaction.commandName === "remove-user") {
        if (!(await requireAdmin(interaction, state))) {
          return;
        }

        const user = interaction.options.getUser("user", true);
        state.allowedUserIds.delete(user.id);
        await interaction.reply(`已移出朗讀名單：${user.displayName}`);
        return;
      }

      if (interaction.commandName === "list-users") {
        await interaction.reply(await buildAllowedUsersMessage(interaction, state));
      }
    } catch (error) {
      console.error(`Failed to handle /${interaction.commandName}:`, error);
      await replyWithError(interaction, "指令執行失敗，請看終端機錯誤訊息。");
    }
  });
}

async function handleJoin(interaction: ChatInputCommandInteraction, voiceSession: VoiceSession) {
  const member = await interaction.guild?.members.fetch(interaction.user.id);
  const channel = member?.voice.channel;

  if (!channel) {
    await interaction.reply({ content: "你需要先加入一個語音頻道。", ephemeral: true });
    return;
  }

  await interaction.deferReply();

  try {
    await voiceSession.join(channel);
    await interaction.editReply(`已加入語音頻道：${channel.name}`);
  } catch (error) {
    console.error("Failed to join voice channel:", error);
    await interaction.editReply("已嘗試加入語音頻道，但語音連線沒有成功 ready。請確認 bot 有「連接」和「說話」權限後再試一次。");
  }
}

async function buildStatusMessage(
  interaction: ChatInputCommandInteraction,
  state: RuntimeState,
  queue: AudioQueue
) {
  const textChannel = await interaction.guild?.channels
    .fetch(state.config.textChannelId)
    .catch(() => null);

  const allowedUsers = await Promise.all(
    [...state.allowedUserIds].map(async (userId) => {
      const member = await interaction.guild?.members.fetch(userId).catch(() => null);
      return member?.displayName ?? userId;
    })
  );

  const adminUsers = await Promise.all(
    state.config.adminUserIds.map(async (userId) => {
      const member = await interaction.guild?.members.fetch(userId).catch(() => null);
      return member?.displayName ?? userId;
    })
  );

  const textChannelName =
    textChannel?.type === ChannelType.GuildText ? `#${textChannel.name}` : state.config.textChannelId;

  return [
    `連線狀態：${state.voiceChannelId ? "已連線" : "未連線"}`,
    `語音頻道：${state.voiceChannelName ?? "無"}`,
    `監聽文字頻道：${textChannelName}`,
    `管理員：${adminUsers.join(", ") || "無"}`,
    `監聽使用者：${allowedUsers.join(", ") || "無"}`,
    `佇列數量：${queue.size()}`,
    `正在播放：${state.isPlaying ? "是" : "否"}`,
    `最大朗讀字數：${state.config.maxMessageLength}`,
    `TTS：Edge TTS (${state.config.ttsVoice})`,
    `TTS 重試次數：${state.config.ttsRetryCount}`
  ].join("\n");
}

async function buildAllowedUsersMessage(interaction: ChatInputCommandInteraction, state: RuntimeState) {
  const allowedUsers = await Promise.all(
    [...state.allowedUserIds].map(async (userId) => {
      const member = await interaction.guild?.members.fetch(userId).catch(() => null);
      return member?.displayName ?? userId;
    })
  );

  return `目前朗讀名單：${allowedUsers.join(", ") || "無"}`;
}

async function requireAdmin(interaction: ChatInputCommandInteraction, state: RuntimeState) {
  if (state.config.adminUserIds.includes(interaction.user.id)) {
    return true;
  }

  await interaction.reply({
    content: "只有 config.json 裡的管理員可以使用這個指令。",
    ephemeral: true
  });
  return false;
}

async function replyWithError(interaction: ChatInputCommandInteraction, message: string) {
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(message).catch(() => undefined);
    return;
  }

  await interaction.reply({ content: message, ephemeral: true }).catch(() => undefined);
}
