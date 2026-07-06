@echo off
REM =====================================================
REM  Avanti Gestor de Listas — Setup en Windows
REM  Ejecutar desde la carpeta del proyecto
REM =====================================================

echo.
echo  ╔═══════════════════════════════════════╗
echo  ║   Avanti Gestor de Listas de Precios  ║
echo  ║           Setup inicial               ║
echo  ╚═══════════════════════════════════════╝
echo.

REM Verificar Node.js
node --version >nul 2>&1
IF ERRORLEVEL 1 (
  echo [ERROR] Node.js no encontrado. Instalar desde https://nodejs.org
  pause
  exit /b 1
)
echo [OK] Node.js:
node --version

REM Instalar dependencias
echo.
echo [1/4] Instalando dependencias npm...
npm install
IF ERRORLEVEL 1 (
  echo [ERROR] Fallo npm install
  pause
  exit /b 1
)
echo [OK] Dependencias instaladas

REM Crear .env.local si no existe
echo.
echo [2/4] Configurando variables de entorno...
IF NOT EXIST .env.local (
  copy .env.example .env.local
  echo [OK] Creado .env.local — EDITARLO con los valores reales de Supabase
  echo      Ver instrucciones en SETUP.md
) ELSE (
  echo [OK] .env.local ya existe
)

REM Inicializar Git
echo.
echo [3/4] Inicializando repositorio Git...
IF NOT EXIST .git (
  git init
  git branch -m main
  git add -A
  git commit -m "feat: setup inicial avanti-gestor-listas

  - Next.js 14 con App Router y TypeScript
  - Supabase Auth + RLS en todas las tablas gl_
  - 10 tablas gl_ creadas en proyecto avanti-comercial
  - Seed: 1 tenant, 13 cadenas, 362 SKUs, 6 reglas
  - Wizard 3 pasos: calculo, listas, envio
  - Generadores Excel: generico, PedidosYa, GDU, Kinko
  - Dashboard con posicionamiento vs competencia
  - Modulo email con Resend"
  echo [OK] Repositorio Git inicializado con commit inicial
) ELSE (
  echo [OK] Git ya inicializado
)

REM Instrucciones finales
echo.
echo [4/4] Listo!
echo.
echo ═══════════════════════════════════════════════════
echo  PRÓXIMOS PASOS:
echo.
echo  1. Editar .env.local con las keys de Supabase:
echo     https://supabase.com/dashboard/project/lnldlsslkorjilmiumrj/settings/api
echo.
echo  2. Crear usuario admin en Supabase (ver SETUP.md)
echo.
echo  3. Correr el proyecto:
echo     npm run dev
echo     Abrir: http://localhost:3000
echo.
echo  4. Para subir a GitHub:
echo     gh repo create avanti-gestor-listas --private
echo     git remote add origin https://github.com/TU-USUARIO/avanti-gestor-listas
echo     git push -u origin main
echo ═══════════════════════════════════════════════════
echo.
pause
