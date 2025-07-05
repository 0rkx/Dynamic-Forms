@echo off
REM Script to generate favicon PNG files from SVG
REM This script requires ImageMagick to be installed
REM Download from https://imagemagick.org/script/download.php

echo Generating favicon PNG files from SVG...

REM Check if ImageMagick is installed
where convert >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: ImageMagick is not installed. Please install it first.
    echo Download from https://imagemagick.org/script/download.php
    echo Make sure to add it to your PATH
    pause
    exit /b 1
)

REM Check if favicon.svg exists
if not exist "public\favicon.svg" (
    echo Error: public\favicon.svg not found!
    pause
    exit /b 1
)

REM Create the PNG files
echo Creating favicon-16x16.png...
convert public\favicon.svg -resize 16x16 public\favicon-16x16.png

echo Creating favicon-32x32.png...
convert public\favicon.svg -resize 32x32 public\favicon-32x32.png

echo Creating apple-touch-icon.png (180x180)...
convert public\favicon.svg -resize 180x180 public\apple-touch-icon.png

echo Creating additional sizes for better compatibility...
convert public\favicon.svg -resize 192x192 public\android-chrome-192x192.png
convert public\favicon.svg -resize 512x512 public\android-chrome-512x512.png

echo.
echo ✅ All favicon files generated successfully!
echo.
echo Generated files:
echo - public\favicon-16x16.png
echo - public\favicon-32x32.png
echo - public\apple-touch-icon.png
echo - public\android-chrome-192x192.png
echo - public\android-chrome-512x512.png
echo.
echo Don't forget to:
echo 1. Update the domain URLs in all SEO files
echo 2. Create an og-image.jpg (1200x630) for social media sharing
echo 3. Test the favicon display in various browsers
echo.
pause 