; UTMka Installer Script
; Inno Setup 6.x

#define MyAppName "UTMka"
#define MyAppVersion "2.1.1"
#define MyAppPublisher "UTMka"
#define MyAppURL "https://utmka.ru"
#define MyAppExeName "UTMka.exe"

[Setup]
; Уникальный ID приложения (генерируется один раз!)
AppId={{0F293E65-2450-42B0-BC01-A90E29F64D0D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; Пути установки
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes

; Выходной файл
OutputDir=..\..\dist
OutputBaseFilename=UTMka-Setup-{#MyAppVersion}

; Сжатие
Compression=lzma2/ultra64
SolidCompression=yes

; Внешний вид
WizardStyle=modern
SetupIconFile=..\..\logo\logoutm.ico
UninstallDisplayIcon={app}\{#MyAppExeName}

; Требования
MinVersion=10.0
PrivilegesRequired=admin
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64

; Автообновления
CloseApplications=force
RestartApplications=yes

; Лицензия (опционально)
; LicenseFile=LICENSE.txt

[Languages]
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Основные файлы приложения
Source: "..\..\dist\UTMka\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Ярлыки
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Удалить {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; Запустить после установки
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
// Создание папки данных при установке
procedure CurStepChanged(CurStep: TSetupStep);
var
  DataDir: String;
begin
  if CurStep = ssPostInstall then
  begin
    // Создаём папку данных в AppData
    DataDir := ExpandConstant('{userappdata}\UTMka');
    if not DirExists(DataDir) then
    begin
      CreateDir(DataDir);
      CreateDir(DataDir + '\databases');
      CreateDir(DataDir + '\exports');
      CreateDir(DataDir + '\logs');
    end;
  end;
end;

// Удаление данных при полном удалении (опционально)
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  DataDir: String;
  RemoveData: Boolean;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    DataDir := ExpandConstant('{userappdata}\UTMka');
    if DirExists(DataDir) then
    begin
      RemoveData := MsgBox('Удалить данные приложения (история, шаблоны)?',
                           mbConfirmation, MB_YESNO) = IDYES;
      if RemoveData then
        DelTree(DataDir, True, True, True);
    end;
  end;
end;

[Registry]
; Регистрация протокола utmka:// (опционально)
Root: HKCR; Subkey: "utmka"; ValueType: string; ValueData: "URL:UTMka Protocol"; Flags: uninsdeletekey
Root: HKCR; Subkey: "utmka"; ValueName: "URL Protocol"; ValueType: string; ValueData: ""
Root: HKCR; Subkey: "utmka\shell\open\command"; ValueType: string; ValueData: """{app}\{#MyAppExeName}"" ""%1"""
