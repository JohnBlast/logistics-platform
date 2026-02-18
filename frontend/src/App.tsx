import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import { ProfilesList } from './pages/ProfilesList'
import { ETLFlow } from './pages/ETLFlow'
import { DataModelPreview } from './pages/DataModelPreview'
import { ShowOverallData } from './pages/ShowOverallData'

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/etl" replace />} />
        <Route path="/etl" element={<ProfilesList />} />
        <Route path="/etl/model" element={<DataModelPreview />} />
        <Route path="/etl/profiles/:id" element={<ETLFlow />} />
        <Route path="/etl/simulate" element={<ShowOverallData />} />
      </Routes>
    </MainLayout>
  )
}

export default App
