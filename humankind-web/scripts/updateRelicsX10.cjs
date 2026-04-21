const fs = require('fs');
const path = require('path');

const projectRoot = '/Users/chan/Documents/projects/humankind/humankind-web';

function updateRelics() {
    const files = [
        'src/game/data/relicDefinitions.ts',
        'src/i18n/index.ts',
    ];

    files.forEach(relativePath => {
        const filePath = path.join(projectRoot, relativePath);
        if (!fs.existsSync(filePath)) return;

        let content = fs.readFileSync(filePath, 'utf-8');

        // Update cost: 90 => cost: 900
        content = content.replace(/cost:\s*(\d+)/g, (match, val) => {
            return `cost: ${parseInt(val) * 10}`;
        });

        // Update "+1" or "-1" or "-5" Food/Gold/Knowledge in relic descriptions or i18n
        // e.g., "즉시 골드 +100", "골드 +5", "식량 +1", "+100 Gold", "+5 Gold"
        content = content.replace(/([+-])(\d+)\s*(Food|Gold|Knowledge|식량|골드|지식)/g, (match, sign, val, res) => {
            return `${sign}${parseInt(val) * 10} ${res}`;
        });

        // Korean specific combinations without spaces e.g. "식량 +1", "골드 +100"
        content = content.replace(/(식량|골드|지식)\s*([+-])(\d+)/g, (match, res, sign, val) => {
            return `${res} ${sign}${parseInt(val) * 10}`;
        });

        // "식량 생산량이 영구적으로 1 증가" => "식량 생산량이 영구적으로 10 증가"
        // Let's use generic numbers carefully... actually in these 2 strings:
        content = content.replace(/영구적으로 (\d+) 증가/g, (match, val) => {
            return `영구적으로 ${parseInt(val) * 10} 증가`;
        });

        // "리롤 비용 1골드 증가" -> 10골드
        content = content.replace(/비용 (\d+)골드/g, (match, val) => {
            return `비용 ${parseInt(val) * 10}골드`;
        });
        content = content.replace(/by (\d+) Gold/g, (match, val) => {
            return `by ${parseInt(val) * 10} Gold`;
        });

        fs.writeFileSync(filePath, content);
    });
}

updateRelics();
