# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Stack trace 가독성 유지 — Play Console / Crashlytics 에서 obfuscated trace 디코딩에 필요.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ===== Capacitor core =====
# Capacitor 7 의 PluginManager 가 reflection 으로 plugin 클래스 로드.
# strip/obfuscate 되면 PluginCallback 등록 시 ClassNotFoundException 발생.
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep @interface com.getcapacitor.annotation.** { *; }

# @CapacitorPlugin annotation 이 붙은 모든 클래스 보존 + 그 메서드/필드 reflection 호출 보장
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorPlugin <fields>;
    @com.getcapacitor.annotation.CapacitorPlugin <methods>;
}

# @PluginMethod 메서드 보존 (JS bridge 가 reflection 으로 호출)
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod <methods>;
}

# ===== Capacitor 공식 plugins =====
# @capacitor/app, @capacitor/preferences, @capacitor/push-notifications,
# @capacitor/camera, @capacitor/share, @capacitor/splash-screen, @capacitor/status-bar,
# @capacitor/filesystem 등.
-keep class com.capacitorjs.plugins.** { *; }

# ===== Cordova 호환 layer =====
-keep class org.apache.cordova.** { *; }

# ===== Firebase / Google Services =====
# Firebase Messaging Service 가 manifest 에서 reflection 으로 등록됨.
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-keep interface com.google.firebase.** { *; }
-keep interface com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# ===== AndroidX core / WebKit =====
-keep class androidx.webkit.** { *; }
-dontwarn androidx.webkit.**

# ===== JSON serialization (Capacitor 내부 + 일반) =====
# Capacitor 가 plugin call 의 in/out 을 JSON 으로 marshall — data class 가 obfuscate 되면 fail.
-keepclassmembers class * {
    public <init>(org.json.JSONObject);
}
-keep class * implements java.io.Serializable { *; }

# ===== Annotations / Attributes 보존 =====
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes EnclosingMethod
