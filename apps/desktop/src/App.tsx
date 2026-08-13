import { HashRouter, Route, Routes } from 'react-router-dom'
import {
  BatchScreen,
  DeviceFrame,
  GeneratorScreen,
  HelpScreen,
  HistoryScreen,
  ParseScreen,
  TemplatesScreen,
} from '@utmka/ui'

import { ImportGate } from './components/ImportGate'
import { TitleBar } from './components/TitleBar'
import { UpdateGate } from './components/UpdateGate'

/**
 * Состав десктопа.
 *
 * Здесь и живёт разница между оболочками: экраны те же файлы, что у веба, но
 * `LoginScreen`, `VaultGate`, счётчик Метрики и окно брифа сюда не приезжают —
 * не потому, что «выключены», а потому, что их нет в этой сборке. Чего в
 * десктопе нет, видно прямо в этом списке, а не в рантайм-флагах внутри
 * разметки.
 *
 * Роутер — hash: перезагрузка окна не сбрасывает экран, а глубокие ссылки под
 * `tauri://` не упираются в поиск файла `/batch.html`.
 */
export function App() {
  return (
    <HashRouter>
      <DeviceFrame titleBar={<TitleBar />} extras={<UpdateGate />}>
        <Routes>
          <Route path="/" element={<GeneratorScreen />} />
          <Route path="/batch" element={<BatchScreen />} />
          <Route path="/parse" element={<ParseScreen />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/templates" element={<TemplatesScreen />} />
          <Route path="/help" element={<HelpScreen />} />
          {/* Неизвестный адрес в окне — это не 404 для человека, а промах
              навигации: возвращаем на генератор. */}
          <Route path="*" element={<GeneratorScreen />} />
        </Routes>

        {/* Предложение перенести данные 2.2 — только здесь: в вебе переносить
            нечего, и общий пакет об этом диалоге не знает. */}
        <ImportGate />
      </DeviceFrame>
    </HashRouter>
  )
}
