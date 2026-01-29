import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    label: string;
    value: string | number;
    subLabel: string;
    icon?: LucideIcon;
    valueColor?: string;
    iconColor?: string;
}

export const StatsCard = ({
    label,
    value,
    subLabel,
    icon: Icon,
    valueColor = "text-[#00ff41]",
    iconColor = "text-[#00ff41]"
}: StatsCardProps) => {
    return (
        <div className="border-terminal p-4 flex flex-col justify-between stat-card group min-h-[120px] transition-all hover:bg-[#00ff41]/5">
            <div className="flex justify-between items-start">
                <div className="text-[9px] opacity-40 uppercase tracking-tighter">{label}</div>
                {Icon && (
                    <Icon className={`w-3 h-3 opacity-20 group-hover:opacity-100 transition-opacity ${iconColor}`} />
                )}
            </div>
            <div className={`text-3xl font-black italic ${valueColor} break-words`}>
                {value}
            </div>
            <div className="text-[8px] opacity-30 mt-2">{subLabel}</div>
        </div>
    );
};
