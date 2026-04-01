import { useSettingsStore } from '../game/state/settingsStore';
import { usePreGameStore } from '../game/state/preGameStore';
import { t } from '../i18n';

type ResourceType = 'food' | 'gold' | 'knowledge';

function ResourceWord({
  type,
  label,
}: {
  type: ResourceType;
  label: string;
}) {
  const iconMap: Record<ResourceType, string> = {
    food: '⬟',
    gold: '●',
    knowledge: '✦',
  };

  return (
    <span className={`demo-resource demo-resource--${type}`}>
      <span className="demo-resource-icon" aria-hidden="true">{iconMap[type]}</span>
      <span>{label}</span>
    </span>
  );
}

export default function DemoStartScreen() {
  const language = useSettingsStore((s) => s.language);
  const proceedToStageSelect = usePreGameStore((s) => s.proceedToStageSelect);
  const isKorean = language === 'ko';
  const resource = (type: ResourceType) => (
    <ResourceWord
      type={type}
      label={t(
        type === 'food' ? 'game.food' : type === 'gold' ? 'game.gold' : 'game.knowledge',
        language,
      )}
    />
  );

  const tutorialItems = isKorean
    ? [
        <>이 데모의 승리 조건은 레벨 15 달성입니다. 초반에는 {resource('food')} 기반과 시너지가 좋은 심볼을 차근차근 쌓으세요.</>,
        <>매 턴 <span className="demo-inline-code">SPIN</span>을 누르면 보유 심볼이 5x4 보드에 무작위로 배치되고, 효과가 자동으로 순서대로 발동합니다.</>,
        <>매 턴 효과 계산이 끝난 후, 무작위 심볼 3개 중 하나를 택하여 얻을 수 있습니다.</>,
        <>10턴마다 백성이 {resource('food')}을 요구합니다. 지불하지 못하면 즉시 패배하니, 초반에는 안정적인 운영이 가장 중요합니다.</>,
        <>{resource('food')}은 생존, {resource('gold')}는 리롤과 유물 구매, {resource('knowledge')}는 레벨을 업하여 영구 업그레이드와 시대 전환에 쓰입니다.</>,
        <>중요: 게임 시작과 함께 주어진 유물을 잘 활용하세요.</>,
      ]
    : [
        <>Victory in this demo means reaching Level 15. Early on, build a stable {resource('food')} engine and stack symbols with strong synergy.</>,
        <>Each turn, press <span className="demo-inline-code">SPIN</span>. Your owned symbols are placed randomly on the 5x4 board, and their effects resolve automatically.</>,
        <>After each turn's effects finish resolving, you may choose 1 of 3 random symbols to gain.</>,
        <>Every 10 turns, the people demand {resource('food')}. If you cannot pay, the run ends immediately, so stabilize your economy first.</>,
        <>{resource('food')} keeps you alive, {resource('gold')} pays for rerolls and relics, and {resource('knowledge')} is used to level up for permanent upgrades and era transitions.</>,
        <>Important: make good use of the relic you receive at the start of the game.</>,
      ];

  return (
    <div className="demo-start-root">
      <div className="demo-start-panel">
        <header className="demo-start-header">
          <h1 className="pregame-title demo-start-title">{t('pregame.demoTitle', language)}</h1>
        </header>

        <section className="demo-start-tutorial" aria-label={t('pregame.demoTutorialTitle', language)}>
          <h2 className="demo-start-section-title">{t('pregame.demoTutorialTitle', language)}</h2>
          <ul className="demo-start-list">
            {tutorialItems.map((item, index) => (
              <li key={index} className="demo-start-list-item">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <div className="demo-start-actions">
          <button
            type="button"
            className="pregame-card demo-start-play-button"
            onClick={proceedToStageSelect}
          >
            <span className="pregame-card-name">{t('pregame.demoPlay', language)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
