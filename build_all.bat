@echo off
setlocal enabledelayedexpansion

REM Set up environment variables for Node.js
SET NODE_PATH=C:\Program Files\nodejs;%NODE_PATH%
SET PATH=%NODE_PATH%;C:\Users\PC\AppData\Roaming\.npm-global\bin;%PATH%

echo Installing required Node.js packages...
call npm install
call npm install --save-dev electron-packager

echo Building desktop setup...
call npx electron-packager . "NELLY TV Setup 2.0.0" --out=dist --overwrite

if not exist build_outputs mkdir build_outputs

echo Building Android App...
if exist android (
    cd android
    call gradlew assembleRelease
    cd ..
    if exist android\app\build\outputs\apk\release\*.apk move /y android\app\build\outputs\apk\release\*.apk build_outputs\
) else (
    echo No Android folder found!
)

echo Done! Desktop app generated in /dist, Android APK generated in /build_outputs!
endlocal