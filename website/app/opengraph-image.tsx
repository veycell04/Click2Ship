import { ImageResponse } from 'next/og';

export const alt = 'ShipDime — Select. Right-click. Ship.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 3600;

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '68px 76px', background: '#f4f8fd', color: '#10213d', fontFamily: 'sans-serif', borderTop: '14px solid #1769e0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <div style={{ display: 'flex', width: 68, height: 68, background: '#1769e0', borderRadius: 16, alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: 44 }}>S</div>
        <div style={{ display: 'flex', fontSize: 54, fontWeight: 700 }}>ShipDime</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>Select. Right-click. Ship.</div>
        <div style={{ display: 'flex', fontSize: 32, lineHeight: 1.4, maxWidth: 850, color: '#40516a' }}>Create shipping labels directly from addresses on the web.</div>
      </div>
      <div style={{ display: 'flex', fontSize: 24, color: '#1769e0' }}>shipdime.com</div>
    </div>,
    size,
  );
}
