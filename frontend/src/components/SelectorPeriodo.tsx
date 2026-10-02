import { Select } from 'antd';

interface Props {
  value: number;
  onChange: (periodo: number) => void;
}

// Temporadas que se ofrecen: desde 2 años atrás hasta el siguiente (para
// poder armar los grupos de la próxima temporada antes de que empiece).
function periodosDisponibles(): number[] {
  const actual = new Date().getFullYear();
  return [actual + 1, actual, actual - 1, actual - 2];
}

// Selector de temporada de mantenimiento, compartido por el Inicio y la
// pantalla de Grupos de trabajo.
export function SelectorPeriodo({ value, onChange }: Props) {
  return (
    <Select
      value={value}
      onChange={onChange}
      style={{ width: 170 }}
      options={periodosDisponibles().map((p) => ({ value: p, label: `Temporada ${p}` }))}
    />
  );
}
