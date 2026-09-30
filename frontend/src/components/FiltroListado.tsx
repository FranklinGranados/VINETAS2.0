import { useQuery } from '@tanstack/react-query';
import { Input, Select, Space } from 'antd';
import { areasApi } from '../api/areas';

interface Props {
  busqueda: string;
  onBusqueda: (valor: string) => void;
  areaId: number | undefined;
  onArea: (areaId: number | undefined) => void;
  placeholder: string;
}

// Barra de filtros compartida por los listados de Equipos y Viñetas:
// un cuadro de texto que busca en todos los campos + un selector de área.
// El filtrado en sí lo hace cada página (sabe qué campos tiene su fila);
// este componente solo maneja los controles.
export function FiltroListado({ busqueda, onBusqueda, areaId, onArea, placeholder }: Props) {
  // Mismo queryKey que AreasPage y los formularios: sale del cache.
  const { data: areas, isLoading } = useQuery({
    queryKey: ['areas'],
    queryFn: areasApi.getAll,
  });

  return (
    <Space wrap style={{ marginBottom: 16 }}>
      <Input.Search
        allowClear
        placeholder={placeholder}
        value={busqueda}
        // onChange (no solo onSearch): filtra mientras se escribe, sin
        // tener que presionar Enter. Es filtrado local, no pide nada al
        // servidor, así que no hay costo en hacerlo en cada tecla.
        onChange={(e) => onBusqueda(e.target.value)}
        style={{ width: 360 }}
      />
      <Select
        allowClear
        placeholder="Todas las áreas"
        loading={isLoading}
        value={areaId}
        onChange={onArea}
        options={(areas ?? []).map((a) => ({ value: a.id, label: `${a.codigo} ${a.nombre}` }))}
        showSearch={{ optionFilterProp: 'label' }}
        style={{ width: 260 }}
      />
    </Space>
  );
}
