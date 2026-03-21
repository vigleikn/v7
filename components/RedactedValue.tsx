import React from 'react';

interface RedactedValueProps {
  value: React.ReactNode;
  isRedacted: boolean;
  className?: string;
}

export const RedactedValue: React.FC<RedactedValueProps> = ({
  value,
  isRedacted,
  className = '',
}) => {
  if (!isRedacted) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span
      className={`${className} select-none rounded-sm`}
      style={{ color: 'transparent', backgroundColor: '#1f2937' }}
      aria-hidden="true"
    >
      {value}
    </span>
  );
};
