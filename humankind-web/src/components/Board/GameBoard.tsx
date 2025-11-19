import { useEffect, useRef } from 'react';
import { BoardRenderer } from '../../renderer/BoardRenderer';
import './GameBoard.css';

export function GameBoard() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<BoardRenderer | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Initialize renderer
        rendererRef.current = new BoardRenderer(canvasRef.current);

        // Test: highlight a few cells and add placeholder symbols
        setTimeout(() => {
            if (rendererRef.current) {
                rendererRef.current.highlightCell(0, 0, true);
                rendererRef.current.addSymbolSprite(1, 1, 'wheat');
                rendererRef.current.addSymbolSprite(2, 2, 'sword');
            }
        }, 500);

        // Cleanup
        return () => {
            if (rendererRef.current) {
                rendererRef.current.destroy();
            }
        };
    }, []);

    return (
        <div className="game-board">
            <canvas ref={canvasRef} />
        </div>
    );
}
