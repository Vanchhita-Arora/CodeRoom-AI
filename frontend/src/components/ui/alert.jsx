import React from 'react';
import { clsx } from 'clsx';

const Alert = React.forwardRef(({ className, variant = 'default', ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={clsx(
      'relative w-full rounded-lg border p-4',
      {
        'bg-white border-gray-200': variant === 'default',
        'border-red-200 bg-red-50 text-red-900': variant === 'destructive',
      },
      className
    )}
    {...props}
  />
));

Alert.displayName = 'Alert';

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
));

AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertDescription };