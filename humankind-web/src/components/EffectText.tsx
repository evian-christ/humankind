import React from 'react';

interface EffectTextProps {
    text: string;
}

export const EffectText: React.FC<EffectTextProps> = ({ text }) => {
    if (!text) return null;

    // 1: Condition (matches start of sentence up to colon)
    // 2 & 3: English Num + Stat (+20 Food)
    // 4 & 5: Korean Stat + Num (식량 +20)
    // 6: Standalone Stat (Food/Gold/Knowledge)
    // 7: HP/ATK/체력/공격력 + Num  (e.g. "HP +10", "체력 +3")
    // 8: Standalone Num
    const regex = /((?:^|\.\s+)[^.]{2,40}?:)|([+-]?\d+)\s*(Food|Gold|Knowledge)|(식량|골드|지식)\s*([+-]?\d+)|(Food|Gold|Knowledge|식량|골드|지식)|(HP|ATK|체력|공격력)\s*([+-]?\d+)|([+-]?\d+)/gi;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // 검은색 테두리 (4방향 text-shadow for visibility on light backgrounds)
    const outline = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';

    let match;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        const [
            fullMatch,
            condition,
            enNum, enStat,
            koStat, koNum,
            standaloneStat,
            hpAtkStat, hpAtkNum,
            standaloneNum
        ] = match;

        if (condition) {
            let prefix = "";
            let core = condition;
            if (core.startsWith(". ")) {
                prefix = ". ";
                core = core.slice(2);
            }
            if (prefix) parts.push(prefix);
            parts.push(
                <span key={`cond-${match.index}`} style={{ color: '#8b7355', fontWeight: 'bold' }}>
                    {core}
                </span>
            );
        } else if (enStat || koStat || standaloneStat) {
            const statWord = enStat || koStat || standaloneStat;
            const isFood = /Food|식량/i.test(statWord);
            const isGold = /Gold|골드/i.test(statWord);
            const isKnowledge = /Knowledge|지식/i.test(statWord);

            let color = '#ffffff';
            let icon = '';
            if (isFood) { color = '#22c55e'; icon = '⬟'; }
            if (isGold) { color = '#f59e0b'; icon = '●'; }
            if (isKnowledge) { color = '#60a5fa'; icon = '✦'; }

            if (enStat) {
                parts.push(
                    <span key={`en-${match.index}`} style={{ color, fontWeight: 'bold', textShadow: outline }}>
                        {enNum} {icon}
                    </span>
                );
            } else if (koStat) {
                parts.push(
                    <span key={`ko-${match.index}`} style={{ color, fontWeight: 'bold', textShadow: outline }}>
                        {icon} {koNum}
                    </span>
                );
            } else if (standaloneStat) {
                parts.push(
                    <span key={`st-${match.index}`} style={{ color, fontWeight: 'bold', textShadow: outline }}>
                        {icon}
                    </span>
                );
            }
        } else if (hpAtkStat) {
            // HP / ATK / 체력 / 공격력: 키워드는 원래 색 유지, 숫자만 진한 회색으로 강조
            parts.push(hpAtkStat);
            parts.push(' ');
            parts.push(
                <span key={`hpatk-${match.index}`} style={{ color: '#555555', fontWeight: 'bold' }}>
                    {hpAtkNum}
                </span>
            );
        } else if (standaloneNum) {
            parts.push(
                <span key={`num-${match.index}`} style={{ color: '#555555', fontWeight: 'bold' }}>
                    {standaloneNum}
                </span>
            );
        }

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return <>{parts}</>;
};
