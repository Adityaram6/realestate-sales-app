import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AppConfig } from "../../config/configuration";

export interface SmsSendResult {
  externalId: string;
  status: "queued" | "sent" | "failed";
}

/**
 * SMS gateway wrapper. Default provider is MSG91 (India-first, transactional
 * + promotional) but the interface is provider-agnostic — swap the
 * `sendViaMsg91` method for Twilio / Gupshup / Exotel as needed.
 *
 * Configure via env: MSG91_AUTH_KEY + MSG91_SENDER_ID + MSG91_TEMPLATE_ID.
 * Without auth key, we log and return a fake success so the UI exercises
 * correctly in dev.
 */
@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name);
  private readonly authKey?: string;
  private readonly senderId?: string;
  private readonly templateId?: string;
  private readonly provider: string;

  constructor(config: ConfigService<AppConfig, true>) {
    const sms = config.get("sms", { infer: true });
    this.provider = sms.provider;
    this.authKey = sms.msg91AuthKey;
    this.senderId = sms.msg91SenderId;
    this.templateId = sms.msg91TemplateId;
  }

  isConfigured(): boolean {
    return Boolean(this.authKey && this.senderId);
  }

  async send(params: {
    to: string;
    message: string;
  }): Promise<SmsSendResult> {
    if (!this.isConfigured()) {
      this.logger.warn(
        `[stub] SMS provider '${this.provider}' not configured — would send to ${this.redact(params.to)}: ${params.message.slice(0, 40)}…`,
      );
      return {
        externalId: `stub-sms-${Date.now()}`,
        status: "sent",
      };
    }
    return this.sendViaMsg91(params);
  }

  /**
   * MSG91 flow (real API shape):
   *   POST https://control.msg91.com/api/v5/flow/
   *   headers: { authkey }
   *   body: { template_id, short_url, recipients: [{ mobiles, ...vars }] }
   *
   * Response: { type: "success", message: "<requestId>" }
   *
   * Kept as a stub because enabling MSG91 DLT routing requires business
   * verification + template approval (3–7 days typically). Flip the guard
   * and uncomment when ready.
   */
  private async sendViaMsg91(params: {
    to: string;
    message: string;
  }): Promise<SmsSendResult> {
    const e164 = this.normalizePhone(params.to);
    this.logger.log(
      `[stub] MSG91 send → ${this.redact(e164)} via template ${this.templateId ?? "(default)"}`,
    );
    // Real implementation:
    //
    // const res = await fetch("https://control.msg91.com/api/v5/flow/", {
    //   method: "POST",
    //   headers: {
    //     authkey: this.authKey!,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     template_id: this.templateId,
    //     sender: this.senderId,
    //     recipients: [{ mobiles: e164, message: params.message }],
    //   }),
    // });
    // const data = await res.json();
    // return { externalId: data.message ?? "", status: res.ok ? "sent" : "failed" };

    return { externalId: `msg91-stub-${Date.now()}`, status: "sent" };
  }

  private normalizePhone(p: string): string {
    const digits = p.replace(/[^\d]/g, "");
    return digits.startsWith("91") ? digits : `91${digits.slice(-10)}`;
  }

  private redact(phone: string): string {
    return phone.length <= 4
      ? phone
      : `${phone.slice(0, 2)}****${phone.slice(-2)}`;
  }
}
