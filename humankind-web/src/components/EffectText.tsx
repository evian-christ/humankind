import React from 'react';
import { FOOD_RESOURCE_ICON_URL, GOLD_RESOURCE_ICON_URL, KNOWLEDGE_RESOURCE_ICON_URL } from '../uiAssetUrls';

interface EffectTextProps {
    text: string;
}

type ResourceKind = 'food' | 'gold' | 'knowledge';

const getResourceKind = (word: string): ResourceKind | null => {
    if (/^(Food|식량|食物)$/iu.test(word)) return 'food';
    if (/^(Gold|골드|金币)$/iu.test(word)) return 'gold';
    if (/^(Knowledge|지식|知识)$/iu.test(word)) return 'knowledge';
    return null;
};

export const EffectText: React.FC<EffectTextProps> = ({ text }) => {
    if (!text) return null;

    const formatScaledNumber = (n: number): string => {
        const v = Math.round(n * 100) / 100;
        return Number.isInteger(v) ? String(v) : String(v);
    };

    const outline = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';

    const resourceWord = String.raw`Food|Gold|Knowledge|식량|골드|지식|食物|金币|知识`;
    const number = String.raw`[+-]?\d+(?:\.\d+)?`;
    const regex = new RegExp(
        [
            String.raw`([^:.;：。；]+[:：])`,
            String.raw`(${number})\s*(${resourceWord})`,
            String.raw`(${resourceWord})\s*(${number})`,
            String.raw`(?<![A-Za-z가-힣一-龥])(${resourceWord})(?![A-Za-z가-힣一-龥])`,
            String.raw`(?:[xX])(\d+)`,
            String.raw`(${number})`,
        ].join('|'),
        'giu',
    );

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
            numBeforeResource,
            resourceAfterNumber,
            resourceBeforeNumber,
            numAfterResource,
            standaloneResource,
            multiplierNum,
            standaloneNum,
        ] = match;

        if (condition) {
            parts.push(
                <span key={`cond-${match.index}`} style={{ color: '#8b7355', fontWeight: 'bold' }}>
                    {condition}
                </span>,
            );
        } else if (resourceAfterNumber || resourceBeforeNumber || standaloneResource) {
            const statWord = resourceAfterNumber || resourceBeforeNumber || standaloneResource;
            const kind = getResourceKind(statWord);

            let color = '#ffffff';
            let icon: React.ReactNode = '';
            if (kind === 'food') {
                color = '#22c55e';
                icon = <img src={FOOD_RESOURCE_ICON_URL} alt="" className="effect-text-food-icon" />;
            }
            if (kind === 'gold') {
                color = '#f59e0b';
                icon = <img src={GOLD_RESOURCE_ICON_URL} alt="" className="effect-text-gold-icon" />;
            }
            if (kind === 'knowledge') {
                color = '#60a5fa';
                icon = <img src={KNOWLEDGE_RESOURCE_ICON_URL} alt="" className="effect-text-knowledge-icon" />;
            }

            if (numBeforeResource) {
                const scaledStr = formatScaledNumber(Number(numBeforeResource));
                parts.push(
                    <span key={`num-resource-${match.index}`} style={{ color, fontWeight: 'bold', textShadow: outline }}>
                        {scaledStr}{icon}
                    </span>,
                );
            } else if (numAfterResource) {
                const scaledStr = formatScaledNumber(Number(numAfterResource));
                parts.push(
                    <span key={`resource-num-${match.index}`} style={{ color, fontWeight: 'bold', textShadow: outline }}>
                        {icon}{scaledStr}
                    </span>,
                );
            } else {
                parts.push(
                    <span key={`resource-${match.index}`} style={{ color, fontWeight: 'bold', textShadow: outline }}>
                        {icon}
                    </span>,
                );
            }
        } else if (multiplierNum) {
            parts.push(
                <span key={`mul-${match.index}`} style={{ color: '#e5e7eb', fontWeight: 'bold', textShadow: outline }}>
                    x{multiplierNum}
                </span>,
            );
        } else if (standaloneNum) {
            parts.push(
                <span key={`num-${match.index}`} style={{ color: '#e5e7eb', fontWeight: 'bold', textShadow: outline }}>
                    {standaloneNum}
                </span>,
            );
        }

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return <span className="effect-text-root">{parts}</span>;
};
