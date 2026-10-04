// ════════════════════════════════════════════════════════════════════════
// Contenido de la página "Acerca de" — SOLO datos, nada de diseño.
// Rellena los "TODO" aquí; el diseño vive en AcercaDePage.tsx y
// TarjetaPersona.tsx, así cambiar un texto no obliga a tocar el JSX.
//
// ⚠ El repositorio es PÚBLICO: no pongas teléfonos, correos personales ni
// datos internos de la empresa. Enlaces públicos (GitHub, LinkedIn) sí.
// ════════════════════════════════════════════════════════════════════════

// Forma de los datos de una persona (la usan las dos tarjetas de creadores).
export interface Persona {
  nombre: string;
  rol: string; // ej. "Desarrollador de la versión 2 (web)"
  descripcion: string;
  // Foto opcional: importar la imagen arriba y asignarla acá, ej.
  //   import fotoCreador from '../../assets/acerca-de/creador.jpg';
  //   foto: fotoCreador,
  // Sin foto se muestra un avatar con las iniciales.
  foto?: string;
  enlaces?: { texto: string; url: string }[];
}

export const SISTEMA = {
  nombre: 'Sistema de Viñetas para Identificacion de Instrumentos Industriales',
  version: '2.0.0', // TODO: versión a mostrar
  descripcion:
    'Este sistema permite la gestión de viñetas para la identificación de instrumentos industriales, facilitando el seguimiento y control de los mismos en entornos industriales.',
};

// Creador de esta versión (web).
export const CREADOR_ACTUAL: Persona = {
  nombre: 'Franklin Granados',
  rol: 'Full Stack Junior Developer',
  descripcion: 'Estudiante de Ingeniería en Sistemas y Computación, apasionado por el desarrollo web y la creación de soluciones tecnológicas innovadoras.',
  enlaces: [
    { texto: 'LinkedIn', url: 'https://www.linkedin.com/in/franklingranados2022' },
  ],
};

// Creador de la primera versión (Windows Forms + C#).
export const CREADOR_V1: Persona = {
  nombre: 'William Lopez',
  rol: 'Ing. en Sistemas y Computación, Desarrollador de la versión 1 (Windows Forms + C#)',
  descripcion: 'Ingeniero en Sistemas y Computación con experiencia en desarrollo de aplicaciones de escritorio utilizando Windows Forms y C#. Administrador de servidores y Redes, con habilidades en diseño de reportes automaticos mediante NodeRed.',
};

// Línea de tiempo del sistema (de la más vieja a la más nueva).
export const HISTORIA: { titulo: string; detalle: string }[] = [
  { titulo: '2016 — Versión 1', detalle: 'Windows Forms + C# + SQL Server + Crystal Reports.' },
  { titulo: '2026 — Versión 2', detalle: 'Aplicación web: React + NestJS + MySQL.' },
];

// Tecnologías de la versión 2 (ya rellenas con el stack real; ajústalas).
export const TECNOLOGIAS: string[] = [
  'React',
  'TypeScript',
  'Vite',
  'Ant Design',
  'TanStack Query',
  'NestJS',
  'Prisma',
  'MySQL',
  'Docker',
];

// Opcional: agradecimientos. Lista vacía = la sección no se muestra.
export const AGRADECIMIENTOS: string[] = [
  // 'TODO: Departamento de Metrología e Instrumentación',
];
