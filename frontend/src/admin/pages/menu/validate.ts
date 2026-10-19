import * as yup from 'yup';
import type { MenuItemFormData } from './types';

export const getValidateMenuItemSchema = () => {
  return yup.object().shape({
    code: yup
      .string()
      .trim()
      .nullable()
      .required('Mã món không được để trống')
      .max(50, 'Mã món không được vượt quá 50 ký tự'),
    name: yup
      .string()
      .trim()
      .nullable()
      .required('Tên món không được để trống')
      .max(255, 'Tên món không được vượt quá 255 ký tự'),
    base_price: yup
      .number()
      .required('Giá bán không được để trống')
      .min(1000, 'Giá bán phải lớn hơn 1,000 đ'),
    description: yup
      .string()
      .trim()
      .nullable()
      .max(500, 'Mô tả không được vượt quá 500 ký tự'),
  });
};

export const validateMenuItem = (data: Partial<MenuItemFormData>) => {
  try {
    getValidateMenuItemSchema().validateSync(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (err: unknown) {
    const errors: Record<string, string> = {};
    if (err instanceof yup.ValidationError) {
      err.inner.forEach((e) => {
        if (e.path) errors[e.path] = e.message;
      });
    }
    return { isValid: false, errors };
  }
};
