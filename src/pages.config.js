/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AIAssistant from './pages/AIAssistant';
import AdminData from './pages/AdminData';
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
import Login from './pages/Login';
import MyProfile from './pages/MyProfile';
import OrdiniMateriali from './pages/OrdiniMateriali';
import PersoneEsterne from './pages/PersoneEsterne';
import ProfiloAzienda from './pages/ProfiloAzienda';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import RiepilogoCantieri from './pages/RiepilogoCantieri';
import Roadmap from './pages/Roadmap';
import SAL from './pages/SAL';
import SALDashboard from './pages/SALDashboard';
import Subappalti from './pages/Subappalti';
import TestData from './pages/TestData';
import UserManagement from './pages/UserManagement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIAssistant": AIAssistant,
    "AdminData": AdminData,
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
    "Login": Login,
    "MyProfile": MyProfile,
    "OrdiniMateriali": OrdiniMateriali,
    "PersoneEsterne": PersoneEsterne,
    "ProfiloAzienda": ProfiloAzienda,
    "Register": Register,
    "ResetPassword": ResetPassword,
    "RiepilogoCantieri": RiepilogoCantieri,
    "Roadmap": Roadmap,
    "SAL": SAL,
    "SALDashboard": SALDashboard,
    "Subappalti": Subappalti,
    "TestData": TestData,
    "UserManagement": UserManagement,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};