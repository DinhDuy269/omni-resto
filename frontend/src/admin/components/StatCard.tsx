import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  icon: Icon,
  iconBgColor = 'var(--primary-subtle)',
  iconColor = 'var(--primary)',
  subtitle,
}) => {
  return (
    <div
      className="card animate-fade-in hover-lift"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '20px 22px',
        borderRadius: '14px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
          {title}
        </span>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: iconBgColor,
            color: iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
        >
          <Icon size={20} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
        <span
          style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            color: 'var(--text-main)',
            letterSpacing: '-0.5px',
            fontFeatureSettings: "'tnum' 1",
          }}
        >
          {value}
        </span>
        {change && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: isPositive ? 'var(--success)' : 'var(--danger)',
              backgroundColor: isPositive ? 'var(--success-bg)' : 'var(--danger-bg)',
              border: `1px solid ${isPositive ? 'var(--success-border)' : 'var(--danger-border)'}`,
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
            }}
          >
            {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {change}
          </span>
        )}
      </div>

      {subtitle && (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {subtitle}
        </span>
      )}
    </div>
  );
};
