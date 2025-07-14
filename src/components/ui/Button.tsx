// Button komponens
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "outline" | "ghost";
    className?: string;
  }> = ({ children, variant = "primary", className = "", ...props }) => {
    const baseStyles = "btn flex items-center gap-2 font-medium transition-all";
    const variantStyles = {
      primary: "btn-primary",
      outline: "btn-outline border-base-content/20 hover:bg-base-content/10",
      ghost: "btn-ghost",
    };
    return (
      <button
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  };

  export default Button