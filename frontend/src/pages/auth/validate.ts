import * as yup from 'yup';
import type { UserFormData } from './types';

export const getValidateUserSchema = () => {
  return yup.object().shape({
    fullName: yup
      .string()
      .trim()
      .nullable()
      .required('Họ tên nhân viên không được để trống')
      .max(100, 'Họ tên không được vượt quá 100 ký tự'),
    email: yup
      .string()
      .trim()
      .nullable()
      .required('Email không được để trống')
      .email('Email không hợp lệ'),
    phone: yup
      .string()
      .trim()
      .nullable()
      .required('Số điện thoại không được để trống')
      .test('phone-format', 'Số điện thoại không hợp lệ', (val) => !val || /^\+?\d{9,15}$/.test(val)),
    role: yup
      .string()
      .trim()
      .nullable()
      .required('Vai trò nhân viên không được để trống'),
  });
};

export const validateUser = (data: Partial<UserFormData>) => {
  try {
    getValidateUserSchema().validateSync(data, { abortEarly: false });
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
