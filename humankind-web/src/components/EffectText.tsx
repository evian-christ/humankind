import React from 'react';
import { FOOD_RESOURCE_ICON_URL, GOLD_RESOURCE_ICON_URL, KNOWLEDGE_RESOURCE_ICON_URL } from '../uiAssetUrls';

interface EffectTextProps {
    text: string;
}

export const EffectText: React.FC<EffectTextProps> = ({ text }) => {
    if (!text) return null;

    const formatScaledNumber = (n: number): string => {
        const v = Math.round(n * 100) / 100;
        return Number.isInteger(v) ? String(v) : String(v);
    };

    // 검은색 테두리 (4방향 text-shadow for visibility on light backgrounds)
    const outline = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';

    // 1: Condition (matches text ending with colon, like "파괴 시:", "바다에 인접 시:" etc)
    // 2: English Stat + Num (+20 Food)
    // 3: Korean Stat + Num (식량 +20)
    // 4: Standalone resource word only (단어 단위 — "Foods", "knowledge" 내부 등 오매칭 방지)
    // 5: Standalone number (positive/negative integer or float, or x2, x3)
    const regex = /([^:.;]+:)|([+-]?\d+)\s*(Food|Gold|Knowledge)|(식량|골드|지식)'?\s*([+-]?\d+)|(\bFood\b|\bGold\b|\bKnowledge\b|(?<![가-힣])(?:식량|골드|지식)(?![가-힣]))|(?:[xX])(\d+)|([+-]?\d+)/giu;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    let match;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        const [
            _fullMatch,
            condition,
            enNum, enStat,
            koStat, koNum,
            standaloneStat,
            multiplierNum,
            standaloneNum
        ] = match;

        if (condition) {
            // 조건문 (Condition): 기존 갈색 계열 컬러 사용
            parts.push(
                <span key={`cond-${match.index}`} style={{ color: '#8b7355', fontWeight: 'bold' }}>
                    {condition}
                </span>
            );
        } else if (enStat || koStat || standaloneStat) {
            const statWord = enStat || koStat || standaloneStat;
            const isFood = /Food|식량/i.test(statWord);
            const isGold = /Gold|골드/i.test(statWord);
            const isKnowledge = /Knowledge|지식/i.test(statWord);

            let color = '#ffffff';
            let icon: React.ReactNode = '';
            if (isFood) {
                color = '#22c55e';
                icon = (
                    <img
                        src={FOOD_RESOURCE_ICON_URL}
                        alt=""
                        className="effect-text-food-icon"
                    />
                );
            }
            if (isGold) {
                color = '#f59e0b';
                icon = (
                    <img
                        src={GOLD_RESOURCE_ICON_URL}
                        alt=""
                        className="effect-text-gold-icon"
                    />
                );
            }
            if (isKnowledge) {
                color = '#60a5fa';
                icon = (
                    <img
                        src={KNOWLEDGE_RESOURCE_ICON_URL}
                        alt=""
                        className="effect-text-knowledge-icon"
                    />
                );
            }

            if (enStat) {
                const raw = Number(enNum);
                const scaledStr = formatScaledNumber(raw);
                parts.push(
                    <span key={`en-${match.index}`} style={{ color, fontWeight: 'bold', textShadow: outline }}>
                        {scaledStr}{icon}
                    </span>
                );
            } else if (koStat) {
                const raw = Number(koNum);
                const scaledStr = formatScaledNumber(raw);
                parts.push(
                    <span key={`ko-${match.index}`} style={{ color, fontWeight: 'bold', textShadow: outline }}>
                        {icon}{scaledStr}
                    </span>
                );
            } else if (standaloneStat) {
                parts.push(
                    <span key={`st-${match.index}`} style={{ color, fontWeight: 'bold', textShadow: outline }}>
                        {icon}
                    </span>
                );
            }
        } else if (multiplierNum) {
            // 배율 표시 (예: x2, x3) -> 연회색 + 검정 테두리
            parts.push(
                <span key={`mul-${match.index}`} style={{ color: '#e5e7eb', fontWeight: 'bold', textShadow: outline }}>
                    x{multiplierNum}
                </span>
            );
        } else if (standaloneNum) {
            // 일반 숫자 -> 연회색 + 검정 테두리
            parts.push(
                <span key={`num-${match.index}`} style={{ color: '#e5e7eb', fontWeight: 'bold', textShadow: outline }}>
                    {standaloneNum}
                </span>
            );
        }

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    // Fragment 대신 단일 인라인 래퍼: 상위 flex/pre-wrap과 섞일 때 줄 단위로 깨지지 않게 함
    return <span className="effect-text-root">{parts}</span>;
};
