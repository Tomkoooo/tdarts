// Label komponens
const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({
    children,
    className = "",
    ...props
  }) => {
    return (
      <label className={`label flex items-center gap-2 text-base-content font-medium ${className}`} {...props}>
        {children}
      </label>
    );
  };

  export default Label;