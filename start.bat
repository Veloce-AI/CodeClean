@echo off
setlocal
set PORT=3847
set DIR=%~dp0

echo.
echo  ========================================
echo    CodeClean - Code Quality Analyzer
echo  ========================================
echo.

:: Try Python 3
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo  Starting with Python 3 on port %PORT%...
    start "" http://localhost:%PORT%
    python -m http.server %PORT% --directory "%DIR%" --bind 127.0.0.1
    goto :end
)

:: Try Python 2
python2 --version >nul 2>&1
if %errorlevel% equ 0 (
    echo  Starting with Python 2 on port %PORT%...
    start "" http://localhost:%PORT%
    cd /d "%DIR%" && python2 -m SimpleHTTPServer %PORT%
    goto :end
)

:: Try Node http-server
npx --yes http-server "%DIR%" -p %PORT% -o --silent >nul 2>&1
if %errorlevel% equ 0 goto :end

:: Try Node built-in
node -e "require('http')" >nul 2>&1
if %errorlevel% equ 0 (
    echo  Starting with Node.js on port %PORT%...
    node -e "const h=require('http'),f=require('fs'),p=require('path');h.createServer((q,r)=>{let fp=p.join('%DIR%'.replace(/\\/g,'/'),q.url==='/'?'index.html':q.url);try{r.end(f.readFileSync(fp));}catch(e){r.writeHead(404);r.end();}}).listen(%PORT%);console.log('Serving on http://localhost:%PORT%');"
    start "" http://localhost:%PORT%
    goto :end
)

:: Fallback — open directly (Firefox only)
echo  No server found. Opening directly (Firefox only).
echo  For Chrome/Edge: install Python 3 or Node.js.
echo.
start "" "%DIR%index.html"

:end
endlocal
