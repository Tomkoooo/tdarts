type Props = {
  data: unknown;
  className?: string;
};

export function AdminRawJson({ data, className }: Props) {
  return (
    <pre
      className={`bg-muted max-h-[32rem] overflow-auto rounded-lg p-4 font-mono text-xs ${className ?? ''}`}
    >
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
