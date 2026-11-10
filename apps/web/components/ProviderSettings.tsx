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
        message: "BYOK is unavailable in this deployment.",
      }
    : connectionStatus ?? {
        tone: "neutral" as const,
        message: "Not connected. Save a provider key to enable chat.",
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
            {byokRequired ? "BYOK required" : "Bring your own key"}
          </span>
          <h2 id="provider-settings-title">Use your own provider</h2>
          <p id="provider-settings-description">
            Choose a service and model for this chat. Your key is sent over
            HTTPS to this server and the selected provider, never stored by this
            app, and used only from this tab&apos;s memory. Your provider bills
            your account; model availability depends on that account.
          </p>
        </div>
        <div className="provider-settings-security" aria-label="Key handling">
          <ShieldCheck size={17} aria-hidden="true" />
          <span>Memory only</span>
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
            Availability depends on your provider account.
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
            Entry is local only. Connect does not verify the key or call a
            provider.
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
            aria-label={`Get a ${selectedProvider.label} API key (opens in a new tab)`}
          >
            Get a key <ExternalLink size={12} aria-hidden="true" />
          </a>
          <button
            className="provider-settings-button provider-settings-button-primary"
            type="button"
            onClick={onConnect}
            disabled={!byokEnabled || !draftIsValid || isActive}
          >
            {isActive ? "Saved in memory" : "Connect / save in memory"}
          </button>
          <button
            className="provider-settings-button provider-settings-button-quiet"
            type="button"
            onClick={onForget}
            disabled={!apiKey && !activeCredentials}
            aria-label="Forget the API key from this tab"
          >
            <Trash2 size={13} aria-hidden="true" />
            Forget key
          </button>
        </div>
      </div>

      {configLoading && (
        <p className="provider-settings-config-note" role="status">
          Loading chat configuration…
        </p>
      )}
      {configError && !configLoading && (
        <p className="provider-settings-config-note" role="alert">
          Chat configuration is temporarily unavailable. BYOK remains required;
          no key was included in that check.
        </p>
      )}
    </section>
  );
}
