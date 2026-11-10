'use client';

import { useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

type UseChatOptions = NonNullable<Parameters<typeof useChat>[0]>;
type DefaultTransportOptions = NonNullable<ConstructorParameters<typeof DefaultChatTransport>[0]>;

export type AISDKProTransportOptions = Omit<DefaultTransportOptions, 'api'>;

export type UseAISDKProChatOptions = Omit<UseChatOptions, 'transport'> & {
  /** Absolute API origin, for example `https://chat.example.com`. */
  readonly baseUrl?: string;
  /** Endpoint path or absolute URL. Defaults to `/api/chat`. */
  readonly endpoint?: string;
  readonly transportOptions?: AISDKProTransportOptions;
};

function resolveApiUrl(baseUrl: string | undefined, endpoint: string): string {
  if (!baseUrl) return endpoint;
  return new URL(endpoint, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
}

/**
 * A thin AI SDK 6 hook that keeps the transport configurable while providing
 * the ai-sdk.pro endpoint defaults.
 */
export function useAISDKProChat(options: UseAISDKProChatOptions = {}): ReturnType<typeof useChat> {
  const { baseUrl, endpoint = '/api/chat', transportOptions, ...chatOptions } = options;
  const api = resolveApiUrl(baseUrl, endpoint);
  const transport = useMemo(
    () => new DefaultChatTransport({ ...transportOptions, api }),
    [api, transportOptions],
  );

  return useChat({ ...chatOptions, transport });
}
