import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Col, Divider, Form, Input, InputNumber, Modal, Row, Select, Switch } from 'antd';
import { areasApi } from '../api/areas';
import { equiposApi } from '../api/equipos';
import { mensajeDeError } from '../api/errors';
import type { Equipo, UpdateEquipoPayload } from '../api/types';

// Formulario de MODIFICAR un equipo existente (equivale a EditarE.cs de
// v1). El alta de equipos nuevos es otro formulario — NuevoEquipoModal —
// porque se arma distinto (TAG por piezas, como nuevoEq.cs).
interface Props {
  open: boolean;
  equipo: Equipo;
  onClose: () => void;
}

// Forma de los valores DENTRO del formulario. No es igual al payload que
// se envía: acá lrv/hrv/escala son number (InputNumber trabaja con
// números), mientras que en el JSON de respuesta vienen como string
// (Decimal de Prisma) — la conversión se hace al abrir y al guardar.
interface EquipoFormValues {
  sub_area_id: number;
  tag: string;
  descripcion: string;
  informacion: string;
  lrv?: number | null;
  hrv?: number | null;
  escala?: number | null;
  eu?: string;
  marca?: string;
  modelo?: string;
  serie?: string;
  diametro?: string;
  sello?: string;
  cuadratico: boolean;
  en_uso: boolean;
  hibernacion: boolean;
  interviene_calidad: boolean;
}

// Equipo (respuesta del backend) → valores iniciales del formulario.
function aValoresDeFormulario(equipo: Equipo): EquipoFormValues {
  const aNumero = (valor: string | null) => (valor === null ? null : Number(valor));
  return {
    sub_area_id: equipo.sub_area_id,
    tag: equipo.tag,
    descripcion: equipo.descripcion ?? '',
    informacion: equipo.informacion ?? '',
    lrv: aNumero(equipo.lrv),
    hrv: aNumero(equipo.hrv),
    escala: aNumero(equipo.escala),
    eu: equipo.eu ?? '',
    marca: equipo.marca ?? '',
    modelo: equipo.modelo ?? '',
    serie: equipo.serie ?? '',
    diametro: equipo.diametro ?? '',
    sello: equipo.sello ?? '',
    cuadratico: equipo.cuadratico,
    en_uso: equipo.en_uso,
    hibernacion: equipo.hibernacion,
    interviene_calidad: equipo.interviene_calidad,
  };
}

// Un Input de texto vaciado por el usuario devuelve '' — se manda como
// null para que la columna quede realmente vacía en la BD (ver nota de
// UpdateEquipoPayload en api/types.ts), no como un string vacío.
function textoONull(valor: string | undefined): string | null {
  const limpio = valor?.trim();
  return limpio ? limpio : null;
}

export function EquipoFormModal({ open, equipo, onClose }: Props) {
  const [form] = Form.useForm<EquipoFormValues>();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  // Mismo queryKey que AreasPage: si ya se visitó esa pantalla, las áreas
  // salen del cache y el Select aparece lleno al instante.
  const { data: areas, isLoading: cargandoAreas } = useQuery({
    queryKey: ['areas'],
    queryFn: areasApi.getAll,
    enabled: open,
  });

  // Select agrupado: cada área es un grupo y sus sub-áreas las opciones
  // elegibles — el equipo se asigna a una SUB-área (sub_area_id), el área
  // sale de ella.
  const opcionesSubArea = (areas ?? []).map((area) => ({
    label: `${area.codigo} — ${area.nombre}`,
    options: (area.sub_areas ?? []).map((sub) => ({
      label: `${area.nombre} / ${sub.nombre}`,
      value: sub.id,
    })),
  }));

  const guardar = useMutation({
    mutationFn: (valores: EquipoFormValues) => {
      const payload: UpdateEquipoPayload = {
        sub_area_id: valores.sub_area_id,
        tag: valores.tag.trim(),
        descripcion: valores.descripcion.trim(),
        informacion: valores.informacion.trim(),
        // InputNumber vaciado ya devuelve null; "?? null" cubre undefined.
        lrv: valores.lrv ?? null,
        hrv: valores.hrv ?? null,
        escala: valores.escala ?? null,
        eu: textoONull(valores.eu),
        marca: textoONull(valores.marca),
        modelo: textoONull(valores.modelo),
        serie: textoONull(valores.serie),
        diametro: textoONull(valores.diametro),
        sello: textoONull(valores.sello),
        cuadratico: valores.cuadratico,
        en_uso: valores.en_uso,
        hibernacion: valores.hibernacion,
        interviene_calidad: valores.interviene_calidad,
      };
      return equiposApi.update(equipo.id, payload);
    },
    onSuccess: (guardado) => {
      message.success(`Equipo ${guardado.tag} actualizado`);
      queryClient.invalidateQueries({ queryKey: ['equipos'] });
      // en_uso/hibernación cambian el total de "equipos activos" del
      // resumen del Inicio — se invalida para que no muestre un % viejo.
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    // El mensaje específico del backend ("Ya existe un equipo con TAG X",
    // "La sub-área 99 no existe") es más útil que un "Error 409" genérico.
    //
    // OJO con las llaves { }: message.error() devuelve una "thenable" que
    // se resuelve recién cuando el aviso se cierra, y TanStack Query hace
    // await de lo que devuelva onError. Escrito como `(e) => message.error(...)`
    // (sin llaves = return implícito) la mutation quedaba "pendiente" y el
    // botón Guardar cargando para siempre. Con llaves no se devuelve nada.
    onError: (error) => {
      message.error(mensajeDeError(error));
    },
  });

  return (
    <Modal
      open={open}
      title={`Modificar equipo ${equipo.tag}`}
      okText="Guardar"
      cancelText="Cancelar"
      width={760}
      confirmLoading={guardar.isPending}
      // El botón "Guardar" del Modal está fuera del <Form>, así que no
      // puede hacer submit nativo: form.submit() dispara la validación y,
      // si pasa, llama a onFinish.
      onOk={() => form.submit()}
      onCancel={onClose}
    >
      <Form<EquipoFormValues>
        form={form}
        layout="vertical"
        initialValues={aValoresDeFormulario(equipo)}
        onFinish={(valores) => guardar.mutate(valores)}
        // "En uso" y "Hibernación" se excluyen entre sí: un equipo en
        // hibernación no está en uso, y al volver a ponerlo en uso sale de
        // hibernación. onValuesChange recibe SOLO los campos que cambiaron,
        // así se sabe cuál de los dos switches tocó el usuario.
        onValuesChange={(cambios: Partial<EquipoFormValues>) => {
          if (cambios.hibernacion === true) form.setFieldValue('en_uso', false);
          if (cambios.en_uso === true) form.setFieldValue('hibernacion', false);
        }}
      >
        <Divider titlePlacement="start">Identificación</Divider>
        <Form.Item
          name="sub_area_id"
          label="Área / Sub-área"
          rules={[{ required: true, message: 'Selecciona la sub-área' }]}
        >
          <Select
            options={opcionesSubArea}
            loading={cargandoAreas}
            placeholder="Buscar sub-área..."
            showSearch={{ optionFilterProp: 'label' }}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            {/* Mismos límites que CreateEquipoDto (@MaxLength) — validar acá
                evita el viaje al servidor, pero el backend valida igual:
                el frontend nunca es la única defensa. */}
            <Form.Item
              name="tag"
              label="TAG"
              rules={[
                { required: true, whitespace: true, message: 'El TAG es obligatorio' },
                { max: 30 },
              ]}
            >
              <Input placeholder="Ej: 01-01-PT-001" />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item
              name="descripcion"
              label="Descripción"
              rules={[
                { required: true, whitespace: true, message: 'La descripción es obligatoria' },
                { max: 200 },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="informacion"
          label="Información"
          rules={[
            { required: true, whitespace: true, message: 'La información es obligatoria' },
            { max: 100 },
          ]}
        >
          <Input />
        </Form.Item>

        <Divider titlePlacement="start">Calibración</Divider>
        <Row gutter={16}>
          <Col xs={12} md={6}>
            <Form.Item name="lrv" label="LRV">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="hrv" label="HRV">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="escala" label="Escala">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="eu" label="Unidad (EU)" rules={[{ max: 30 }]}>
              <Input placeholder="Ej: PSI" />
            </Form.Item>
          </Col>
        </Row>

        <Divider titlePlacement="start">Datos físicos</Divider>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="marca" label="Marca" rules={[{ max: 100 }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="modelo" label="Modelo" rules={[{ max: 100 }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="serie" label="Serie" rules={[{ max: 100 }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="diametro" label="Diámetro" rules={[{ max: 50 }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="sello" label="Sello" rules={[{ max: 100 }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>

        {/* Los toggles de estado viven en este mismo formulario, igual
            que los checkboxes de EditarE.cs en v1 — no es otra pantalla. */}
        <Divider titlePlacement="start">Estado</Divider>
        <Row gutter={16}>
          <Col xs={12} md={6}>
            {/* valuePropName: Switch usa la prop "checked", no "value"
                como los Input — sin esto Form no sabría conectarlo. */}
            <Form.Item name="en_uso" label="En uso" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="hibernacion" label="Hibernación" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="cuadratico" label="Cuadrático" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item
              name="interviene_calidad"
              label="Interviene calidad"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
