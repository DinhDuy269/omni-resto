import * as yup from 'yup';

export const getValidateDashboardFilterSchema = () => {
  return yup.object().shape({
    period: yup.string().trim().required('Kỳ báo cáo không được để trống'),
  });
};

export const validateDashboardPeriod = (period: string) => {
  return period.length > 0;
};
