; Script for QtWebEngine version of UTMka
; This version uses QtWebEngine instead of PyWebView

#define MyAppName "UTMka (QtWebEngine)"
#define MyAppVersion "2.0"
#define MyAppPublisher "UTMka Team"
#define MyAppExeName "UTMka_QtWebEngine.exe"

[Setup]
; NOTE: The value of AppId uniquely identifies this application. Do not use the same AppId value in installers for other applications.
AppId={{B9F69767-7223-4194-A5D1-970E45079964}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=.
OutputBaseFilename=UTMka_QtWebEngine_Setup
SetupIconFile=logo\logoutm.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1; Check: not IsAdminInstallMode

[Files]
; IMPORTANT: Run build_qtwebengine.py BEFORE compiling this script to generate the EXE!
Source: "dist_qtwebengine\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon; IconFilename: "{app}\{#MyAppExeName}"
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: quicklaunchicon; IconFilename: "{app}\{#MyAppExeName}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
procedure InitializeWizard;
begin
  // Проверка наличия exe файла перед установкой
  if not FileExists(ExpandConstant('{src}\dist_qtwebengine\{#MyAppExeName}')) then
  begin
    MsgBox('Ошибка: Файл ' + ExpandConstant('{src}\dist_qtwebengine\{#MyAppExeName}') + ' не найден!' + #13#10 + 
           'Пожалуйста, сначала запустите build_qtwebengine.py для создания исполняемого файла.', mbError, MB_OK);
    Abort;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    // Создаем папку downloads после установки
    CreateDir(ExpandConstant('{app}\downloads'));
  end;
end;

