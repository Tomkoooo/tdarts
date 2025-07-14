// Input komponens
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
    className = "",
    ...props
  }) => {
    return (
      <input
        className={`input input-bordered w-full bg-base-300/50 focus:bg-base-300/80 transition-colors ${className}`}
        {...props}
      />
    );
  };

  export default Input;