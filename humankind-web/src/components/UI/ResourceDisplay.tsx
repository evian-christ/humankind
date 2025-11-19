import { useGameStore } from '../../game/state/gameStore';
import './ResourceDisplay.css';

export function ResourceDisplay() {
    const { food, gold, exp, level, turn } = useGameStore();

    return (
        <div className="resource-display">
            <div className="resource-item">
                <span className="resource-icon">🍞</span>
                <div className="resource-info">
                    <div className="resource-label">Food</div>
                    <div className="resource-value food">{food}</div>
                </div>
            </div>

            <div className="resource-item">
                <span className="resource-icon">💰</span>
                <div className="resource-info">
                    <div className="resource-label">Gold</div>
                    <div className="resource-value gold">{gold}</div>
                </div>
            </div>

            <div className="resource-item">
                <span className="resource-icon">⭐</span>
                <div className="resource-info">
                    <div className="resource-label">EXP</div>
                    <div className="resource-value exp">{exp}</div>
                </div>
            </div>

            <div className="resource-item">
                <span className="resource-icon">📊</span>
                <div className="resource-info">
                    <div className="resource-label">Level</div>
                    <div className="resource-value level">{level}</div>
                </div>
            </div>

            <div className="resource-item">
                <span className="resource-icon">🔄</span>
                <div className="resource-info">
                    <div className="resource-label">Turn</div>
                    <div className="resource-value turn">{turn}</div>
                </div>
            </div>
        </div>
    );
}
