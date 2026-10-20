import { useEffect, useMemo, useState } from "react";
import { fetchCustomers, updateCustomerStatus } from "../../../shared/api/customerApi";
import type { CustomerResponse } from "../../../shared/types/customer";
import "./customers.css";

const TIER_LABEL: Record<string, string> = {
  standard: "Tiêu chuẩn",
  silver: "Bạc",
  gold: "Vàng",
  platinum: "Bạch kim",
};

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase()).join("");

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("all");
  const [status, setStatus] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers()
      .then(setCustomers)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      const matchQuery =
        !q ||
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.id.toLowerCase().includes(q);
      return matchQuery && (tier === "all" || c.membershipTier === tier) && (status === "all" || c.status === status);
    });
  }, [customers, query, tier, status]);

  const toggleStatus = async (c: CustomerResponse) => {
    const next = c.status === "active" ? "inactive" : "active";
    setBusyId(c.id);
    setError("");
    try {
      const updated = await updateCustomerStatus(c.id, next);
      setCustomers((list) => list.map((x) => (x.id === c.id ? updated : x)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="cm-wrap">
      <header className="cm-head">
        <div>
          <h1>Quản Lý Khách Hàng Thành Viên ({customers.length})</h1>
          <p>Danh sách khách hàng đã đăng ký thành viên. Bạn có thể tìm kiếm, lọc theo hạng và khóa hoặc mở khóa tài khoản.</p>
        </div>
      </header>

      <div className="cm-filters">
        <input
          className="cm-search"
          placeholder="Tìm theo tên, email, sđt, mã khách hàng..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Tìm khách hàng"
        />
        <label>
          Hạng:
          <select value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="all">Tất cả hạng</option>
            {Object.entries(TIER_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Trạng thái:
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã khóa</option>
          </select>
        </label>
      </div>

      {error && <div className="cm-alert" role="alert">{error}</div>}

      <div className="cm-table">
        <div className="cm-tr cm-th">
          <span>Khách hàng</span>
          <span>Hạng & điểm</span>
          <span>Liên hệ</span>
          <span>Ngày đăng ký</span>
          <span>Trạng thái</span>
          <span className="cm-right">Thao tác</span>
        </div>

        {loading && <p className="cm-empty">Đang tải danh sách...</p>}
        {!loading && filtered.length === 0 && (
          <p className="cm-empty">
            {customers.length === 0 ? "Chưa có khách hàng nào đăng ký." : "Không có khách hàng phù hợp với bộ lọc."}
          </p>
        )}

        {filtered.map((c) => (
          <div className="cm-tr" key={c.id}>
            <span className="cm-person">
              <span className="cm-avatar" aria-hidden="true">{initials(c.fullName)}</span>
              <span>
                <strong>{c.fullName}</strong>
                <small>ID: {c.id}</small>
              </span>
            </span>
            <span>
              <em className={`cm-tier cm-tier-${c.membershipTier}`}>{TIER_LABEL[c.membershipTier] ?? c.membershipTier}</em>
              <small className="cm-block">{c.loyaltyPoints} điểm</small>
            </span>
            <span className="cm-contact">
              {c.email}
              <small className="cm-block">{c.phone}</small>
            </span>
            <span>{new Date(c.createdAt).toLocaleDateString("vi-VN")}</span>
            <span>
              <em className={c.status === "active" ? "cm-badge cm-on" : "cm-badge cm-off"}>
                {c.status === "active" ? "Đang hoạt động" : "Đã khóa"}
              </em>
            </span>
            <span className="cm-right">
              <button className="cm-btn" disabled={busyId === c.id} onClick={() => toggleStatus(c)}>
                {busyId === c.id ? "Đang xử lý..." : c.status === "active" ? "Tạm Khóa" : "Mở Khóa"}
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}