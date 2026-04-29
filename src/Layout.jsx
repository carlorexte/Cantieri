import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
    SidebarProvider,
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarFooter,
    SidebarRail,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarSeparator,
    SidebarTrigger,
    useSidebar
} from '@/components/ui/sidebar';
import { createPageUrl } from '@/utils';
import { Menu, X } from 'lucide-react';
import {
    LayoutDashboard,
    Sparkles,
    Building2,
    Building,
    Users,
    GitMerge,
    Calculator,
    ClipboardList,
    FileText,
    Calendar,
    BookOpen,
    Briefcase,
    UserCog,
    Shield,
    Key,
    User,
    LogOut,
    ChevronUp,
    ShoppingCart,
    Database
} from 'lucide-react';
import { usePermissions } from '@/components/shared/PermissionGuard';
import { DataProvider } from '@/components/shared/DataContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from '@/lib/supabaseClient';
import logoOpen from '@/assets/logo-open.png';
import logoCollapsed from '@/assets/logo-collapsed.png';

function LayoutContent({ children }) {
    const location = useLocation();
    const { user, hasPermission, isAdmin, isLoading, ruolo } = usePermissions();
    const { isMobile, toggleSidebar, openMobile, setOpenMobile } = useSidebar();

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.error('Errore logout:', e);
        }
        // Pulisce tutta la sessione Supabase da localStorage
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-')) localStorage.removeItem(key);
        });
        window.location.href = '/';
    };

    const generaleItems = [
        { title: "Dashboard", url: "Dashboard", icon: LayoutDashboard, module: "dashboard", action: "view" },
        { title: "AI Assistant", url: "AIAssistant", icon: Sparkles, module: "ai_assistant", action: "view", adminOnly: true },
        { title: "Cantieri", url: "Cantieri", icon: Building2, module: "cantieri", action: "view" },
        { title: "Imprese", url: "Imprese", icon: Building, module: "imprese", action: "view" },
        { title: "Professionisti", url: "PersoneEsterne", icon: Users, module: "persone", action: "view" },
        { title: "Subappalti", url: "Subappalti", icon: GitMerge, module: "subappalti", action: "view" },
        { title: "Costi", url: "Costi", icon: Calculator, module: "costi", action: "view" },
        { title: "SAL", url: "SAL", icon: FileText, module: "sal", action: "view" },
        { title: "Ordini Materiali", url: "OrdiniMateriali", icon: ShoppingCart, module: "ordini_materiale", action: "view" },
        { title: "Attività Interne", url: "AttivitaInterne", icon: ClipboardList, module: "attivita_interne", action: "view" },
        { title: "Documenti", url: "Documenti", icon: FileText, module: "documenti", action: "view" },
        { title: "Cronoprogramma", url: "Cronoprogramma", icon: Calendar, module: "cronoprogramma", action: "view" },
        { title: "Guida all'Uso", url: "Guida", icon: BookOpen, module: "all" },
    ];

    const impostazioniItems = [
        { title: "Profilo Azienda", url: "ProfiloAzienda", icon: Briefcase, module: "profilo_azienda", action: "view" },
        { title: "Gestione Utenti", url: "UserManagement", icon: UserCog, module: "user_management", action: "view" },
        { title: "Ruoli e Permessi", url: "GestionePermessi", icon: Shield, module: "user_management", action: "manage_roles" },
        { title: "Permessi Cantieri", url: "GestionePermessiCantieri", icon: Key, module: "user_management", action: "manage_cantiere_permissions" },
        { title: "Gestione Dati", url: "AdminData", icon: Database, module: "user_management", action: "manage_users" },
        { title: "Il Mio Profilo", url: "MyProfile", icon: User, module: "all" },
    ];

    const filterItems = (items) => {
        return items.filter(item => {
            if (isLoading || !user) return true; // caricamento o profilo non ancora caricato
            if (item.adminOnly && !isAdmin) return false; // solo admin
            if (isAdmin) return true;            // admin vede tutto
            if (item.module === "all") return true;
            if (!ruolo) return true;             // nessun ruolo assegnato → nessuna restrizione
            return hasPermission(item.module, item.action);
        });
    };

    const visibleGeneraleItems = filterItems(generaleItems);
    const visibleImpostazioniItems = filterItems(impostazioniItems);

    return (
        <div className="flex min-h-screen w-full bg-slate-50">
            <Sidebar collapsible="icon">
                <SidebarHeader className="border-b border-slate-200 bg-white h-16 flex items-center px-4 group-data-[collapsible=icon]:px-2 transition-all">
                    <div className="flex items-center justify-between w-full">
                         {/* Expanded Logo */}
                         <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden transition-all duration-300 overflow-hidden">
                            <img
                                src={logoOpen}
                                alt="RCS Logo"
                                className="h-8 w-auto object-contain"
                            />
                         </div>

                         {/* Collapsed Logo */}
                         <div className="hidden group-data-[collapsible=icon]:flex w-full justify-center items-center">
                            <img
                                src={logoCollapsed}
                                alt="RCS Icon"
                                className="h-8 w-8 object-contain"
                            />
                         </div>

                         <SidebarTrigger className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-md ml-auto group-data-[collapsible=icon]:hidden" />
                    </div>
                </SidebarHeader>
                
                <SidebarContent className="bg-white">
                    <SidebarGroup>
                        <SidebarGroupLabel className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-4 mt-4">GENERALE</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {visibleGeneraleItems.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton 
                                            asChild 
                                            isActive={location.pathname.includes(item.url) || (item.url === 'Dashboard' && location.pathname === '/')}
                                            tooltip={item.title}
                                            className="hover:bg-orange-50 hover:text-orange-600 data-[active=true]:bg-orange-50 data-[active=true]:text-orange-600 data-[active=true]:font-semibold rounded-lg mx-1 px-3 py-2.5 transition-all"
                                        >
                                            <Link to={createPageUrl(item.url)} onClick={() => isMobile && setOpenMobile(false)} className="flex items-center gap-3">
                                                <item.icon className="w-5 h-5" />
                                                <span className="font-medium text-sm">{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    <SidebarSeparator className="my-2" />

                    <SidebarGroup>
                        <SidebarGroupLabel className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-4">IMPOSTAZIONI</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {visibleImpostazioniItems.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton 
                                            asChild 
                                            isActive={location.pathname.includes(item.url)}
                                            tooltip={item.title}
                                            className="hover:bg-orange-50 hover:text-orange-600 data-[active=true]:bg-orange-50 data-[active=true]:text-orange-600 data-[active=true]:font-semibold rounded-lg mx-1 px-3 py-2.5 transition-all"
                                        >
                                            <Link to={createPageUrl(item.url)} onClick={() => isMobile && setOpenMobile(false)} className="flex items-center gap-3">
                                                <item.icon className="w-5 h-5" />
                                                <span className="font-medium text-sm">{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>

                <SidebarFooter className="border-t border-slate-200 bg-white p-4 group-data-[collapsible=icon]:p-2">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <SidebarMenuButton
                                        size="lg"
                                        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
                                    >
                                        <Avatar className="h-8 w-8 rounded-lg">
                                            <AvatarImage src="" alt={user?.full_name} />
                                            <AvatarFallback className="rounded-lg bg-orange-100 text-orange-600 font-bold">
                                                {user?.full_name?.substring(0, 2).toUpperCase() || 'UT'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                            <span className="truncate font-semibold">{user?.full_name || 'Utente'}</span>
                                            <span className="truncate text-xs text-slate-500 capitalize">{user?.role || 'Guest'}</span>
                                        </div>
                                        <ChevronUp className="ml-auto group-data-[collapsible=icon]:hidden" />
                                    </SidebarMenuButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    side="top"
                                    className="w-[--radix-popper-anchor-width]"
                                >
                                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                                        <LogOut className="w-4 h-4 mr-2" />
                                        Esci
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
                <SidebarRail />
            </Sidebar>

            <div className="flex flex-1 flex-col min-w-0">
                {/* Mobile Header */}
                <header className="md:hidden sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-4">
                    <button
                        onClick={toggleSidebar}
                        className="flex items-center justify-center h-10 w-10 rounded-md hover:bg-slate-100 text-slate-600"
                        aria-label="Apri menu"
                    >
                        {openMobile ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                    <img
                        src={logoOpen}
                        alt="RCS Logo"
                        className="h-7 w-auto object-contain"
                    />
                </header>

                <main className="flex-1 overflow-auto bg-slate-50">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function Layout({ children }) {
    return (
        <SidebarProvider>
            <DataProvider>
                <LayoutContent>{children}</LayoutContent>
            </DataProvider>
        </SidebarProvider>
    );
}
