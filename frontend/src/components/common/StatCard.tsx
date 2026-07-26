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
    <div className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          {title}
        </span>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: iconBgColor,
            color: iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={22} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
        <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
          {value}
        </span>
        {change && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: isPositive ? 'var(--success)' : 'var(--danger)',
              backgroundColor: isPositive ? 'var(--success-bg)' : 'var(--danger-bg)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
            }}
          >
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {change}
          </span>
        )}
      </div>

      {subtitle && (
        <span style={{ fontSize: '0.78125rem', color: 'var(--text-light)' }}>
          {subtitle}
        </span>
      )}
    </div>
  );
};
