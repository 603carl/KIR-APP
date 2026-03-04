import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Download, X, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";

interface ImageViewerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imageUrl: string | null;
}

export function ImageViewerDialog({ open, onOpenChange, imageUrl }: ImageViewerDialogProps) {
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    if (!imageUrl) return null;

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 4));
    const handleZoomOut = () => {
        setZoom(prev => {
            const next = Math.max(prev - 0.5, 1);
            if (next === 1) setPosition({ x: 0, y: 0 }); // Reset position on reset zoom
            return next;
        });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoom > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && zoom > 1) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => setIsDragging(false);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[90vw] h-[90vh] p-0 border-none bg-black/95 text-white overflow-hidden flex flex-col items-center justify-center">
                {/* Controls */}
                <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                    <Button variant="secondary" size="icon" onClick={handleZoomIn} className="rounded-full bg-black/50 hover:bg-black/70 border border-white/10 text-white">
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon" onClick={handleZoomOut} className="rounded-full bg-black/50 hover:bg-black/70 border border-white/10 text-white">
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <a href={imageUrl} download target="_blank" rel="noreferrer">
                        <Button variant="secondary" size="icon" className="rounded-full bg-black/50 hover:bg-black/70 border border-white/10 text-white">
                            <Download className="h-4 w-4" />
                        </Button>
                    </a>
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full hover:bg-white/20 text-white">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Image Container */}
                <div
                    className="w-full h-full flex items-center justify-center cursor-move overflow-hidden"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <img
                        src={imageUrl}
                        alt="Evidence Fullscreen"
                        className="max-h-full max-w-full object-contain transition-transform duration-100 ease-out select-none"
                        style={{
                            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                        }}
                        draggable={false}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
