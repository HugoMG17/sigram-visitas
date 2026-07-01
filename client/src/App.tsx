import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ObrasListPage } from "./routes/ObrasListPage";
import { ObraFormPage } from "./routes/ObraFormPage";
import { ObraDetailPage } from "./routes/ObraDetailPage";
import { VisitaFormPage } from "./routes/VisitaFormPage";
import { VisitaDetailPage } from "./routes/VisitaDetailPage";

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
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
