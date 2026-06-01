export const colors = {
  primary: '#7C9CBF',
  primaryLight: '#A8BDD1',
  primaryDark: '#5A7A9E',
  secondary: '#B4C7E7',
  secondaryLight: '#D0DBED',
  secondaryDark: '#8FA8CF',
  accent: '#F4B8C5',
  accentLight: '#F9D4DC',
  accentDark: '#E89AAB',
  success: '#A8D5BA',
  successLight: '#C4E5CF',
  successDark: '#7FC298',
  warning: '#FFE5A0',
  warningLight: '#FFF0C2',
  warningDark: '#E6CC7A',
  danger: '#F4A8A8',
  dangerLight: '#F9CACA',
  dangerDark: '#E67A7A',
  background: '#F8F9FA',
  foreground: '#4A5568',
  white: '#FFFFFF',
  gray: {
    50: '#F8F9FA',
    100: '#F1F3F5',
    200: '#E9ECEF',
    300: '#DEE2E6',
    400: '#CED4DA',
    500: '#ADB5BD',
    600: '#868E96',
    700: '#495057',
    800: '#343A40',
    900: '#212529',
  },
};

export const statusColors = {
  pending: colors.warning,
  in_progress: colors.primary,
  completed: colors.success,
  delivered: colors.secondary,
  active: colors.success,
  expired: colors.danger,
  expiring: colors.warning,
};

export const getStatusColor = (status: string): string => {
  const color = statusColors[status as keyof typeof statusColors];
  return typeof color === 'string' ? color : colors.gray[500];
};
