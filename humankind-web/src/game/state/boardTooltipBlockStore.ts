import { create } from 'zustand';

/** 풀스크린·전면 UI가 열려 있을 때 보드 호버 툴팁을 막기 위한 등록 테이블 */
export const useBoardTooltipBlockStore = create<{
    ids: string[];
    addBlock: (id: string) => void;
    removeBlock: (id: string) => void;
}>((set, get) => ({
    ids: [],
    addBlock: (id) => {
        const cur = get().ids;
        if (cur.includes(id)) return;
        set({ ids: [...cur, id] });
    },
    removeBlock: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
}));
