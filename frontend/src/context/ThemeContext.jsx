import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/axios';

const DEFAULT_CONFIG = {
  nombre_tienda: 'CoreJusto Hardware',
  eslogan: 'Componentes de PC con trazabilidad directa y precios transparentes',
  logo_url: null,
  color_primario: '#0F172A',
  color_secundario: '#10B981',
  moneda_simbolo: 'Bs.',
  moneda_codigo: 'BOB',
  email_contacto: 'contacto@corejusto.com',
  telefono_contacto: '+591 70010001',
  direccion_tienda: 'Santa Cruz de la Sierra',
  politica_comercio_justo: '',
  zonas_envio: []
};

const ThemeContext = createContext(null);

function applyBrandVariables(cfg) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', cfg.color_primario || '#0F172A');
  root.style.setProperty('--color-secondary', cfg.color_secundario || '#10B981');
  if (cfg.nombre_tienda) {
    document.title = cfg.nombre_tienda;
  }
}

export function ThemeProvider({ children }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const refreshConfig = useCallback(async () => {
    try {
      const { data } = await api.get('/config');
      if (data?.data) {
        setConfig(data.data);
        applyBrandVariables(data.data);
      }
    } catch {
      applyBrandVariables(DEFAULT_CONFIG);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  return (
    <ThemeContext.Provider value={{ config, loadingConfig, refreshConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}