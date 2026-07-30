import React from 'react';
import type { Branch } from '../../../../shared/types/admin';

interface Props {
  branch: Branch;
}

export const BranchCard: React.FC<Props> = ({ branch }) => {
  return (
    <div className="card">
      <h3>{branch.name}</h3>
      <p>{branch.address}</p>
    </div>
  );
};
