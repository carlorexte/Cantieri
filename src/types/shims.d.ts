declare module '@/components/ui/*' {
  const mod: any;
  export = mod;
}

declare module '@/api/*' {
  const mod: any;
  export = mod;
}

declare module '@/lib/*' {
  const mod: any;
  export = mod;
}

declare module '*.png' {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly DEV?: boolean;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
