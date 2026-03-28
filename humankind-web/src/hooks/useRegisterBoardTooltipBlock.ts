import { useEffect } from 'react';
import { useBoardTooltipBlockStore } from '../game/state/boardTooltipBlockStore';

/** `active`인 동안 id를 등록하고, 해제 시 또는 언마운트 시 제거 */
export function useRegisterBoardTooltipBlock(id: string, active: boolean) {
    const addBlock = useBoardTooltipBlockStore((s) => s.addBlock);
    const removeBlock = useBoardTooltipBlockStore((s) => s.removeBlock);
    useEffect(() => {
        if (!active) return;
        addBlock(id);
        return () => removeBlock(id);
    }, [active, id, addBlock, removeBlock]);
}
