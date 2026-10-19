// validate.ts

import * as yup from 'yup';

export const getValidateVoucherSchema = () => {
  return yup.object().shape({
    code: yup
      .string()
      .trim()
      .required('Mã khuyến mãi không được để trống')
      .matches(/^\S+$/, 'Mã khuyến mãi không được chứa khoảng trắng') // Chặn dấu cách
      .max(30, 'Mã không được vượt quá 30 ký tự'),
    
    name: yup
      .string()
      .trim()
      .required('Tên chương trình không được để trống'),
      
    discountValue: yup
      .number()
      .typeError('Giá trị giảm phải là số')
      .required('Vui lòng nhập giá trị giảm')
      .min(0, 'Giá trị giảm không được âm'),
      
    startDate: yup
      .date()
      .required('Vui lòng chọn ngày bắt đầu'),
      
    endDate: yup
      .date()
      .min(yup.ref('startDate'), 'Ngày kết thúc phải diễn ra sau ngày bắt đầu')
      .required('Vui lòng chọn ngày kết thúc'),
  });
};