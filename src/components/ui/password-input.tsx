'use client';

import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { EyeIcon, EyeOffIcon, LockIcon } from '@animateicons/react/lucide';
import { Input } from '@/components/ui/input';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <Input
        {...props}
        ref={ref}
        label={label}
        error={error}
        type={visible ? 'text' : 'password'}
        icon={<LockIcon size={18} isAnimated={false} />}
        trailing={
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            className="flex text-slate-500 transition-colors hover:text-slate-300"
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
          </button>
        }
      />
    );
  }
);
PasswordInput.displayName = 'PasswordInput';
