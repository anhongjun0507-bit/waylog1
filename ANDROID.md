# Android 빌드 가이드 (Capacitor)

이 앱은 [Capacitor](https://capacitorjs.com/) 로 Android 네이티브 앱으로 포장됩니다.
현재 `com.waylog.app` 패키지명으로 설정되어 있습니다 (`capacitor.config.json`).

---

## 1. 사전 준비

| 항목 | 버전 | 설치 |
|---|---|---|
| Node.js | 18+ | 이미 설치됨 |
| Java JDK | 17 | `brew install openjdk@17` / adoptium.net |
| Android Studio | 최신 | [developer.android.com/studio](https://developer.android.com/studio) |
| Android SDK | API 34 (Android 14) | Android Studio → SDK Manager |

환경변수 설정 (bash/zsh):

```bash
# ~/.zshrc 또는 ~/.bashrc
export JAVA_HOME=$(/usr/libexec/java_home -v 17)            # macOS
export ANDROID_HOME=$HOME/Library/Android/sdk               # macOS
# Linux: export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
```

---

## 2. 최초 세팅 (1회)

```bash
# 프로젝트 루트에서
npm install                                 # Capacitor 플러그인 포함 전체 의존성
npm run build                               # dist/ 생성
npx cap add android                         # android/ 디렉터리 생성 (1회)
npx cap sync android                        # dist → android/app/src/main/assets/public
```

이후 `android/` 디렉터리가 생기며, Gradle 프로젝트로 Android Studio 에서 열 수 있습니다.

---

## 3. 개발 & 테스트

### 3-1. 에뮬레이터 또는 실기기
```bash
# USB 디버깅 켠 기기 연결 또는 AVD 시작 후
npm run android:dev          # 빌드 + 설치 + 실행
```

### 3-2. Android Studio 로 열기
```bash
npm run android:open         # 빌드 + sync + Studio 실행
# 이후 ▶ 버튼으로 실행, 로그캣으로 WebView 콘솔 확인
```

### 3-3. 웹에서 핫리로드 개발
웹 개발은 여전히 `npm run dev` 로 가능. 네이티브 기능이 필요한 것만 에뮬레이터에서 테스트하세요.

---

## 4. 릴리스 빌드 (AAB — Play Store 업로드용)

### 4-1. 서명 키 생성 (1회, 안전 백업 필수)

```bash
keytool -genkey -v \
  -keystore ~/waylog-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias waylog
```

비밀번호 + 정보 입력 → `.jks` 파일 생성. **절대 분실하지 마세요** (분실 시 앱 업데이트 불가).

> 💡 **Play App Signing** 사용 권장: Google 이 서명키를 보관해주고, 개발자는 업로드 키만 관리. Play Console 에서 활성화하면 분실 위험 0.

### 4-2. `android/keystore.properties` 생성 (gitignore 대상)

```properties
storeFile=/Users/you/waylog-release.jks
storePassword=<생성시 입력한 비밀번호>
keyAlias=waylog
keyPassword=<키 비밀번호>
```

### 4-3. `android/app/build.gradle` 에 signing 설정 추가
(Capacitor 가 기본으로 signingConfig 스텁을 만들어주지만, 아래처럼 keystore.properties 를 읽는 로직 추가)

```gradle
// 파일 상단
def keystoreProps = new Properties()
def keystoreFile = rootProject.file("keystore.properties")
if (keystoreFile.exists()) keystoreProps.load(new FileInputStream(keystoreFile))

android {
    // ... 생성된 내용 ...
    signingConfigs {
        release {
            if (keystoreFile.exists()) {
                storeFile file(keystoreProps['storeFile'])
                storePassword keystoreProps['storePassword']
                keyAlias keystoreProps['keyAlias']
                keyPassword keystoreProps['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 4-4. 릴리스 AAB 빌드

```bash
npm run android:release
# → android/app/build/outputs/bundle/release/app-release.aab
```

이 `.aab` 파일을 Play Console 에 업로드합니다.

---

## 5. 아이콘 & 스플래시

### 5-1. 리소스 생성 도구 (추천)

[capacitor-assets](https://github.com/ionic-team/capacitor-assets) 사용 — 한 번에 모든 사이즈 자동 생성:

```bash
npm install --save-dev @capacitor/assets
mkdir -p resources

# 아래 2개 파일만 resources/ 에 두면 됨
#   resources/icon.png       1024×1024 (여백 없이 꽉 차게)
#   resources/splash.png     2732×2732 (중앙 로고, 배경은 단색)
#   resources/icon-foreground.png  1024×1024 (투명 배경, 로고만)
#   resources/icon-background.png  1024×1024 (배경색만)

npx capacitor-assets generate --android
```

생성 결과는 `android/app/src/main/res/mipmap-*`, `drawable-*` 에 자동 배치.

### 5-2. 무료 디자인 도구
- [icon.kitchen](https://icon.kitchen) — 무료, 웹에서 바로 다운로드
- [Figma](https://figma.com) — 무료 플랜
- [maskable.app](https://maskable.app/editor) — adaptive icon 편집

### 5-3. 현재 브랜드 컬러
```
primary:     #10b981 (emerald-500)
background:  #ffffff  / 다크모드 #0b0f19
```

---

## 6. Play Console 제출 체크리스트

| 항목 | 완료 |
|---|---|
| 개발자 계정 등록 ($25 결제 완료) | ☐ |
| 앱 이름: "웨이로그" | ☐ |
| 짧은 설명 (80자 이하) | ☐ |
| 자세한 설명 (4000자 이하) | ☐ |
| 아이콘 512×512 PNG | ☐ |
| 피처 그래픽 1024×500 PNG | ☐ |
| 스크린샷 최소 2장 (1080×1920 이상) | ☐ |
| 개인정보 처리방침 URL | ☐ (`/privacy.html` 호스팅 필요) |
| 콘텐츠 등급 질문지 | ☐ |
| 대상 연령 (만 13세 이상 권장) | ☐ |
| 광고 포함 여부 | ☐ (없음 선택) |
| 앱 카테고리 (라이프스타일) | ☐ |
| AAB 업로드 | ☐ |
| 내부 테스트 트랙 → 비공개 테스트 → 프로덕션 | ☐ |

### 6-1. 심사 대응 유의사항
- **Amway 상표**: 제품명을 앱 내에서 직접 표기하는 경우, 상표권자 허가 증명 또는 "개인 사용자용 기록 도구" 명시
- **푸시 알림**: 첫 요청 전 앱 내 설명 화면 필수 (Google Play 권고)
- **민감 권한**: 이 앱은 카메라/저장소만 사용 (문제 없음)
- **데이터 수집 선언**: Play Console → 앱 콘텐츠 → "데이터 보안" 양식 정확히 기재

---

## 7. 문제 해결

### 빌드 실패: `SDK location not found`
→ `android/local.properties` 에 `sdk.dir=/Users/you/Library/Android/sdk` 추가

### 빌드 실패: `Unsupported Java version`
→ JDK 17 사용 중인지 확인: `java -version`

### WebView 에서 Claude 호출 실패
→ `capacitor.config.json` 의 `server.allowNavigation` 에 Supabase 도메인 추가:
```json
"server": {
  "androidScheme": "https",
  "allowNavigation": ["*.supabase.co"]
}
```

### 푸시 알림 미동작
→ Firebase 프로젝트 생성 후 `google-services.json` 을 `android/app/` 에 배치.
Capacitor 는 FCM 을 사용하므로 Firebase 필수 (Play Console VAPID 는 웹 전용).

---

## 8. 다음 단계

Android 안정화 후 iOS:
```bash
npm install @capacitor/ios
npx cap add ios
npx cap sync ios
npx cap open ios    # Xcode 로 열림
```

iOS 는 Apple Developer Account ($99/년) + Xcode(macOS) 필요.
