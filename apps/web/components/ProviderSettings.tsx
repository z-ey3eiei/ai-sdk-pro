"use client";

import { ExternalLink, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import {
  BYOK_PROVIDERS,
  type BYOKCredentials,
  type BYOKProviderId,
} from "../lib/byok-config";

type ConnectionTone = "neutral" | "ready" | "warning";

export interface ProviderSettingsProps {
  provider: BYOKProviderId;
  model: string;
  apiKey: string;
  activeCredentials: BYOKCredentials | null;
  byokEnabled: boolean;
  byokRequired: boolean;
  configLoading: boolean;
  configError: boolean;
  connectAttempted: boolean;
  connectionStatus: {
    tone: ConnectionTone;
    message: string;
  } | null;
  onProviderChange: (provider: BYOKProviderId) => void;
  onModelChange: (model: string) => void;
  onApiKeyChange: (apiKey: string) => void;
  onConnect: () => void;
  onForget: () => void;
}

export default function ProviderSettings({
  provider,
  model,
  apiKey,
  activeCredentials,
  byokEnabled,
  byokRequired,
  configLoading,
  configError,
  connectAttempted,
  connectionStatus,
  onProviderChange,
  onModelChange,
  onApiKeyChange,
  onConnect,
  onForget,
}: ProviderSettingsProps) {
  const selectedProvider =
    BYOK_PROVIDERS.find(item => item.id === provider) ?? BYOK_PROVIDERS[0];
  const selectedModel = selectedProvider.models.find(item => item.id === model);
  const isActive =
    activeCredentials?.provider === provider &&
    activeCredentials.model === model &&
    activeCredentials.apiKey === apiKey.trim();
  const draftIsValid = Boolean(apiKey.trim() && selectedModel);
  const keyInvalid = connectAttempted && !apiKey.trim();
  const status = !byokEnabled
    ? {
        tone: "warning" as const,
        message: "Deployment นี้ยังไม่เปิด BYOK",
      }
    : connectionStatus ?? {
        tone: "neutral" as const,
        message: "ยังไม่เชื่อมต่อ ใส่ provider key เพื่อเปิดใช้งานแชต",
      };

  return (
    <section
      className="provider-settings-card"
      aria-labelledby="provider-settings-title"
      aria-describedby="provider-settings-description"
      aria-busy={configLoading}
    >
      <div className="provider-settings-heading">
        <div className="provider-settings-heading-copy">
          <span className="provider-settings-kicker">
            <KeyRound size={13} aria-hidden="true" />
            {byokRequired ? "ต้องใช้ BYOK" : "ใช้ provider key ของคุณเอง"}
          </span>
          <h2 id="provider-settings-title">เลือก provider สำหรับแชตนี้</h2>
          <p id="provider-settings-description">
            เลือก service และ model สำหรับบทสนทนานี้ key จะถูกส่งผ่าน HTTPS ไปยัง
            เซิร์ฟเวอร์นี้และ provider ที่เลือก ไม่ถูกบันทึกโดยแอป และใช้จาก memory
            ของ tab นี้เท่านั้น ค่าใช้จ่ายเรียกเก็บจากบัญชี provider ของคุณ
            ความพร้อมใช้งานของ model ขึ้นกับบัญชีนั้น
          </p>
        </div>
        <div className="provider-settings-security" aria-label="Key handling">
          <ShieldCheck size={17} aria-hidden="true" />
          <span>อยู่ใน tab นี้เท่านั้น</span>
        </div>
      </div>

      <div className="provider-settings-fields">
        <div className="provider-settings-field">
          <label htmlFor="byok-provider">Provider</label>
          <select
            id="byok-provider"
            value={provider}
            onChange={event =>
              onProviderChange(event.target.value as BYOKProviderId)
            }
            disabled={!byokEnabled}
          >
            {BYOK_PROVIDERS.map(item => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="provider-settings-field">
          <label htmlFor="byok-model">Model</label>
          <select
            id="byok-model"
            value={model}
            onChange={event => onModelChange(event.target.value)}
            disabled={!byokEnabled}
          >
            {selectedProvider.models.map(item => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <span className="provider-settings-field-note">
            ความพร้อมใช้งานขึ้นกับบัญชี provider ของคุณ
          </span>
        </div>

        <div className="provider-settings-field provider-settings-key-field">
          <label htmlFor="byok-api-key">API key</label>
          <input
            id="byok-api-key"
            type="password"
            value={apiKey}
            onChange={event => onApiKeyChange(event.target.value)}
            placeholder={selectedProvider.keyPlaceholder}
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            required
            aria-required="true"
            aria-invalid={keyInvalid}
            aria-describedby="byok-api-key-help"
            disabled={!byokEnabled}
          />
          <span id="byok-api-key-help" className="provider-settings-field-note">
            คีย์ที่พิมพ์อยู่ในหน่วยความจำของ tab นี้เท่านั้น การกด Connect ยังไม่ตรวจสอบ key
            และยังไม่เรียก provider
          </span>
        </div>
      </div>

      <div className="provider-settings-footer">
        <div
          className={`provider-settings-status provider-settings-status-${status.tone}`}
          role="status"
          aria-live="polite"
        >
          <span className="provider-settings-status-dot" aria-hidden="true" />
          <span>{status.message}</span>
        </div>
        <div className="provider-settings-actions">
          <a
            className="provider-settings-key-link"
            href={selectedProvider.keyUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`เปิดหน้าออก ${selectedProvider.label} API key ในแท็บใหม่`}
          >
            รับ key <ExternalLink size={12} aria-hidden="true" />
          </a>
          <button
            className="provider-settings-button provider-settings-button-primary"
            type="button"
            onClick={onConnect}
            disabled={!byokEnabled || !draftIsValid || isActive}
          >
            {isActive ? "เก็บไว้ในหน่วยความจำแล้ว" : "เชื่อม / เก็บในหน่วยความจำ"}
          </button>
          <button
            className="provider-settings-button provider-settings-button-quiet"
            type="button"
            onClick={onForget}
            disabled={!apiKey && !activeCredentials}
            aria-label="ล้าง API key จาก tab นี้"
          >
            <Trash2 size={13} aria-hidden="true" />
            ล้าง key
          </button>
        </div>
      </div>

      {configLoading && (
        <p className="provider-settings-config-note" role="status">
          กำลังโหลดการตั้งค่าแชต…
        </p>
      )}
      {configError && !configLoading && (
        <p className="provider-settings-config-note" role="alert">
          การตั้งค่าแชตยังตรวจสอบไม่ได้ชั่วคราว ระบบยังคงกำหนดให้ใช้ BYOK
          และไม่ได้ส่ง key ไปกับการตรวจสอบนี้
        </p>
      )}
    </section>
  );
}
