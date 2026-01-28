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
    SidebarTrigger
} from '@/components/ui/sidebar';
import { createPageUrl } from '@/utils';
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
    ChevronUp
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { DataProvider } from '@/components/shared/DataContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Layout({ children }) {
    const location = useLocation();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const userData = await base44.auth.me();
                setUser(userData);
            } catch (error) {
                console.error("Error loading user:", error);
            }
        };
        loadUser();
    }, []);

    const handleLogout = async () => {
        await base44.auth.logout();
    };

    const generaleItems = [
        { title: "Dashboard", url: "Dashboard", icon: LayoutDashboard },
        { title: "AI Assistant", url: "AIAssistant", icon: Sparkles },
        { title: "Cantieri", url: "Cantieri", icon: Building2 },
        { title: "Imprese", url: "Imprese", icon: Building },
        { title: "Professionisti", url: "PersoneEsterne", icon: Users },
        { title: "Subappalti", url: "Subappalti", icon: GitMerge },
        { title: "Costi", url: "Costi", icon: Calculator }, // Using Calculator as placeholder for Costi if Euro not available or just reuse
        { title: "SAL", url: "SAL", icon: FileText },
        { title: "Attività Interne", url: "AttivitaInterne", icon: ClipboardList },
        { title: "Documenti", url: "Documenti", icon: FileText },
        { title: "Cronoprogramma", url: "Cronoprogramma", icon: Calendar },
        { title: "Guida all'Uso", url: "Guida", icon: BookOpen },
    ];

    const impostazioniItems = [
        { title: "Profilo Azienda", url: "ProfiloAzienda", icon: Briefcase },
        { title: "Gestione Utenti", url: "UserManagement", icon: UserCog },
        { title: "Ruoli e Permessi", url: "GestionePermessi", icon: Shield },
        { title: "Permessi Cantieri", url: "GestionePermessiCantieri", icon: Key },
        { title: "Il Mio Profilo", url: "MyProfile", icon: User },
    ];

    return (
        <SidebarProvider>
            <DataProvider>
            <div className="flex min-h-screen w-full bg-slate-50">
                <Sidebar collapsible="icon">
                    <SidebarHeader className="border-b border-slate-200 bg-white px-6 py-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2 transition-all">
                        <div className="flex items-center justify-between gap-2 w-full group-data-[collapsible=icon]:justify-center">
                             <img 
                                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/689a73debdc258a4faf5da9e/5c4d676c7_image.png" 
                                alt="RCS Logo" 
                                className="h-10 w-auto object-contain group-data-[collapsible=icon]:hidden transition-all"
                             />
                             <img 
                                src="/favicon.ico" 
                                alt="RCS Icon" 
                                className="h-8 w-8 object-contain hidden group-data-[collapsible=icon]:block transition-all"
                             />
                             <SidebarTrigger className="text-slate-500 hover:text-slate-700 ml-auto group-data-[collapsible=icon]:hidden" />
                        </div>
                    </SidebarHeader>
                    
                    <SidebarContent className="bg-white">
                        <SidebarGroup>
                            <SidebarGroupLabel className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-4 mt-4">GENERALE</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {generaleItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton 
                                                asChild 
                                                isActive={location.pathname.includes(item.url) || (item.url === 'Dashboard' && location.pathname === '/')}
                                                tooltip={item.title}
                                                className="hover:bg-orange-50 hover:text-orange-600 data-[active=true]:bg-orange-50 data-[active=true]:text-orange-600 data-[active=true]:border-r-4 data-[active=true]:border-orange-500 rounded-none px-6 py-5 transition-all"
                                            >
                                                <Link to={createPageUrl(item.url)} className="flex items-center gap-3">
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
                                    {impostazioniItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton 
                                                asChild 
                                                isActive={location.pathname.includes(item.url)}
                                                tooltip={item.title}
                                                className="hover:bg-orange-50 hover:text-orange-600 data-[active=true]:bg-orange-50 data-[active=true]:text-orange-600 data-[active=true]:border-r-4 data-[active=true]:border-orange-500 rounded-none px-6 py-5 transition-all"
                                            >
                                                <Link to={createPageUrl(item.url)} className="flex items-center gap-3">
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

                    <SidebarFooter className="border-t border-slate-200 bg-white p-4">
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <SidebarMenuButton
                                            size="lg"
                                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                        >
                                            <Avatar className="h-8 w-8 rounded-lg">
                                                <AvatarImage src="" alt={user?.full_name} />
                                                <AvatarFallback className="rounded-lg bg-orange-100 text-orange-600 font-bold">
                                                    {user?.full_name?.substring(0, 2).toUpperCase() || 'UT'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="grid flex-1 text-left text-sm leading-tight">
                                                <span className="truncate font-semibold">{user?.full_name || 'Utente'}</span>
                                                <span className="truncate text-xs text-slate-500 capitalize">{user?.role || 'Guest'}</span>
                                            </div>
                                            <ChevronUp className="ml-auto" />
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
                
                <main className="flex-1 overflow-auto bg-slate-50">
                    {children}
                </main>
            </div>
            </DataProvider>
        </SidebarProvider>
    );
}