import * as yup from 'yup';

export const getValidateOrderCreateSchema = () => {
  return yup.object().shape({
    items: yup
      .array()
      .min(1, 'Đơn hàng phải có ít nhất 1 món ăn')
      .of(
        yup.object().shape({
          id: yup.string().required(),
          quantity: yup.number().min(1, 'Số lượng phải lớn hơn 0'),
        })
      ),
    customerName: yup
      .string()
      .trim()
      .nullable()
      .max(100, 'Tên khách hàng không được vượt quá 100 ký tự'),
  });
};

export const validateOrderSearch = (query: string) => {
  return query.trim().length >= 0;
};
