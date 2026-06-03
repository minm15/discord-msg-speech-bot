import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { EdgeTTS } from "edge-tts-universal";
import type { BotConfig } from "../config.js";

export type TtsResult = {
  filePath: string;
};

export async function synthesizeWithRetry(text: string, config: BotConfig): Promise<TtsResult> {
  let lastError: unknown;
  const attempts = config.ttsRetryCount + 1;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      console.log(`[tts] attempt ${attempt}/${attempts}`);
      return await synthesizeToFile(text, config);
    } catch (error) {
      lastError = error;
      console.error(`[tts] attempt ${attempt} failed:`, error);

      if (attempt < attempts) {
        await delay(attempt * 1000);
      }
    }
  }

  throw lastError;
}

async function synthesizeToFile(text: string, config: BotConfig): Promise<TtsResult> {
  const outputPath = path.resolve(process.cwd(), "tmp", `${randomUUID()}.mp3`);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const tts = new EdgeTTS(text, config.ttsVoice);
  const result = await withTimeout(tts.synthesize(), 20_000);

  const buffer = Buffer.from(await result.audio.arrayBuffer());
  await fs.writeFile(outputPath, buffer);

  return { filePath: outputPath };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeout: NodeJS.Timeout | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`TTS timeout after ${ms}ms`)), ms);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
