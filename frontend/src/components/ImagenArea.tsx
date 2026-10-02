import { useState } from 'react';
import { Avatar } from 'antd';

interface Props {
  codigo: string; // código del área, ej "01"
  nombre: string;
  tamano?: number;
}

// Colores para el distintivo de respaldo: uno por área, fijo según el código,
// así cada área se reconoce siempre por el mismo color.
const COLORES = ['#1677ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1', '#13c2c2', '#fa541c', '#2f54eb', '#a0d911', '#faad14'];

// Dibujo del área. Busca un GIF en frontend/public/areas/<codigo>.gif (ej.
// public/areas/01.gif para Calderas). Si todavía no existe, muestra un
// distintivo de color con el código: así la pantalla funciona desde ya y,
// cuando se agreguen los GIF a esa carpeta, aparecen solos sin tocar código.
//
// Lo que está en public/ se sirve tal cual en la raíz del sitio: el archivo
// public/areas/01.gif se pide como "/areas/01.gif".
export function ImagenArea({ codigo, nombre, tamano = 64 }: Props) {
  const [sinImagen, setSinImagen] = useState(false);

  if (sinImagen) {
    return (
      <Avatar
        shape="square"
        size={tamano}
        style={{ background: COLORES[Number(codigo) % COLORES.length], fontWeight: 'bold', flexShrink: 0 }}
      >
        {codigo}
      </Avatar>
    );
  }

  return (
    <img
      src={`/areas/${codigo}.gif`}
      alt={nombre}
      width={tamano}
      height={tamano}
      style={{ objectFit: 'contain', borderRadius: 8, flexShrink: 0 }}
      // Si el GIF no existe (404), se pasa al distintivo de respaldo.
      onError={() => setSinImagen(true)}
    />
  );
}
