import Link from 'next/link';
import { ReactNode } from 'react';

import { ChevronRight, LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export interface BadgeItem {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  value: string;
  valueColor?: string;
}

interface LinkCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  badges?: BadgeItem[];
  actions?: ReactNode;
}

export function LinkCard({
  href,
  icon: Icon,
  title,
  description,
  badges,
  actions,
}: LinkCardProps) {
  return (
    <Link href={href} className="group">
      <Card className="hover:border-primary/30 h-full gap-2 transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
                <Icon className="text-primary size-5" />
              </div>
              <div>
                <CardTitle className="group-hover:text-primary transition-colors">
                  {title}
                </CardTitle>
                {description && (
                  <CardDescription className="text-xs">
                    {description}
                  </CardDescription>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <ChevronRight className="text-muted-foreground size-5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </CardHeader>
        {badges && badges.length > 0 && (
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <div
                  key={badge.label}
                  className="bg-muted flex items-center gap-2 rounded-full px-3 py-1.5"
                >
                  <badge.icon className={cn('size-4', badge.iconColor)} />
                  <span className="text-sm">
                    <span className="text-muted-foreground">
                      {badge.label}:
                    </span>{' '}
                    <span className={cn('font-semibold', badge.valueColor)}>
                      {badge.value}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
