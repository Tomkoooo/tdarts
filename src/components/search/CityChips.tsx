import { Badge } from "@/components/ui/Badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface CityChipsProps {
    cities: { city: string; count: number }[];
    selectedCity?: string;
    onSelectCity: (city: string | undefined) => void;
}

export function CityChips({ cities, selectedCity, onSelectCity }: CityChipsProps) {
    if (!cities?.length) return null;

    return (
        <ScrollArea className="w-full whitespace-nowrap pb-2">
            <div className="flex w-max space-x-2 p-1">
                <Badge
                    variant={!selectedCity ? "default" : "outline"}
                    className={cn(
                        "cursor-pointer px-4 py-1.5 transition-all text-sm",
                        !selectedCity ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-accent"
                    )}
                    onClick={() => onSelectCity(undefined)}
                >
                    Összes
                </Badge>
                {cities.map((item) => (
                    <Badge
                        key={item.city}
                        variant={selectedCity === item.city ? "default" : "outline"}
                        className={cn(
                            "cursor-pointer px-4 py-1.5 transition-all text-sm flex items-center gap-1.5",
                            selectedCity === item.city 
                                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                                : "hover:bg-accent border-base-300"
                        )}
                        onClick={() => onSelectCity(selectedCity === item.city ? undefined : item.city)}
                    >
                        {item.city}
                        <span className="opacity-60 text-xs ml-0.5">({item.count})</span>
                    </Badge>
                ))}
            </div>
            <ScrollBar className="h-2.5" />
        </ScrollArea>
    )
}
