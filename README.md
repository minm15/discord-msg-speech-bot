# Audio Message Bot

Discord bot that reads messages from one configured text channel and plays them in a voice channel with Edge TTS.

## Features

- Listens to one configured Discord text channel.
- Reads messages only from runtime allowed users.
- Lets configured admins manage the read-list with slash commands.
- Joins voice by `/join`.
- Plays every valid message through a queue.
- Skips URLs and emoji.
- Converts mentions to display names.
- Truncates long messages with `以下省略`.
- Retries failed TTS requests.
- Supports `/status`, `/skip`, `/clear`, and `/leave`.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill it in:

```env
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_client_id
```

3. Edit `config.json`:

```json
{
  "guildId": "your_discord_server_id",
  "textChannelId": "text_channel_to_listen_to",
  "adminUserIds": ["admin_user_id"],
  "allowedUserIds": [],
  "maxMessageLength": 200,
  "ttsRetryCount": 2,
  "ttsVoice": "zh-TW-HsiaoChenNeural",
  "ttsLanguage": "zh-TW"
}
```

4. Enable these bot settings in the Discord Developer Portal:

- `MESSAGE CONTENT INTENT`
- `SERVER MEMBERS INTENT`

5. Invite the bot with these scopes:

- `bot`
- `applications.commands`

Recommended bot permissions:

- Read Messages/View Channels
- Send Messages
- Use Slash Commands
- Connect
- Speak

6. Start the bot:

```bash
npm run dev
```

## Commands

```text
/join
```

Join the voice channel you are currently in.

```text
/leave
```

Leave voice and clear the queue.

```text
/status
```

Show current voice channel, listened text channel, listened users, queue size, playback state, max message length, and TTS settings.

```text
/skip
```

Skip the current playback.

```text
/clear
```

Clear queued messages.

```text
/add-user user:@someone
```

Admin-only. Add a user to the runtime read-list.

```text
/remove-user user:@someone
```

Admin-only. Remove a user from the runtime read-list.

```text
/list-users
```

List users currently in the runtime read-list.

## Notes

Slash commands are registered to the configured guild when the bot starts.

The bot does not persist runtime state. Restarting returns the read-list to `allowedUserIds` in `config.json`.
