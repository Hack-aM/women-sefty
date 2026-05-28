import { forwardRef } from 'react';

const Input = forwardRef(({
  label, error, icon: Icon, rightElement,
  className = '', type = 'text', ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            <Icon size={18} />
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={`
            input-field
            ${Icon ? 'pl-11' : ''}
            ${rightElement ? 'pr-12' : ''}
            ${error ? 'border-red-500/50 focus:border-red-500 focus:shadow-none' : ''}
            ${className}
          `}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-400 ml-1">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
