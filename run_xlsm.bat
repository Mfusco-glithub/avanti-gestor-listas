@echo off
echo Iniciando... > D:\Flowstica\Projects\gestor-listas\test_out.txt 2>&1
py --version >> D:\Flowstica\Projects\gestor-listas\test_out.txt 2>&1
echo --- >> D:\Flowstica\Projects\gestor-listas\test_out.txt
py D:\Flowstica\Projects\gestor-listas\read_xlsm.py >> D:\Flowstica\Projects\gestor-listas\test_out.txt 2>&1
echo Exit: %errorlevel% >> D:\Flowstica\Projects\gestor-listas\test_out.txt
echo Done >> D:\Flowstica\Projects\gestor-listas\test_out.txt
