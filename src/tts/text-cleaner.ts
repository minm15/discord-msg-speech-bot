import type { Message } from "discord.js";

const urlPattern = /https?:\/\/\S+|www\.\S+/gi;
const customEmojiPattern = /<a?:\w+:\d+>/g;
const unicodeEmojiPattern = /[\p{Extended_Pictographic}\uFE0F]/gu;

export function cleanMessageText(message: Message, maxLength: number): string {
  let text = message.content;

  text = text.replace(urlPattern, "");
  text = text.replace(customEmojiPattern, "");
  text = text.replace(unicodeEmojiPattern, "");

  for (const user of message.mentions.users.values()) {
    const member = message.guild?.members.cache.get(user.id);
    const displayName = member?.displayName ?? user.displayName ?? user.username;
    text = text.replaceAll(`<@${user.id}>`, displayName);
    text = text.replaceAll(`<@!${user.id}>`, displayName);
  }

  text = text.replace(/<#(\d+)>/g, "頻道");
  text = text.replace(/<@&(\d+)>/g, "身分組");
  text = text.replace(/\s+/g, " ").trim();

  if (text.length > maxLength) {
    return `${text.slice(0, maxLength)} 以下省略`;
  }

  return text;
}
