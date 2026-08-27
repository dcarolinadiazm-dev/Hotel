@echo off
title Servidor Sistema Hotelero
cd /d "C:\SYSplus\Hotel"
set PATH=%PATH%;C:\Program Files\nodejs;C:\Program Files\Git\cmd
echo ====================================================
echo   INICIANDO SERVICIO HOTEL (PRODUCCION)
echo ====================================================
npm start
