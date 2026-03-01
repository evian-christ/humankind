/**
 * 유물 후보 정의 — 현재 비활성화됨.
 * 모든 후보 유물은 relicDefinitions.ts 의 RELICS로 이동하거나 제거됨.
 */

import { Era } from './symbolDefinitions';

export interface RelicCandidate {
    id: number;
    name: string;
    description: string;
    cost: number;
    era: Era;
    /** 효과 유형: passive(매 스핀), on_acquire(획득 시 1회), conditional(조건부) */
    effect_type: 'passive' | 'on_acquire' | 'conditional';
    sprite: string;
}

export const RELIC_CANDIDATES: Record<number, RelicCandidate> = {};

export const RELIC_CANDIDATE_LIST = Object.values(RELIC_CANDIDATES);
