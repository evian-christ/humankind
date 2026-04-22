export interface EraTransitionInput {
    level: number;
    knowledge: number;
    /** 이번 턴에 추가되는 지식(기본 생산+효과+보너스까지 합산된 최종치) */
    deltaKnowledge: number;
    getEraFromLevel: (level: number) => number;
}

export interface EraTransitionOutput {
    newLevel: number;
    newEra: number;
    newKnowledge: number;
    gainedResearchPicks: number;
}

export function applyKnowledgeAndLevelUps(args: EraTransitionInput, getKnowledgeRequiredForLevel: (level: number) => number): EraTransitionOutput {
    let newLevel = args.level;
    let newKnowledge = args.knowledge + args.deltaKnowledge;
    let gainedResearchPicks = 0;

    while (newLevel < 30) {
        const required = getKnowledgeRequiredForLevel(newLevel);
        if (newKnowledge < required) break;
        newKnowledge -= required;
        newLevel++;
        gainedResearchPicks += 1;
    }

    const newEra = args.getEraFromLevel(newLevel);
    return { newLevel, newEra, newKnowledge, gainedResearchPicks };
}

