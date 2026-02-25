import { Routes, Route, Navigate } from 'react-router-dom'
import { PipelineOutputProvider } from './context/PipelineOutputContext'
import { MainLayout } from './layouts/MainLayout'
import { ProfilesList } from './pages/ProfilesList'
import { ETLFlow } from './pages/ETLFlow'
import { DataModelPreview } from './pages/DataModelPreview'
import { ShowOverallData } from './pages/ShowOverallData'
import { Discovery } from './pages/Discovery'
import { JobMarket } from './pages/JobMarket'
import { DebugLog } from './pages/DebugLog'

function App() {
  return (
    <PipelineOutputProvider>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/etl" replace />} />
          <Route path="/etl" element={<ProfilesList />} />
          <Route path="/etl/model" element={<DataModelPreview />} />
          <Route path="/etl/profiles/:id" element={<ETLFlow />} />
          <Route path="/etl/simulate" element={<ShowOverallData />} />
          <Route path="/discovery" element={<Discovery />} />
          <Route path="/jobmarket" element={<JobMarket />} />
          <Route path="/debug-log" element={<DebugLog />} />
        </Routes>
      </MainLayout>
    </PipelineOutputProvider>
  )
}

export default App
