import type { CSSProperties } from 'react';
import type { SystemPrefs } from './systemPrefs';

interface Props {
  prefs: SystemPrefs;
  onChange: (p: SystemPrefs) => void;
  onClose: () => void;
}

export default function SystemPrefsPanel({ prefs, onChange, onClose }: Props) {
  const switchTrackStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    background: prefs.showOrbits ? 'rgba(80,120,200,0.5)' : 'rgba(60,80,150,0.3)',
    border: '1px solid rgba(70,95,195,0.38)',
    borderRadius: '10px',
    width: '44px',
    height: '22px',
    padding: '2px',
    cursor: 'pointer',
    transition: 'background 0.2s',
    position: 'relative',
  };

  const switchThumbStyle: CSSProperties = {
    display: 'block',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: '#fff',
    position: 'absolute',
    transition: 'left 0.2s',
    left: prefs.showOrbits ? '24px' : '4px',
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: 60,
      right: 20,
      background: 'rgba(3,6,16,0.94)',
      border: '1px solid rgba(70,90,160,0.30)',
      backdropFilter: 'blur(10px)',
      borderRadius: 7,
      padding: '14px 16px 12px',
      minWidth: 220,
      zIndex: 50,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
        paddingBottom: 10,
        borderBottom: '1px solid rgba(60,80,150,0.22)',
      }}>
        <span style={{
          fontFamily: 'monospace',
          fontSize: '8px',
          color: 'rgba(110,135,210,0.55)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}>
          System Settings
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(90,115,185,0.45)',
            fontSize: '10px',
            padding: 0,
            lineHeight: 1,
            transition: 'color 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(180,195,240,0.8)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(90,115,185,0.45)')}
        >
          ✕
        </button>
      </div>

      {/* Show Orbits Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          color: 'rgba(215,225,255,0.92)',
        }}>
          Show orbits
        </span>
        <button
          onClick={() => onChange({ ...prefs, showOrbits: !prefs.showOrbits })}
          style={{
            ...switchTrackStyle,
            background: prefs.showOrbits ? 'rgba(80,120,200,0.5)' : 'rgba(60,80,150,0.3)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = prefs.showOrbits ? 'rgba(100,140,220,0.6)' : 'rgba(80,100,170,0.4)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = prefs.showOrbits ? 'rgba(80,120,200,0.5)' : 'rgba(60,80,150,0.3)';
          }}
        >
          <div style={switchThumbStyle} />
        </button>
      </div>
    </div>
  );
}
