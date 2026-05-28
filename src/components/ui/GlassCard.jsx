const GlassCard = ({ children, className = '', onClick, style, ...props }) => {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`glass-card p-4 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
