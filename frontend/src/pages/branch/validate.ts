import * as yup from 'yup';
import type { BranchFormData } from './types';

export const getValidateBranchSchema = () => {
  return yup.object().shape({
    code: yup
      .string()
      .trim()
      .nullable()
      .required('Mã chi nhánh không được để trống')
      .max(50, 'Mã chi nhánh không được vượt quá 50 ký tự'),
    name: yup
      .string()
      .trim()
      .nullable()
      .required('Tên chi nhánh không được để trống')
      .max(255, 'Tên chi nhánh không được vượt quá 255 ký tự'),
    address: yup
      .string()
      .trim()
      .nullable()
      .required('Địa chỉ không được để trống')
      .max(500, 'Địa chỉ không được vượt quá 500 ký tự'),
    phone: yup
      .string()
      .trim()
      .nullable()
      .test('phone-format', 'Số điện thoại không hợp lệ', (val) => !val || /^\+?\d{9,15}$/.test(val)),
  });
};

export const validateBranch = (data: Partial<BranchFormData>) => {
  try {
    getValidateBranchSchema().validateSync(data, { abortEarly: false });
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
