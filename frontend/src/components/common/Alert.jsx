import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

const variants = {
  success: {
    icon: CheckCircle,
    classes: 'bg-green-50 text-green-800 border-green-200'
  },
  error: {
    icon: XCircle,
    classes: 'bg-red-50 text-red-800 border-red-200'
  },
  warning: {
    icon: AlertCircle,
    classes: 'bg-yellow-50 text-yellow-800 border-yellow-200'
  },
  info: {
    icon: Info,
    classes: 'bg-blue-50 text-blue-800 border-blue-200'
  }
};

export default function Alert({
  variant = 'info',
  title,
  message,
  className = '',
  onClose
}) {
  const { icon: Icon, classes } = variants[variant];

  return (
    <div
      className={`
        flex items-start p-4
        border rounded-lg
        ${classes}
        ${className}
      `}
      role="alert"
    >
      <Icon className="h-5 w-5 mt-0.5" />
      <div className="ml-3 flex-1">
        {title && (
          <h3 className="text-sm font-medium">
            {title}
          </h3>
        )}
        {message && (
          <div className="text-sm mt-1">
            {message}
          </div>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-auto -mx-1.5 -my-1.5 p-1.5 hover:opacity-70 rounded-lg focus:ring-2 focus:ring-offset-2"
        >
          <span className="sr-only">Dismiss</span>
          <XCircle className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}