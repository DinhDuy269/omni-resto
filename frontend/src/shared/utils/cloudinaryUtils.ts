/**
 * Tiện ích xử lý và tối ưu hóa hình ảnh với Cloudinary
 */

export interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  quality?: string | number; // e.g. "auto", 80
  crop?: 'fill' | 'fit' | 'thumb' | 'scale' | 'limit';
  format?: 'auto' | 'webp' | 'avif' | 'jpg';
}

/**
 * Tự động tạo URL tối ưu hóa từ Cloudinary URL gốc bằng cách chèn tham số biến đổi (Transformations).
 * Giúp tải nhanh thẻ món ăn, chatbot avatar, thumbnail giỏ hàng.
 *
 * @example
 * // Trả về https://res.cloudinary.com/cloud/image/upload/f_auto,q_auto,w_400,c_fill/v1/dish.jpg
 * getOptimizedImageUrl(url, { width: 400 })
 */
export function getOptimizedImageUrl(
  url?: string | null,
  options: CloudinaryTransformOptions = {}
): string {
  if (!url || !url.trim()) {
    return '/images/food-placeholder.svg';
  }

  const cleanUrl = url.trim();

  // 1. Bỏ qua nếu không phải ảnh Cloudinary hoặc không chứa cụm '/upload/'
  if (!cleanUrl.includes('cloudinary.com') || !cleanUrl.includes('/upload/')) {
    return cleanUrl;
  }

  // 2. Kiểm tra segment ngay sau '/upload/' để tránh chèn đúp transformation
  const uploadIndex = cleanUrl.indexOf('/upload/');
  const afterUpload = cleanUrl.substring(uploadIndex + 8);
  const firstSlash = afterUpload.indexOf('/');
  if (firstSlash !== -1) {
    const firstSegment = afterUpload.substring(0, firstSlash);
    // Nếu segment đầu chứa transformation (w_, h_, c_, f_, q_ hoặc có dấu phẩy) và không phải version (v123)
    if (!firstSegment.match(/^v\d+$/) &&
        (firstSegment.includes(',') || /^[whcfq]_/.test(firstSegment) || firstSegment.includes('f_auto'))) {
      return cleanUrl;
    }
  }

  const {
    width = 400,
    height,
    quality = 'auto',
    crop = 'fill',
    format = 'auto',
  } = options;

  const transforms: string[] = [];
  transforms.push(`f_${format}`);
  transforms.push(`q_${quality}`);

  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push(`c_${crop}`);

  const transformString = transforms.join(',');
  return cleanUrl.replace('/upload/', `/upload/${transformString}/`);
}
