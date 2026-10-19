import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ObrasListPage } from "./routes/ObrasListPage";
import { ObraFormPage } from "./routes/ObraFormPage";
import { ObraDetailPage } from "./routes/ObraDetailPage";
import { VisitaFormPage } from "./routes/VisitaFormPage";
import { VisitaDetailPage } from "./routes/VisitaDetailPage";
import { PersonasListPage } from "./routes/PersonasListPage";
import { PersonaFormPage } from "./routes/PersonaFormPage";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<ObrasListPage />} />
          <Route path="/obras/nueva" element={<ObraFormPage />} />
          <Route path="/obras/:obraId" element={<ObraDetailPage />} />
          <Route path="/obras/:obraId/editar" element={<ObraFormPage />} />
          <Route path="/obras/:obraId/visitas/nueva" element={<VisitaFormPage />} />
          <Route path="/visitas/:visitaId" element={<VisitaDetailPage />} />
          <Route path="/visitas/:visitaId/editar" element={<VisitaFormPage />} />
          <Route path="/personas" element={<PersonasListPage />} />
          <Route path="/personas/nueva" element={<PersonaFormPage />} />
          <Route path="/personas/:personaId/editar" element={<PersonaFormPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
