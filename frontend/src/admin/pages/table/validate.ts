import * as yup from 'yup';

export const getValidateTableSchema = () => {
  return yup.object().shape({
    tableNo: yup
      .string()
      .trim()
      .nullable()
      .required('Số bàn không được để trống')
      .max(20, 'Số bàn không được vượt quá 20 ký tự'),
    capacity: yup
      .number()
      .required('Sức chứa bàn không được để trống')
      .min(1, 'Sức chứa tối thiểu 1 người'),
  });
};

export const validateTableNumber = (tableNo: string) => {
  return tableNo.trim().length > 0;
};
