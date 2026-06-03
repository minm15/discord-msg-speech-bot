import type { VoiceSession } from "../discord/voice-session.js";

export type QueueItem = {
  text: string;
  authorName: string;
};

export class AudioQueue {
  private items: QueueItem[] = [];
  private processing = false;

  constructor(private readonly voiceSession: VoiceSession) {}

  enqueue(item: QueueItem) {
    this.items.push(item);
    console.log(`[queue] enqueue author=${item.authorName} size=${this.items.length}`);
    void this.process();
  }

  size() {
    return this.items.length;
  }

  clear() {
    this.items = [];
  }

  async process() {
    if (this.processing) {
      return;
    }

    this.processing = true;
    console.log("[queue] processing started");

    while (this.items.length > 0) {
      const item = this.items.shift();
      if (!item) {
        continue;
      }

      console.log(`[queue] dequeue author=${item.authorName} remaining=${this.items.length}`);
      await this.voiceSession.playText(item.text);
    }

    this.processing = false;
    console.log("[queue] processing finished");
  }
}
