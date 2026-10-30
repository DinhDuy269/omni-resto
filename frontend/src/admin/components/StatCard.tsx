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
    <div className="adm-stat-card animate-fade-in">
      <div className="adm-stat-header">
        <span className="adm-stat-label">{title}</span>
        <div
          className="adm-stat-icon"
          style={{
            backgroundColor: iconBgColor,
            color: iconColor,
          }}
        >
          <Icon size={20} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
        <span className="adm-stat-value">{value}</span>
        {change && (
          <span className={`adm-stat-pill ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {change}
          </span>
        )}
      </div>

      {subtitle && <div className="adm-stat-footer">{subtitle}</div>}
    </div>
  );
};
