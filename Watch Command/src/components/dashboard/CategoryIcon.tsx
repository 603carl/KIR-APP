import { cn } from "@/lib/utils";
import { IncidentCategory } from "@/types/incident";
import {
  Construction,
  Droplets,
  Heart,
  MoreHorizontal,
  Scale,
  Shield,
  Trees,
  Zap
} from "lucide-react";

interface CategoryIconProps {
  category: IncidentCategory;
  size?: 'sm' | 'md' | 'lg';
  showBackground?: boolean;
}

const categoryConfig: Record<IncidentCategory, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  colorClass: string;
  bgClass: string;
}> = {
  water: {
    icon: Droplets,
    label: 'Water',
    colorClass: 'text-category-water',
    bgClass: 'bg-category-water/20'
  },
  roads: {
    icon: Construction,
    label: 'Roads',
    colorClass: 'text-category-roads',
    bgClass: 'bg-category-roads/20'
  },
  power: {
    icon: Zap,
    label: 'Power',
    colorClass: 'text-category-power',
    bgClass: 'bg-category-power/20'
  },
  health: {
    icon: Heart,
    label: 'Health',
    colorClass: 'text-category-health',
    bgClass: 'bg-category-health/20'
  },
  security: {
    icon: Shield,
    label: 'Security',
    colorClass: 'text-category-security',
    bgClass: 'bg-category-security/20'
  },
  corruption: {
    icon: Scale,
    label: 'Corruption',
    colorClass: 'text-category-corruption',
    bgClass: 'bg-category-corruption/20'
  },
  environment: {
    icon: Trees,
    label: 'Environment',
    colorClass: 'text-category-environment',
    bgClass: 'bg-category-environment/20'
  },
  other: {
    icon: MoreHorizontal,
    label: 'Other / Custom',
    colorClass: 'text-category-other',
    bgClass: 'bg-category-other/20'
  }
};

const sizeStyles = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5'
};

const bgSizeStyles = {
  sm: 'p-1',
  md: 'p-1.5',
  lg: 'p-2'
};

export function CategoryIcon({ category, size = 'md', showBackground = false }: CategoryIconProps) {
  const config = categoryConfig[category] || categoryConfig.other;
  const Icon = config.icon;

  if (showBackground) {
    return (
      <div className={cn(
        "rounded-lg flex items-center justify-center",
        bgSizeStyles[size],
        config.bgClass
      )}>
        <Icon className={cn(sizeStyles[size], config.colorClass)} />
      </div>
    );
  }

  return <Icon className={cn(sizeStyles[size], config.colorClass)} />;
}

export function getCategoryLabel(category: IncidentCategory): string {
  return (categoryConfig[category] || categoryConfig.other).label;
}
