import { ImageResponse } from 'next/og';
import { docs } from '@/lib/content';

export const runtime = 'edge';

export function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('slug');
  const doc = docs.find((item) => item.slug === slug);
  const title = doc?.title ?? 'Documentation';
  const description = doc?.description ?? 'Build, integrate, and self-host ai-sdk.pro agents.';

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0b0b0b',
          color: '#f6f6f6',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'space-between',
          padding: '72px',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, letterSpacing: '-1px' }}>
          AI SDK <span style={{ border: '1px solid #f6f6f6', borderRadius: 5, display: 'flex', fontSize: 16, letterSpacing: '1px', marginLeft: 12, padding: '6px 8px' }}>PRO</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 1000 }}>
          <div style={{ color: '#8d72d1', display: 'flex', fontSize: 20, marginBottom: 20 }}>DOCUMENTATION / {doc?.category?.toUpperCase() ?? 'GUIDES'}</div>
          <div style={{ display: 'flex', fontSize: 58, fontWeight: 700, letterSpacing: '-2px', lineHeight: 1.1 }}>{title}</div>
          <div style={{ color: '#aaa', display: 'flex', fontSize: 24, lineHeight: 1.4, marginTop: 20 }}>{description}</div>
        </div>
        <div style={{ color: '#747474', display: 'flex', fontSize: 18 }}>ai-sdk.pro · independent project, not affiliated with Vercel</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
