import React from 'react';
import { Check, Clock, ChefHat, Bell, XCircle } from 'lucide-react';
import type { PlacedOrderStatus } from '../../shared/types/client';

interface Step {
  key: PlacedOrderStatus;
  label: string;
  subLabel: string;
  Icon: React.FC<{ size?: number; strokeWidth?: number }>;
}

const STEPS: Step[] = [
  { key: 'PENDING',    label: 'Tiếp nhận', subLabel: 'Chờ duyệt bàn',        Icon: Clock },
  { key: 'CONFIRMED',  label: 'Đã duyệt',  subLabel: 'Hàng đợi bếp (Chờ nấu)', Icon: Clock },
  { key: 'PREPARING',  label: 'Bếp nấu',    subLabel: 'Đầu bếp đang nấu',    Icon: ChefHat },
  { key: 'READY',      label: 'Sẵn sàng',   subLabel: 'Đang bưng ra bàn',    Icon: Bell },
  { key: 'COMPLETED',  label: 'Hoàn tất',   subLabel: 'Đã lên bàn xong',     Icon: Check },
];

interface Props {
  status?: PlacedOrderStatus;
  currentStatus?: PlacedOrderStatus;
  estimatedMinutes?: number;
}

export const OrderStatusStepper: React.FC<Props> = ({ status, currentStatus, estimatedMinutes }) => {
  const activeStatus = currentStatus || status || 'PENDING';

  if (activeStatus === 'CANCELLED') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        margin: '16px 0', padding: '12px 16px',
        background: '#fff5f5', borderRadius: '10px',
        border: '1px solid #fed7d7',
      }}>
        <XCircle size={20} color="#dc2626" />
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#991b1b' }}>
          Đơn hàng này đã bị hủy từ phía nhà hàng (Không tính tiền)
        </span>
      </div>
    );
  }

  const currentIdx = STEPS.findIndex(s => s.key === activeStatus);
  const progressPercent = currentIdx === -1 ? 0 : (currentIdx / (STEPS.length - 1)) * 100;

  return (
    <div style={{ padding: '24px 0' }}>
      {estimatedMinutes && activeStatus !== 'COMPLETED' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 20, padding: '10px 16px',
          background: 'var(--c-accent-light, #fffbe6)', borderRadius: '8px',
          border: '1px solid #fde68a',
        }}>
          <Clock size={16} color="#b45309" strokeWidth={2} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#92400e' }}>
            Thời gian dự kiến: khoảng <strong>{estimatedMinutes} phút</strong>
          </span>
        </div>
      )}
      {/* Progress track top */}
      <div style={{
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progressPercent}%`,
          backgroundColor: '#FF6B00',
          borderRadius: 2,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIdx;
          const isActive    = idx === currentIdx;

          return (
            <React.Fragment key={step.key}>
              {/* Step node */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
                {/* Circle icon */}
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.4s ease',
                  flexShrink: 0,
                  ...(isCompleted ? {
                    background: 'var(--c-success)',
                    boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
                  } : isActive ? {
                    background: 'var(--c-primary)',
                    boxShadow: 'var(--c-shadow-orange)',
                    animation: 'c-badge-pop 1.5s ease-in-out infinite',
                  } : {
                    background: 'var(--c-border-light)',
                    border: '2px dashed var(--c-border)',
                  }),
                }}>
                  {isCompleted ? (
                    <Check size={20} color="#fff" strokeWidth={3} />
                  ) : (
                    <step.Icon
                      size={20}
                      strokeWidth={2}
                    />
                  )}
                </div>

                {/* Labels — Gestalt Proximity: label directly under icon */}
                <div style={{ textAlign: 'center', marginTop: 8, padding: '0 4px' }}>
                  <div style={{
                    fontSize: '0.75rem', fontWeight: 700, lineHeight: 1.3,
                    color: isCompleted ? 'var(--c-success)' : isActive ? 'var(--c-primary)' : 'var(--c-text-muted)',
                  }}>
                    {step.label}
                  </div>
                  {isActive && (
                    <div style={{
                      fontSize: '0.6875rem', color: 'var(--c-text-muted)',
                      marginTop: 2, lineHeight: 1.3,
                    }}>
                      {step.subLabel}
                    </div>
                  )}
                </div>
              </div>

              {/* Connector line — Gestalt Continuity */}
              {idx < STEPS.length - 1 && (
                <div style={{
                  height: 3, flex: 0.5, marginTop: 22, borderRadius: 2,
                  background: idx < currentIdx ? 'var(--c-success)' : 'var(--c-border)',
                  transition: 'background 0.6s ease',
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
