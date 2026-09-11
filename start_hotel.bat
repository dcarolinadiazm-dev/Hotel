@echo off
title Servidor Sistema Hotelero
cd /d "%~dp0"
set PATH=%PATH%;C:\Program Files\nodejs;C:\Program Files\Git\cmd
echo ====================================================
echo   INICIANDO SERVICIO HOTEL (PRODUCCION)
echo ====================================================
npm run start:prod
