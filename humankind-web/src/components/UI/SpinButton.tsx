import { useGameStore } from '../../game/state/gameStore';
import './SpinButton.css';

interface SpinButtonProps {
    onSpin: () => void;
}

export function SpinButton({ onSpin }: SpinButtonProps) {
    const { isProcessing } = useGameStore();

    return (
        <button
            onClick={onSpin}
            disabled={isProcessing}
            className={`spin-button ${isProcessing ? 'disabled' : 'active'}`}
        >
            {isProcessing ? '⏳ Processing...' : '🎰 SPIN'}
        </button>
    );
}
