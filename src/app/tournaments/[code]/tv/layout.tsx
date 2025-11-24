export default function TVModeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <style>
        {`
          nav {
            display: none;
          }
        `}
      </style>
      {children}
    </div>
  )
}
