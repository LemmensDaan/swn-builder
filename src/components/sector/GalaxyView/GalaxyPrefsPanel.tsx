import type { CSSProperties } from 'react';
import type { GalaxyPrefs, GalaxyStyle, ColorScheme } from './galaxyPrefs';
import { GALAXY_STYLES, COLOR_SCHEMES } from './galaxyPrefs';

function CarouselRow<T extends string>({
  label, value, options, onChange,
}: {
  label: string;
  value: T;
  options: readonly { key: T; label: string; desc: string }[];
  onChange: (v: T) => void;
}) {
  const idx = options.findIndex(o => o.key === value);
  const opt = options[idx];
  const prev = () => onChange(options[(idx - 1 + options.length) % options.length].key);
  const next = () => onChange(options[(idx + 1) % options.length].key);

  const arrow: CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '15px',
    color: 'rgba(120,145,220,0.7)',
    padding: '0 10px',
    lineHeight: 1,
    transition: 'color 0.12s',
    userSelect: 'none',
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontFamily: 'monospace',
        fontSize: '8px',
        color: 'rgba(100,125,200,0.45)',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button style={arrow} onClick={prev} onMouseEnter={e => (e.currentTarget.style.color = 'rgba(180,200,255,0.95)')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(120,145,220,0.7)')}>‹</button>
        <span style={{
          fontFamily: 'monospace',
          fontSize: '12px',
          letterSpacing: '0.06em',
          color: 'rgba(215,225,255,0.92)',
          textAlign: 'center',
          minWidth: 68,
        }}>
          {opt.label}
        </span>
        <button style={arrow} onClick={next} onMouseEnter={e => (e.currentTarget.style.color = 'rgba(180,200,255,0.95)')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(120,145,220,0.7)')}>›</button>
      </div>
      <div style={{
        fontFamily: 'monospace',
        fontSize: '9px',
        color: 'rgba(80,105,175,0.5)',
        textAlign: 'center',
        marginTop: 3,
        letterSpacing: '0.03em',
      }}>
        {opt.desc}
      </div>
    </div>
  );
}

interface Props {
  prefs: GalaxyPrefs;
  onChange: (p: GalaxyPrefs) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function GalaxyPrefsPanel({ prefs, onChange, onSave, onClose }: Props) {
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
      minWidth: 210,
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
          Galaxy Appearance
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

      <CarouselRow<GalaxyStyle>
        label="Shape"
        value={prefs.style}
        options={GALAXY_STYLES}
        onChange={style => onChange({ ...prefs, style })}
      />

      <div style={{ borderTop: '1px solid rgba(60,80,150,0.15)', marginTop: 2, marginBottom: 14 }} />

      <CarouselRow<ColorScheme>
        label="Colour"
        value={prefs.colorScheme}
        options={COLOR_SCHEMES}
        onChange={colorScheme => onChange({ ...prefs, colorScheme })}
      />

      <button
        onClick={onSave}
        style={{
          width: '100%',
          fontFamily: 'monospace',
          fontSize: '9px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          padding: '7px 0',
          background: 'rgba(50,70,170,0.32)',
          border: '1px solid rgba(70,95,195,0.38)',
          borderRadius: 4,
          color: 'rgba(185,200,255,0.88)',
          cursor: 'pointer',
          marginTop: 2,
          transition: 'background 0.12s, color 0.12s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(60,85,195,0.50)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(220,230,255,1)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(50,70,170,0.32)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(185,200,255,0.88)'; }}
      >
        Save
      </button>
    </div>
  );
}
