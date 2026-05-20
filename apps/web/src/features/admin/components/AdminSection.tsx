import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function AdminSection({ title, description, children }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
