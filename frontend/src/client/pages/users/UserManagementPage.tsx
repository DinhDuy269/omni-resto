import React, { useEffect, useState } from 'react';
import { authApi, type UserAdminDto, type UserStatus } from '../../../shared/api/authService';
import './UserManagementPage.css';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserAdminDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await authApi.getAllUsers();
      setUsers(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
    try {
      await authApi.updateUserStatus(userId, newStatus);
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );
    } catch (err: any) {
      alert(err.response?.data?.message || 'Cập nhật trạng thái thất bại!');
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="badge badge-active">Hoạt động</span>;
      case 'PENDING_VERIFICATION':
        return <span className="badge badge-pending">Chờ xác minh</span>;
      case 'BLOCKED':
        return <span className="badge badge-blocked">Đã bị khóa</span>;
      default:
        return <span className="badge badge-default">{status}</span>;
    }
  };

  return (
    <div className="admin-users-container">
      <div className="admin-users-wrapper">
        <h1 className="admin-users-title">Quản Lý Đăng Ký Thành Viên</h1>

        {error && <div className="admin-users-error">{error}</div>}

        {loading ? (
          <div className="admin-users-loading">Đang tải dữ liệu...</div>
        ) : (
          <div className="admin-users-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Họ và Tên</th>
                  <th>Email</th>
                  <th>Số Điện Thoại</th>
                  <th>Vai Trò</th>
                  <th>Trạng Thái</th>
                  <th className="text-right">Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="user-name">{user.fullName}</td>
                    <td>{user.email}</td>
                    <td>{user.phone}</td>
                    <td className="user-role">{user.role}</td>
                    <td>{getStatusBadge(user.status)}</td>
                    <td className="text-right">
                      {user.status === 'BLOCKED' ? (
                        <button onClick={() => handleStatusChange(user.id, 'ACTIVE')} className="btn-action-unblock">
                          Mở khóa
                        </button>
                      ) : (
                        <button onClick={() => handleStatusChange(user.id, 'BLOCKED')} className="btn-action-block">
                          Khóa tài khoản
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};