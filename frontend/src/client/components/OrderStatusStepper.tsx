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
  { key: 'pending',    label: 'Tiếp nhận', subLabel: 'Chờ duyệt bàn',        Icon: Clock },
  { key: 'confirmed',  label: 'Đã duyệt',  subLabel: 'Hàng đợi bếp (Chờ nấu)', Icon: Clock },
  { key: 'preparing',  label: 'Bếp nấu',    subLabel: 'Đầu bếp đang nấu',    Icon: ChefHat },
  { key: 'ready',      label: 'Sẵn sàng',   subLabel: 'Đang bưng ra bàn',    Icon: Bell },
  { key: 'completed',  label: 'Hoàn tất',   subLabel: 'Đã lên bàn xong',     Icon: Check },
];

interface Props {
  status?: PlacedOrderStatus;
  currentStatus?: PlacedOrderStatus;
  estimatedMinutes?: number;
}

export const OrderStatusStepper: React.FC<Props> = ({ status, currentStatus, estimatedMinutes }) => {
  const activeStatus = currentStatus || status || 'pending';

  if (activeStatus === 'cancelled') {
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
      {estimatedMinutes && activeStatus !== 'completed' && (
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

      {/* Progress Bar Container */}
      <div style={{ position: 'relative', margin: '0 20px' }}>
        {/* Track Line */}
        <div style={{
          position: 'absolute', top: 16, left: 0, right: 0,
          height: 3, background: 'var(--c-border, #e5e7eb)', zIndex: 0,
        }} />
        {/* Active Line */}
        <div style={{
          position: 'absolute', top: 16, left: 0,
          width: `${progressPercent}%`, height: 3,
          background: 'var(--c-primary, #e85d26)', zIndex: 0,
          transition: 'width 0.4s ease',
        }} />

        {/* Steps */}
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          {STEPS.map((step, idx) => {
            const isDone = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const StepIcon = step.Icon;

            return (
              <div key={step.key} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                textAlign: 'center', maxWidth: 90,
              }}>
                {/* Node Circle */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isDone
                    ? 'var(--c-primary, #e85d26)'
                    : isCurrent
                    ? '#ffffff'
                    : '#ffffff',
                  border: isCurrent
                    ? '3px solid var(--c-primary, #e85d26)'
                    : isDone
                    ? 'none'
                    : '2px solid var(--c-border, #e5e7eb)',
                  boxShadow: isCurrent ? '0 0 0 4px var(--c-primary-light, #fff0ea)' : 'none',
                  transition: 'all 0.3s ease',
                  marginBottom: 8,
                }}>
                  {isDone ? (
                    <Check size={16} color="#ffffff" strokeWidth={3} />
                  ) : (
                    <StepIcon
                      size={15}
                      strokeWidth={isCurrent ? 2.5 : 1.8}
                    />
                  )}
                </div>

                {/* Label */}
                <span style={{
                  fontSize: '0.8125rem',
                  fontWeight: isCurrent ? 700 : isDone ? 600 : 400,
                  color: isCurrent
                    ? 'var(--c-primary, #e85d26)'
                    : isDone
                    ? 'var(--c-text, #1f2937)'
                    : 'var(--c-muted, #9ca3af)',
                  marginBottom: 2,
                }}>
                  {step.label}
                </span>

                {/* SubLabel */}
                <span style={{
                  fontSize: '0.6875rem',
                  color: isCurrent ? 'var(--c-primary, #e85d26)' : 'var(--c-muted, #9ca3af)',
                  lineHeight: 1.2,
                }}>
                  {step.subLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
