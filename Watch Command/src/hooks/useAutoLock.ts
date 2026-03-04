import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useEffect, useRef } from "react";

export function useAutoLock(timeoutMinutes: number = 10) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { signOut } = useAuth();
    const { toast } = useToast();

    const resetTimer = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (timeoutMinutes > 0) {
            timeoutRef.current = setTimeout(async () => {
                toast({
                    title: "System Locked",
                    description: "Session terminated due to inactivity. Credentials required.",
                    variant: "destructive"
                });
                await signOut();
            }, timeoutMinutes * 60 * 1000);
        }
    }, [timeoutMinutes, signOut, toast]);

    useEffect(() => {
        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];

        const handleActivity = () => {
            resetTimer();
        };

        events.forEach((event) => {
            window.addEventListener(event, handleActivity);
        });

        resetTimer();

        return () => {
            events.forEach((event) => {
                window.removeEventListener(event, handleActivity);
            });
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [resetTimer]);

    const lock = async () => {
        await signOut();
    };

    return { lock, resetTimer };
}
