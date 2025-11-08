import Dashboard from './pages/Dashboard';
import Cantieri from './pages/Cantieri';
import Cronoprogramma from './pages/Cronoprogramma';
import Subappalti from './pages/Subappalti';
import Costi from './pages/Costi';
import SAL from './pages/SAL';
import AttivitaInterne from './pages/AttivitaInterne';
import TestData from './pages/TestData';
import Documenti from './pages/Documenti';
import ProfiloAzienda from './pages/ProfiloAzienda';
import UserManagement from './pages/UserManagement';
import MyProfile from './pages/MyProfile';
import Imprese from './pages/Imprese';
import CantiereDashboard from './pages/CantiereDashboard';
import ImpresaDashboard from './pages/ImpresaDashboard';
import PersoneEsterne from './pages/PersoneEsterne';
import RiepilogoCantieri from './pages/RiepilogoCantieri';
import SALDashboard from './pages/SALDashboard';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Cantieri": Cantieri,
    "Cronoprogramma": Cronoprogramma,
    "Subappalti": Subappalti,
    "Costi": Costi,
    "SAL": SAL,
    "AttivitaInterne": AttivitaInterne,
    "TestData": TestData,
    "Documenti": Documenti,
    "ProfiloAzienda": ProfiloAzienda,
    "UserManagement": UserManagement,
    "MyProfile": MyProfile,
    "Imprese": Imprese,
    "CantiereDashboard": CantiereDashboard,
    "ImpresaDashboard": ImpresaDashboard,
    "PersoneEsterne": PersoneEsterne,
    "RiepilogoCantieri": RiepilogoCantieri,
    "SALDashboard": SALDashboard,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};