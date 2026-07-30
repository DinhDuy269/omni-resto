import React from 'react';
import type { TableInfo } from '../../../../shared/types/admin';

interface Props {
  table: TableInfo;
}

export const TableCard: React.FC<Props> = ({ table }) => {
  return (
    <div className="card">
      <h4>Bàn {table.tableNo}</h4>
      <p>Sức chứa: {table.capacity} người</p>
    </div>
  );
};
