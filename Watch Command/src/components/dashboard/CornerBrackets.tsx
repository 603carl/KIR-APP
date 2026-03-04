import { cn } from "@/lib/utils";

export function CornerBrackets({ className }: { className?: string }) {
    return (
        <div className={cn("absolute inset-0 pointer-events-none", className)}>
            <div className="hud-corner hud-corner-tl" />
            <div className="hud-corner hud-corner-tr" />
            <div className="hud-corner hud-corner-bl" />
            <div className="hud-corner hud-corner-br" />
        </div>
    );
}
