/**
 * Utility functions for Vietnamese string normalization and search matching
 */

/**
 * Loại bỏ dấu tiếng Việt chuẩn Unicode NFD, chuyển về chữ thường và xóa khoảng trắng thừa
 * Ví dụ: "Phở Bò Tái Nạm" -> "pho bo tai nam"
 */
export const removeVietnameseTones = (str: string | null | undefined): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
    .toLowerCase()
    .trim();
};

/**
 * Kiểm tra xem một chuỗi mục tiêu (target) có khớp với từ khóa tìm kiếm (query) hay không
 * Hỗ trợ:
 * 1. Khớp có dấu lẫn không dấu (ví dụ: gõ "pho bo" khớp "Phở bò")
 * 2. Khớp đa từ khóa phân tách bởi khoảng trắng (multi-token matching)
 *    Ví dụ: "bo nam" khớp với "Phở bò tái nạm"
 */
export const matchesVietnameseSearch = (
  target: string | null | undefined,
  query: string | null | undefined
): boolean => {
  if (!query || !query.trim()) return true;
  if (!target || !target.trim()) return false;

  const rawTarget = target.toLowerCase();
  const normalizedTarget = removeVietnameseTones(target);

  const rawQuery = query.toLowerCase().trim();
  const normalizedQuery = removeVietnameseTones(query);

  // 1. Kiểm tra khớp chuỗi liên tục nhanh
  if (rawTarget.includes(rawQuery) || normalizedTarget.includes(normalizedQuery)) {
    return true;
  }

  // 2. Kiểm tra khớp tất cả các từ đơn (multi-token search)
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (queryTokens.length > 1) {
    return queryTokens.every((token) => normalizedTarget.includes(token));
  }

  return false;
};

/**
 * Kiểm tra khớp tìm kiếm trên nhiều trường thông tin của một đối tượng
 * Ví dụ: [item.name, item.description, item.category]
 */
export const matchesMultiFieldSearch = (
  fields: (string | null | undefined)[],
  query: string | null | undefined
): boolean => {
  if (!query || !query.trim()) return true;
  const combinedTarget = fields.filter(Boolean).join(' ');
  return matchesVietnameseSearch(combinedTarget, query);
};
