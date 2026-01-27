import AIAssistant from './pages/AIAssistant';
import AttivitaInterne from './pages/AttivitaInterne';
import CantiereDashboard from './pages/CantiereDashboard';
import Cantieri from './pages/Cantieri';
import Costi from './pages/Costi';
import Cronoprogramma from './pages/Cronoprogramma';
import Dashboard from './pages/Dashboard';
import Documenti from './pages/Documenti';
import GestionePermessi from './pages/GestionePermessi';
import GestionePermessiCantieri from './pages/GestionePermessiCantieri';
import Guida from './pages/Guida';
import Home from './pages/Home';
import ImpresaDashboard from './pages/ImpresaDashboard';
import Imprese from './pages/Imprese';
import MyProfile from './pages/MyProfile';
import PersoneEsterne from './pages/PersoneEsterne';
import ProfiloAzienda from './pages/ProfiloAzienda';
import RiepilogoCantieri from './pages/RiepilogoCantieri';
import SAL from './pages/SAL';
import SALDashboard from './pages/SALDashboard';
import Subappalti from './pages/Subappalti';
import TestData from './pages/TestData';
import UserManagement from './pages/UserManagement';
import DebugPermissions from './pages/DebugPermissions';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIAssistant": AIAssistant,
    "AttivitaInterne": AttivitaInterne,
    "CantiereDashboard": CantiereDashboard,
    "Cantieri": Cantieri,
    "Costi": Costi,
    "Cronoprogramma": Cronoprogramma,
    "Dashboard": Dashboard,
    "Documenti": Documenti,
    "GestionePermessi": GestionePermessi,
    "GestionePermessiCantieri": GestionePermessiCantieri,
    "Guida": Guida,
    "Home": Home,
    "ImpresaDashboard": ImpresaDashboard,
    "Imprese": Imprese,
    "MyProfile": MyProfile,
    "PersoneEsterne": PersoneEsterne,
    "ProfiloAzienda": ProfiloAzienda,
    "RiepilogoCantieri": RiepilogoCantieri,
    "SAL": SAL,
    "SALDashboard": SALDashboard,
    "Subappalti": Subappalti,
    "TestData": TestData,
    "UserManagement": UserManagement,
    "DebugPermissions": DebugPermissions,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};