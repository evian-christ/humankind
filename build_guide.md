# itch.io 브라우저 빌드 가이드

이 프로젝트의 itch.io 브라우저 빌드는 `humankind-web/`의 Vite 웹 빌드를 ZIP으로 묶어서 업로드한다.

## 빈 화면 버그 방지 핵심

itch.io는 게임을 루트 도메인이 아닌 업로드된 파일 경로 아래에서 실행할 수 있다. 그래서 빌드 결과물이 `/assets/...` 같은 절대 경로를 쓰면 JS/CSS/이미지를 못 찾아서 화면이 안 나올 수 있다.

반드시 `humankind-web/vite.config.ts`의 `base` 설정을 상대 경로로 유지한다.

```ts
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
})
```

`base: './'`가 유지되면 `dist/index.html`의 asset 경로가 아래처럼 나온다.

```html
<script type="module" crossorigin src="./assets/index-....js"></script>
<link rel="stylesheet" crossorigin href="./assets/index-....css">
```

이 형태가 itch.io 브라우저 플레이에서 안전하다.

## 빌드 절차

1. 웹 프로젝트 폴더로 이동한다.

```powershell
cd C:\Users\chank\Desktop\humankind\humankind-web
```

2. TypeScript와 Vite 빌드를 실행한다.

```powershell
npm.cmd run build
```

3. 저장소 루트로 돌아와서 `dist` 내부 파일만 ZIP 루트에 들어가도록 압축한다.

```powershell
cd C:\Users\chank\Desktop\humankind
tar -a -cf release_artifacts\humankind-itch-web.zip -C humankind-web\dist .
```

중요: `humankind-web/dist` 폴더 자체를 ZIP 안에 넣으면 안 된다. itch.io가 바로 읽을 수 있도록 ZIP 루트에 `index.html`이 있어야 한다.

## 업로드 전 확인

빌드 후 아래 항목을 확인한다.

```powershell
Get-Content humankind-web\dist\index.html
tar -tf release_artifacts\humankind-itch-web.zip | Select-String 'index.html|assets/index|fonts/'
Get-FileHash release_artifacts\humankind-itch-web.zip -Algorithm SHA256
```

확인 기준:

- `dist/index.html`의 JS/CSS 경로가 `./assets/...`로 시작한다.
- ZIP 목록에 `./index.html`이 있다.
- ZIP 목록에 `./assets/index-....js`, `./assets/index-....css`가 있다.
- 폰트나 이미지처럼 런타임에 필요한 asset이 ZIP에 포함되어 있다.

## 자주 나는 문제

- `TS1117 object literal cannot have multiple properties with same name`
  - 번역 파일 같은 객체 리터럴에 중복 키가 있으면 빌드가 실패한다.
  - 특히 `humankind-web/src/i18n/*.ts`에 새 문구를 추가한 뒤 같은 키가 두 번 들어가지 않았는지 확인한다.

- itch.io에서 검은 화면 또는 빈 화면
  - `vite.config.ts`의 `base`가 `'/'`로 바뀌었는지 확인한다.
  - `dist/index.html`에서 asset 경로가 `/assets/...`로 나오면 안 된다.
  - ZIP 루트에 `index.html`이 없고 `dist/index.html`처럼 들어갔는지 확인한다.

- 로컬에서는 되는데 itch.io에서 일부 이미지나 폰트가 안 보임
  - CSS 안의 asset 경로가 상대 경로인지 확인한다.
  - ZIP에 해당 파일이 실제로 포함되어 있는지 `tar -tf`로 확인한다.

## 최종 산출물

itch.io에 업로드할 파일:

```text
C:\Users\chank\Desktop\humankind\release_artifacts\humankind-itch-web.zip
```
