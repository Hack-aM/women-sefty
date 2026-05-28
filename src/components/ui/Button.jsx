const variants = {
  primary: 'btn-primary',
  ghost:   'btn-ghost',
  danger:  'relative overflow-hidden font-semibold rounded-2xl px-6 py-3 text-white transition-all duration-300 bg-red-500 hover:bg-red-600 shadow-lg hover:shadow-red-500/40',
  success: 'relative overflow-hidden font-semibold rounded-2xl px-6 py-3 text-white transition-all duration-300 bg-emerald-500 hover:bg-emerald-600 shadow-lg hover:shadow-emerald-500/40',
};

const sizes = {
  sm:  'px-4 py-2 text-sm rounded-xl',
  md:  '',
  lg:  'px-8 py-4 text-lg rounded-2xl',
  xl:  'px-10 py-5 text-xl rounded-3xl',
};

export default function Button({
  children, variant = 'primary', size = 'md',
  fullWidth = false, loading = false, disabled = false,
  onClick, className = '', type = 'button', ...props
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
        flex items-center justify-center gap-2
      `}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </span>
      ) : children}
    </button>
  );
}
