import React from 'react';

interface Props {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const OrderStatusTab: React.FC<Props> = ({ activeTab, onSelectTab }) => {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        className={`btn ${activeTab === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => onSelectTab('ALL')}
      >
        Tất Cả
      </button>
    </div>
  );
};
