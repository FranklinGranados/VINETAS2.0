import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  AutoComplete,
  Checkbox,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Tag,
  Typography,
} from 'antd';
import { areasApi } from '../../api/areas';
import { equiposApi } from '../../api/equipos';
import { mensajeDeError } from '../../api/errors';
import type { Area, CreateEquipoPayload, Equipo } from '../../api/types';
import {
  INFO_RANGOS,
  INFO_SENALES,
  INFO_UNIDADES,
  TAG_FUNCIONES,
  TAG_MODIFICADORES,
  TAG_VARIABLES,
  aTitleCase,
  tieneTagEspecial,
} from './equipoCatalogos';

interface Props {
  open: boolean;
  onClose: () => void;
}

// Valores del formulario: son las PIEZAS con las que se arma el equipo,
// igual que los ComboBox de nuevoEq.cs en v1. El TAG, la información y la
// sub-área que se guardan se calculan a partir de ellas.
interface NuevoEquipoValues {
  tag_area: string; // código de área, ej "01"
  tag_sub_area: string; // código de sub-área, ej "02"
  // TAG manual: para ubicaciones con TAG de formato propio (Caldera Mitre,
  // Turbo TGM — sub_areas.tag_especial) o cualquier otra excepción.
  tag_manual: boolean;
  tag_libre?: string;
  tag_variable?: string;
  tag_modificador?: string;
  tag_funcion?: string;
  descripcion: string;
  info_rango?: string;
  info_unidad?: string;
  info_senal?: string;
}

// Arma el TAG como nuevoEq.cs: variable + modificador + función + "-" +
// área + sub-área, todo en mayúsculas. Ej: "PT-0102".
function armarTag(v: Partial<NuevoEquipoValues>): string {
  const letras = [v.tag_variable, v.tag_modificador, v.tag_funcion]
    .map((parte) => parte?.trim() ?? '')
    .join('');
  const numero = `${v.tag_area ?? ''}${v.tag_sub_area ?? ''}`;
  return `${letras}-${numero}`.toUpperCase();
}

// Arma "Información" como nuevoEq.cs: rango + unidad + 4 espacios + señal.
// Se respeta el formato exacto de v1 (con los 4 espacios) porque este
// texto termina impreso en la viñeta y, durante la transición, se guarda
// en la misma BD que usa el programa viejo.
function armarInformacion(v: Partial<NuevoEquipoValues>): string {
  const rangoYUnidad = [v.info_rango?.trim(), v.info_unidad?.trim()]
    .filter(Boolean)
    .join(' ');
  return [rangoYUnidad, v.info_senal?.trim()].filter(Boolean).join('    ');
}

// Busca la sub-área que corresponde a los códigos elegidos.
function buscarUbicacion(areas: Area[] | undefined, v: Partial<NuevoEquipoValues>) {
  const area = areas?.find((a) => a.codigo === v.tag_area);
  const subArea = area?.sub_areas?.find((s) => s.codigo === v.tag_sub_area);
  return area && subArea ? { area, subArea } : null;
}

// ¿Este formulario va con TAG manual? Obligatorio en las ubicaciones con
// TAG especial; opcional (casilla) en el resto.
function usaTagManual(v: Partial<NuevoEquipoValues>, areas: Area[] | undefined): boolean {
  return tieneTagEspecial(areas, v.tag_area, v.tag_sub_area) || Boolean(v.tag_manual);
}

// El TAG final, sea cual sea el modo.
function tagFinal(v: Partial<NuevoEquipoValues>, areas: Area[] | undefined): string {
  return usaTagManual(v, areas) ? (v.tag_libre ?? '').trim().toUpperCase() : armarTag(v);
}

export function NuevoEquipoModal({ open, onClose }: Props) {
  const [form] = Form.useForm<NuevoEquipoValues>();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const { data: areas, isLoading: cargandoAreas } = useQuery({
    queryKey: ['areas'],
    queryFn: areasApi.getAll,
    enabled: open,
  });

  // useWatch re-renderiza el componente cada vez que cambia cualquier
  // campo — así la vista previa del TAG / ubicación / información se
  // actualiza mientras se escribe (en v1 solo se veía al guardar).
  const valores = Form.useWatch([], form) ?? {};
  const especial = tieneTagEspecial(areas, valores.tag_area, valores.tag_sub_area);
  const manual = usaTagManual(valores, areas);
  const tag = tagFinal(valores, areas);
  const informacion = armarInformacion(valores);
  const ubicacion = buscarUbicacion(areas, valores);
  const areaElegida = areas?.find((a) => a.codigo === valores.tag_area);

  // Verificación de duplicado "en vivo" contra el listado que ya está en
  // cache (lo cargó EquiposPage). Es solo un aviso temprano: la garantía
  // real es el UNIQUE de la columna tag en MySQL → el backend responde 409.
  const equipos = queryClient.getQueryData<Equipo[]>(['equipos']);
  const tagCompleto = manual
    ? Boolean(tag)
    : Boolean(valores.tag_variable && valores.tag_funcion && valores.tag_area && valores.tag_sub_area);
  const yaExiste = tagCompleto && equipos?.some((e) => e.tag.toUpperCase() === tag);

  const guardar = useMutation({
    mutationFn: (payload: CreateEquipoPayload) => equiposApi.create(payload),
    onSuccess: (guardado) => {
      message.success(`Equipo ${guardado.tag} creado`);
      queryClient.invalidateQueries({ queryKey: ['equipos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    // Con llaves: ver nota en EquipoFormModal sobre message.error y onError.
    onError: (error) => {
      message.error(mensajeDeError(error));
    },
  });

  const onFinish = (v: NuevoEquipoValues) => {
    const destino = buscarUbicacion(areas, v);
    if (!destino) {
      // No debería pasar (los Select solo ofrecen códigos existentes),
      // pero si pasara es mejor frenar acá que mandar un sub_area_id falso.
      message.error('La ubicación elegida no existe en la base de datos');
      return;
    }
    if (yaExiste) {
      message.warning('El equipo ya existe'); // mismo mensaje que v1
      return;
    }
    // CreateEquipoDto exige informacion no vacía y de máximo 100
    // caracteres — se valida acá para dar un mensaje claro en español
    // antes de que el backend responda un 400 en inglés.
    const info = armarInformacion(v);
    if (!info) {
      message.error('Completa al menos un dato de Información (rango, unidad o señal)');
      return;
    }
    if (info.length > 100) {
      message.error('La información supera los 100 caracteres');
      return;
    }
    guardar.mutate({
      sub_area_id: destino.subArea.id,
      tag: tagFinal(v, areas),
      descripcion: aTitleCase(v.descripcion),
      informacion: info,
    });
  };

  return (
    <Modal
      open={open}
      title="Nuevo equipo"
      okText="Guardar"
      cancelText="Cancelar"
      width={720}
      confirmLoading={guardar.isPending}
      okButtonProps={{ disabled: yaExiste }}
      onOk={() => form.submit()}
      onCancel={onClose}
    >
      <Form<NuevoEquipoValues> form={form} layout="vertical" initialValues={{ tag_manual: false }} onFinish={onFinish}>
        {/* La ubicación va primero porque decide cómo se arma el TAG: sus
            dígitos forman el final del TAG por piezas, y algunas
            ubicaciones (Mitre, TGM) usan TAG manual. */}
        <Divider titlePlacement="start">Ubicación</Divider>
        <Row gutter={8}>
          <Col xs={24} md={12}>
            <Form.Item name="tag_area" label="Área" rules={[{ required: true, message: 'Requerido' }]}>
              <Select
                loading={cargandoAreas}
                placeholder="01"
                // Al cambiar de área, la sub-área elegida deja de ser válida.
                onChange={() => form.setFieldValue('tag_sub_area', undefined)}
                options={(areas ?? []).map((a) => ({ value: a.codigo, label: `${a.codigo} ${a.nombre}` }))}
                // Se puede escribir el código ("01") en vez de abrir la
                // lista, como en los ComboBox de v1.
                showSearch={{ optionFilterProp: 'label' }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="tag_sub_area" label="Sub-área" rules={[{ required: true, message: 'Requerido' }]}>
              <Select
                placeholder="02"
                disabled={!areaElegida}
                options={(areaElegida?.sub_areas ?? []).map((s) => ({ value: s.codigo, label: `${s.codigo} ${s.nombre}` }))}
                showSearch={{ optionFilterProp: 'label' }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider titlePlacement="start">TAG</Divider>
        {especial ? (
          <Alert
            style={{ marginBottom: 16 }}
            type="info"
            showIcon
            message={`Los equipos de ${ubicacion?.subArea.nombre ?? 'esta ubicación'} tienen TAG con formato propio: escríbelo completo.`}
          />
        ) : (
          <Form.Item name="tag_manual" valuePropName="checked" style={{ marginBottom: 8 }}>
            <Checkbox>Escribir el TAG a mano (formato especial)</Checkbox>
          </Form.Item>
        )}

        {manual ? (
          <Form.Item
            name="tag_libre"
            label="TAG completo"
            rules={[{ required: true, whitespace: true, message: 'Escribe el TAG' }, { max: 30 }]}
          >
            <Input placeholder="TAG tal como está en campo" />
          </Form.Item>
        ) : (
          // Las 3 piezas de letras + el sufijo numérico, que sale solo de la
          // ubicación elegida arriba. AutoComplete sugiere la lista de v1
          // pero deja escribir otra cosa (como los ComboBox editables).
          <Row gutter={8} align="bottom">
            <Col xs={8} md={5}>
              <Form.Item name="tag_variable" label="Variable" rules={[{ required: true, message: 'Requerido' }]}>
                <AutoComplete options={TAG_VARIABLES} placeholder="P" />
              </Form.Item>
            </Col>
            <Col xs={8} md={5}>
              <Form.Item name="tag_modificador" label="Modif.">
                <AutoComplete options={TAG_MODIFICADORES} placeholder="—" />
              </Form.Item>
            </Col>
            <Col xs={8} md={5}>
              <Form.Item name="tag_funcion" label="Función" rules={[{ required: true, message: 'Requerido' }]}>
                <AutoComplete options={TAG_FUNCIONES} placeholder="T" />
              </Form.Item>
            </Col>
            <Col xs={24} md={9}>
              <Form.Item label="Sufijo (sale de la ubicación)">
                <Input disabled value={`-${valores.tag_area ?? '__'}${valores.tag_sub_area ?? '__'}`} />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Divider titlePlacement="start">Descripción</Divider>
        <Form.Item
          name="descripcion"
          rules={[{ required: true, whitespace: true, message: 'La descripción es obligatoria' }, { max: 200 }]}
          extra="Se guarda con Mayúscula Inicial En Cada Palabra, como en el programa anterior."
        >
          <Input placeholder="Ej: transmisor de presión vapor vivo" />
        </Form.Item>

        <Divider titlePlacement="start">Información</Divider>
        <Row gutter={8}>
          <Col xs={24} md={8}>
            <Form.Item name="info_rango" label="Rango">
              <AutoComplete options={INFO_RANGOS} placeholder="0-100" />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item name="info_unidad" label="Unidad">
              <AutoComplete options={INFO_UNIDADES} placeholder="PSI" />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item name="info_senal" label="Señal">
              <AutoComplete options={INFO_SENALES} placeholder="4-20 mA" />
            </Form.Item>
          </Col>
        </Row>

        {/* Vista previa de lo que se va a guardar — en v1 la ubicación se
            mostraba en la barra de estado inferior del formulario. */}
        <Descriptions bordered size="small" column={1} title="Se guardará como">
          <Descriptions.Item label="TAG">
            {tagCompleto ? (
              <>
                <Typography.Text strong>{tag}</Typography.Text>{' '}
                {yaExiste && <Tag color="red">Ya existe</Tag>}
              </>
            ) : (
              <Typography.Text type="secondary">
                {manual ? 'Escribe el TAG' : 'Completa la ubicación y las piezas del TAG'}
              </Typography.Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Ubicación">
            {ubicacion ? `${ubicacion.area.nombre} / ${ubicacion.subArea.nombre}` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Descripción">
            {valores.descripcion ? aTitleCase(valores.descripcion) : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Información">
            {/* white-space: pre para que se vean los 4 espacios tal cual
                (HTML normalmente los junta en uno solo). */}
            <span style={{ whiteSpace: 'pre' }}>{informacion || '—'}</span>
          </Descriptions.Item>
        </Descriptions>

        {informacion.length > 100 && (
          <Alert
            style={{ marginTop: 12 }}
            type="error"
            showIcon
            message={`La información tiene ${informacion.length} caracteres; el máximo es 100.`}
          />
        )}
      </Form>
    </Modal>
  );
}
