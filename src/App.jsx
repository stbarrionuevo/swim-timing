import { HashRouter, Routes, Route } from 'react-router-dom'
import { CompetitionProvider } from './context/CompetitionContext'
import Home from './pages/Home'
import SeriesList from './pages/SeriesList'
import SeriesLoad from './pages/SeriesLoad'
import Results from './pages/Results'
import Public from './pages/Public'
import AdminHome from './pages/admin/AdminHome'
import AdminYear from './pages/admin/AdminYear'
import AdminImport from './pages/admin/AdminImport'
import AdminUmbrales from './pages/admin/AdminUmbrales'
import AdminFinales from './pages/admin/AdminFinales'


export default function App() {
  return (
    <CompetitionProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/turno/:turno/anio/:year" element={<SeriesList />} />
          <Route path="/turno/:turno/anio/:year/serie/:serie" element={<SeriesLoad />} />
          <Route path="/resultados" element={<Results />} />
          <Route path="/publico" element={<Public />} />
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/admin/anio/:year" element={<AdminYear />} />
          <Route path="/admin/importar" element={<AdminImport />} />
          <Route path="/admin/umbrales" element={<AdminUmbrales />} />
          <Route path="/admin/finales" element={<AdminFinales />} />
        </Routes>
      </HashRouter>
    </CompetitionProvider>
  )
}
