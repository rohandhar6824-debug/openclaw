import { describe, expect, it, vi, beforeEach } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";
import { handleWhatsAppAction } from "./whatsapp-actions.js";

const sendReactionWhatsApp = vi.fn(async () => undefined);
const sendPollWhatsApp = vi.fn(async () => ({ messageId: "poll-1", toJid: "jid-1" }));

vi.mock("../../web/outbound.js", () => ({
  sendReactionWhatsApp: (...args: unknown[]) => sendReactionWhatsApp(...args),
  sendPollWhatsApp: (...args: unknown[]) => sendPollWhatsApp(...args),
}));

const enabledConfig = {
  channels: { whatsapp: { actions: { reactions: true, polls: true } } },
} as OpenClawConfig;

describe("handleWhatsAppAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("reactions", () => {
    it("adds reactions", async () => {
      await handleWhatsAppAction(
        {
          action: "react",
          chatJid: "123@s.whatsapp.net",
          messageId: "msg1",
          emoji: "✅",
        },
        enabledConfig,
      );
      expect(sendReactionWhatsApp).toHaveBeenCalledWith("123@s.whatsapp.net", "msg1", "✅", {
        verbose: false,
        fromMe: undefined,
        participant: undefined,
        accountId: undefined,
      });
    });

    it("removes reactions on empty emoji", async () => {
      await handleWhatsAppAction(
        {
          action: "react",
          chatJid: "123@s.whatsapp.net",
          messageId: "msg1",
          emoji: "",
        },
        enabledConfig,
      );
      expect(sendReactionWhatsApp).toHaveBeenCalledWith("123@s.whatsapp.net", "msg1", "", {
        verbose: false,
        fromMe: undefined,
        participant: undefined,
        accountId: undefined,
      });
    });

    it("removes reactions when remove flag set", async () => {
      await handleWhatsAppAction(
        {
          action: "react",
          chatJid: "123@s.whatsapp.net",
          messageId: "msg1",
          emoji: "✅",
          remove: true,
        },
        enabledConfig,
      );
      expect(sendReactionWhatsApp).toHaveBeenCalledWith("123@s.whatsapp.net", "msg1", "", {
        verbose: false,
        fromMe: undefined,
        participant: undefined,
        accountId: undefined,
      });
    });

    it("passes account scope and sender flags", async () => {
      await handleWhatsAppAction(
        {
          action: "react",
          chatJid: "123@s.whatsapp.net",
          messageId: "msg1",
          emoji: "🎉",
          accountId: "work",
          fromMe: true,
          participant: "999@s.whatsapp.net",
        },
        enabledConfig,
      );
      expect(sendReactionWhatsApp).toHaveBeenCalledWith("123@s.whatsapp.net", "msg1", "🎉", {
        verbose: false,
        fromMe: true,
        participant: "999@s.whatsapp.net",
        accountId: "work",
      });
    });

    it("respects reaction gating", async () => {
      const cfg = {
        channels: { whatsapp: { actions: { reactions: false } } },
      } as OpenClawConfig;
      await expect(
        handleWhatsAppAction(
          {
            action: "react",
            chatJid: "123@s.whatsapp.net",
            messageId: "msg1",
            emoji: "✅",
          },
          cfg,
        ),
      ).rejects.toThrow(/WhatsApp reactions are disabled/);
    });
  });

  describe("polls", () => {
    it("sends polls when enabled", async () => {
      await handleWhatsAppAction(
        {
          action: "poll",
          chatJid: "123@s.whatsapp.net",
          question: "What's your favorite color?",
          options: ["Red", "Blue", "Green"],
        },
        enabledConfig,
      );
      expect(sendPollWhatsApp).toHaveBeenCalledWith("123@s.whatsapp.net", {
        question: "What's your favorite color?",
        options: ["Red", "Blue", "Green"],
      });
    });

    it("respects poll gating", async () => {
      const cfg = {
        channels: { whatsapp: { actions: { polls: false } } },
      } as OpenClawConfig;
      await expect(
        handleWhatsAppAction(
          {
            action: "poll",
            chatJid: "123@s.whatsapp.net",
            question: "Test?",
            options: ["Yes"],
          },
          cfg,
        ),
      ).rejects.toThrow(/WhatsApp polls are disabled/);
    });
  });

  describe("error cases", () => {
    it("throws on missing required fields", async () => {
      await expect(
        handleWhatsAppAction(
          {
            action: "react",
            // missing chatJid and messageId
            emoji: "✅",
          } as any,
          enabledConfig,
        ),
      ).rejects.toThrow();
    });

    it("throws on unknown action", async () => {
      await expect(
        handleWhatsAppAction(
          {
            action: "unknown",
            chatJid: "123@s.whatsapp.net",
            messageId: "msg1",
          } as any,
          enabledConfig,
        ),
      ).rejects.toThrow(/Unknown WhatsApp action/);
    });
  });
});
