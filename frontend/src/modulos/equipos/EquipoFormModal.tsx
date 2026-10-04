import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Checkbox,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { areasApi } from '../../api/areas';
import { equiposApi } from '../../api/equipos';
import { mensajeDeError } from '../../api/errors';
import type { Area, Equipo, UpdateEquipoPayload } from '../../api/types';
import { aTitleCase } from './equipoCatalogos';

// Formulario de MODIFICAR un equipo existente (equivale a EditarE.cs de
// v1). El alta de equipos nuevos es otro formulario — NuevoEquipoModal —
// porque se arma distinto (TAG por piezas, como nuevoEq.cs).
interface Props {
  open: boolean;
  equipo: Equipo;
  onClose: () => void;
  // Si se pasa, aparece el botón "Guardar e imprimir": guarda y le entrega
  // el equipo ya actualizado a quien abrió el modal, para imprimir su viñeta
  // (lo habitual después de corregir un equipo).
  onGuardadoEImprimir?: (equipo: Equipo) => void;
}

// Forma de los valores DENTRO del formulario. No es igual al payload que
// se envía: acá lrv/hrv/escala son number (InputNumber trabaja con
// números), mientras que en el JSON de respuesta vienen como string
// (Decimal de Prisma) — la conversión se hace al abrir y al guardar.
interface EquipoFormValues {
  sub_area_id: number;
  // El TAG se edita de dos formas (ver tagFinal):
  //  - normal: solo las letras ("PT"); el sufijo "-0101" sale de la ubicación;
  //  - manual: el TAG completo (sub-áreas con TAG especial o excepciones).
  tag_letras?: string;
  tag_manual: boolean;
  tag?: string;
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

// ¿El TAG actual sigue el formato normal LETRAS-AASS de SU ubicación? Si es
// así, se abre en modo "letras"; si no (TAG especial, datos viejos con otro
// formato, o no se conoce la ubicación), se abre en modo manual para no
// cambiarle el TAG a nadie sin querer al guardar.
function letrasDelTag(equipo: Equipo): string | null {
  const sufijo = equipo.sub_areas?.areas
    ? `${equipo.sub_areas.areas.codigo}${equipo.sub_areas.codigo}`
    : null;
  const m = /^([A-Z]+)-(\w{4})$/.exec(equipo.tag);
  return m && sufijo && m[2] === sufijo ? m[1] : null;
}

// TAG que se va a guardar, según el modo.
function tagFinal(v: Partial<EquipoFormValues>, manual: boolean, sufijo: string): string {
  if (manual) return (v.tag ?? '').trim().toUpperCase();
  return `${(v.tag_letras ?? '').trim()}-${sufijo}`.toUpperCase();
}

// Busca la sub-área elegida (y su área) en el catálogo de áreas.
function buscarSubArea(areas: Area[] | undefined, subAreaId: number | undefined) {
  for (const area of areas ?? []) {
    const subArea = area.sub_areas?.find((s) => s.id === subAreaId);
    if (subArea) return { area, subArea };
  }
  return null;
}

// Equipo (respuesta del backend) → valores iniciales del formulario.
function aValoresDeFormulario(equipo: Equipo): EquipoFormValues {
  const aNumero = (valor: string | null) => (valor === null ? null : Number(valor));
  const letras = letrasDelTag(equipo);
  return {
    sub_area_id: equipo.sub_area_id,
    tag_letras: letras ?? undefined,
    tag_manual: letras === null,
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

export function EquipoFormModal({ open, equipo, onClose, onGuardadoEImprimir }: Props) {
  const [form] = Form.useForm<EquipoFormValues>();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  // ¿Qué botón se usó? useRef (no useState): solo hay que recordarlo entre
  // el click y el onSuccess, no hace falta volver a dibujar nada.
  const imprimirAlGuardar = useRef(false);

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

  // Ubicación elegida (puede cambiar mientras se edita) y su configuración.
  const subAreaId = Form.useWatch('sub_area_id', form);
  const valores = Form.useWatch([], form) ?? {};
  const ubicacion = buscarSubArea(areas, subAreaId);
  const especial = Boolean(ubicacion?.subArea.tag_especial);
  const manual = especial || Boolean(valores.tag_manual);
  const sufijo = ubicacion ? `${ubicacion.area.codigo}${ubicacion.subArea.codigo}` : '____';
  const tag = tagFinal(valores, manual, sufijo);

  // Aviso temprano de TAG repetido (contra el listado en cache; la garantía
  // real es el UNIQUE de la BD → 409). Se excluye el propio equipo.
  const equipos = queryClient.getQueryData<Equipo[]>(['equipos']);
  const tagCompleto = manual ? Boolean(valores.tag?.trim()) : Boolean(valores.tag_letras?.trim() && ubicacion);
  const yaExiste = tagCompleto && equipos?.some((e) => e.id !== equipo.id && e.tag.toUpperCase() === tag);

  const guardar = useMutation({
    mutationFn: (valores: EquipoFormValues) => {
      const payload: UpdateEquipoPayload = {
        sub_area_id: valores.sub_area_id,
        tag: tagFinal(valores, manual, sufijo),
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
      if (imprimirAlGuardar.current) onGuardadoEImprimir?.(guardado);
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
      width={760}
      onCancel={onClose}
      // Los botones están fuera del <Form>, así que no pueden hacer submit
      // nativo: form.submit() dispara la validación y, si pasa, onFinish.
      // Cada botón deja anotado si después hay que imprimir.
      footer={
        <Space>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            type={onGuardadoEImprimir ? 'default' : 'primary'}
            loading={guardar.isPending && !imprimirAlGuardar.current}
            disabled={yaExiste}
            onClick={() => {
              imprimirAlGuardar.current = false;
              form.submit();
            }}
          >
            Guardar
          </Button>
          {onGuardadoEImprimir && (
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              loading={guardar.isPending && imprimirAlGuardar.current}
              disabled={yaExiste}
              onClick={() => {
                imprimirAlGuardar.current = true;
                form.submit();
              }}
            >
              Guardar e imprimir
            </Button>
          )}
        </Space>
      }
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

        <Divider titlePlacement="start">TAG</Divider>
        {especial ? (
          <Alert
            style={{ marginBottom: 12 }}
            type="info"
            showIcon
            message={`Los equipos de ${ubicacion?.subArea.nombre} tienen TAG con formato propio: se escribe completo.`}
          />
        ) : (
          <Form.Item name="tag_manual" valuePropName="checked" style={{ marginBottom: 8 }}>
            <Checkbox>Escribir el TAG a mano (formato especial)</Checkbox>
          </Form.Item>
        )}
        {manual ? (
          <Form.Item
            name="tag"
            label="TAG completo"
            rules={[{ required: true, whitespace: true, message: 'Escribe el TAG' }, { max: 30 }]}
          >
            {/* textTransform: se VE en mayúsculas mientras se escribe; el
                valor se pasa a mayúsculas al guardar (y el backend lo exige). */}
            <Input style={{ textTransform: 'uppercase' }} />
          </Form.Item>
        ) : (
          <Row gutter={8}>
            <Col xs={14} md={8}>
              <Form.Item
                name="tag_letras"
                label="Letras del TAG"
                rules={[
                  { required: true, whitespace: true, message: 'Requerido' },
                  { pattern: /^[A-Za-z]+$/, message: 'Solo letras (ej. PT)' },
                ]}
              >
                <Input placeholder="PT" style={{ textTransform: 'uppercase' }} />
              </Form.Item>
            </Col>
            <Col xs={10} md={6}>
              <Form.Item label="Sufijo (ubicación)">
                <Input disabled value={`-${sufijo}`} />
              </Form.Item>
            </Col>
          </Row>
        )}
        <Typography.Text>
          Se guardará como: <Typography.Text strong>{tagCompleto ? tag : '—'}</Typography.Text>{' '}
          {yaExiste && <Tag color="red">Ya existe</Tag>}
        </Typography.Text>

        <Divider titlePlacement="start">Datos</Divider>
        <Form.Item
          name="descripcion"
          label="Descripción"
          extra="Se guarda con Mayúscula Inicial En Cada Palabra."
          rules={[
            { required: true, whitespace: true, message: 'La descripción es obligatoria' },
            { max: 200 },
          ]}
        >
          {/* Al salir del campo se muestra ya formateada, igual que se guarda. */}
          <Input onBlur={(e) => form.setFieldValue('descripcion', aTitleCase(e.target.value))} />
        </Form.Item>

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
