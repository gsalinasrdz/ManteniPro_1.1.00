// ════════════════════════════════════════════════════════════
//  ManteniPro — Seed completo
//  Refleja todos los datos demo del prototipo (Sabor Express)
//  Run: pnpm db:seed
// ════════════════════════════════════════════════════════════

import {
  PrismaClient,
  Rol, Criticidad, EstadoEquipo,
  TipoOT, Prioridad, EstadoOT,
  Severidad, EstadoIncidencia,
  Frecuencia, EstadoPM,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Cleanup (dev only)
  await db.bitacora.deleteMany();
  await db.refaccionUsada.deleteMany();
  await db.incidencia.deleteMany();
  await db.ordenTrabajo.deleteMany();
  await db.preventivo.deleteMany();
  await db.equipo.deleteMany();
  await db.refaccion.deleteMany();
  await db.actividad.deleteMany();
  await db.usuario.deleteMany();
  await db.sucursal.deleteMany();
  await db.empresa.deleteMany();

  // ── Empresa ────────────────────────────────────────────────
  const empresa = await db.empresa.create({
    data: { nombre: "Sabor Express", rfc: "SBE220815JK9", marca: "Cadena de pizzas y hamburguesas" },
  });

  // ── Sucursales ─────────────────────────────────────────────
  const sucNombres = [
    "Sabor Express Insurgentes",
    "Sabor Express Polanco",
    "Sabor Express Santa Fe",
    "Sabor Express Coyoacán",
    "Sabor Express Tlalpan",
    "Sabor Express Pedregal",
    "Sabor Express Xochimilco",
  ];
  const sucursales = await Promise.all(
    sucNombres.map((nombre) => db.sucursal.create({ data: { empresaId: empresa.id, nombre } }))
  );
  const suc = Object.fromEntries(sucursales.map((s) => [s.nombre, s]));

  // ── Usuarios ───────────────────────────────────────────────
  const demoHash = await bcrypt.hash("Manteni2026!", 12);
  const [mariaG, robertoS, carlosM, anaR, luisT] = await Promise.all([
    db.usuario.create({ data: { empresaId: empresa.id, email: "maria.gonzalez@saborexpress.mx",  nombre: "María González",  iniciales: "MG", rol: Rol.GERENTE_OPERACIONES, passwordHash: demoHash } }),
    db.usuario.create({ data: { empresaId: empresa.id, email: "roberto.sanchez@saborexpress.mx", nombre: "Roberto Sánchez", iniciales: "RS", rol: Rol.TECNICO, passwordHash: demoHash } }),
    db.usuario.create({ data: { empresaId: empresa.id, email: "carlos.mendoza@saborexpress.mx",  nombre: "Carlos Mendoza",  iniciales: "CM", rol: Rol.TECNICO, passwordHash: demoHash } }),
    db.usuario.create({ data: { empresaId: empresa.id, email: "ana.rios@saborexpress.mx",        nombre: "Ana Ríos",        iniciales: "AR", rol: Rol.TECNICO, passwordHash: demoHash } }),
    db.usuario.create({ data: { empresaId: empresa.id, email: "luis.torres@saborexpress.mx",     nombre: "Luis Torres",     iniciales: "LT", rol: Rol.TRABAJADOR, sucursalId: suc["Sabor Express Tlalpan"]!.id, passwordHash: demoHash } }),
  ]);

  // ── Equipos ────────────────────────────────────────────────
  type EqRow = { cu: string; suc: string; tipo: string; area: string; marca: string; modelo: string; cri: Criticidad; est: EstadoEquipo; hrs: number; ult: string | null; prox: string | null };
  const eqData: EqRow[] = [
    { cu:"CU-S0142", suc:"Sabor Express Tlalpan",       tipo:"Freidora",             area:"Cocina caliente",  marca:"Pitco",         modelo:"SG14",          cri:Criticidad.ALTA,  est:EstadoEquipo.FALLA,         hrs:4820,  ult:"2026-04-10", prox:"2026-05-10" },
    { cu:"CU-S0098", suc:"Sabor Express Polanco",       tipo:"Grill",                area:"Cocina caliente",  marca:"Garland",       modelo:"M45R",          cri:Criticidad.ALTA,  est:EstadoEquipo.FALLA,         hrs:3650,  ult:"2026-04-15", prox:"2026-05-15" },
    { cu:"CU-S0210", suc:"Sabor Express Polanco",       tipo:"Refrigerador",         area:"Área fría",        marca:"True",          modelo:"T-49",          cri:Criticidad.ALTA,  est:EstadoEquipo.MANTENIMIENTO, hrs:12400, ult:"2026-04-01", prox:"2026-05-01" },
    { cu:"CU-S0055", suc:"Sabor Express Santa Fe",      tipo:"Campana Extractora",   area:"Cocina",           marca:"Halton",        modelo:"KSA-12",        cri:Criticidad.MEDIA, est:EstadoEquipo.MANTENIMIENTO, hrs:8200,  ult:"2026-05-19", prox:"2026-06-19" },
    { cu:"CU-S0177", suc:"Sabor Express Tlalpan",       tipo:"Horno Convector",      area:"Cocina caliente",  marca:"Rational",      modelo:"SCC61",         cri:Criticidad.ALTA,  est:EstadoEquipo.FALLA,         hrs:6100,  ult:"2026-03-20", prox:"2026-06-20" },
    { cu:"CU-S0033", suc:"Sabor Express Insurgentes",   tipo:"Licuadora Industrial", area:"Área fría",        marca:"Vitamix",       modelo:"XL-400",        cri:Criticidad.MEDIA, est:EstadoEquipo.OPERATIVO,     hrs:2300,  ult:"2026-05-17", prox:"2026-06-17" },
    { cu:"CU-S0067", suc:"Sabor Express Xochimilco",    tipo:"Máquina de Hielo",     area:"Bar",              marca:"Hoshizaki",     modelo:"KM-515MAJ",     cri:Criticidad.MEDIA, est:EstadoEquipo.OPERATIVO,     hrs:9800,  ult:"2026-03-10", prox:"2026-05-25" },
    { cu:"CU-S0122", suc:"Sabor Express Tlalpan",       tipo:"Plancha",              area:"Cocina caliente",  marca:"Bertos",        modelo:"G7PLTS12B",     cri:Criticidad.ALTA,  est:EstadoEquipo.FALLA,         hrs:5500,  ult:"2026-04-20", prox:"2026-05-20" },
    { cu:"CU-S0301", suc:"Sabor Express Coyoacán",      tipo:"Unidad Condensadora",  area:"Exterior",         marca:"Copeland",      modelo:"ZB15KCE",       cri:Criticidad.MEDIA, est:EstadoEquipo.OPERATIVO,     hrs:7600,  ult:"2026-02-15", prox:"2026-05-28" },
    { cu:"CU-S0088", suc:"Sabor Express Pedregal",      tipo:"Sistema Extracción",   area:"Cocina",           marca:"Captive-Aire",  modelo:"SHD-1-PSP",     cri:Criticidad.MEDIA, est:EstadoEquipo.OPERATIVO,     hrs:11200, ult:null,          prox:null         },
    { cu:"CU-S0400", suc:"Sabor Express Coyoacán",      tipo:"Tablero Eléctrico",    area:"Cuarto técnico",   marca:"Siemens",       modelo:"BOXP3B225B3S",  cri:Criticidad.ALTA,  est:EstadoEquipo.OPERATIVO,     hrs:0,     ult:"2026-01-10", prox:"2026-07-01" },
    { cu:"CU-S0045", suc:"Sabor Express Insurgentes",   tipo:"Freidora",             area:"Cocina caliente",  marca:"Pitco",         modelo:"SG14-SS",       cri:Criticidad.ALTA,  est:EstadoEquipo.OPERATIVO,     hrs:3100,  ult:"2026-05-01", prox:"2026-06-01" },
  ];

  const equipos = await Promise.all(
    eqData.map((e) =>
      db.equipo.create({
        data: {
          cu: e.cu,
          sucursalId: suc[e.suc]!.id,
          tipo: e.tipo, area: e.area, marca: e.marca, modelo: e.modelo,
          criticidad: e.cri, estado: e.est, horas: e.hrs,
          ultMant:  e.ult  ? new Date(e.ult)  : null,
          proxMant: e.prox ? new Date(e.prox) : null,
        },
      })
    )
  );
  const eq = Object.fromEntries(equipos.map((e) => [e.cu, e]));

  // ── Órdenes de trabajo ─────────────────────────────────────
  const [ot45, ot44, ot43, ot42, ot41, ot40, ot39, ot38] = await Promise.all([
    db.ordenTrabajo.create({ data: { numero:"OT-2026-0045", equipoId:eq["CU-S0142"]!.id, titulo:"Cambio de termostato en freidora",                          tipo:TipoOT.CORRECTIVO,  prioridad:Prioridad.ALTA,  estado:EstadoOT.EN_PROCESO, tecnicoId:robertoS.id, creadorId:mariaG.id, programada:new Date("2026-05-21T09:00:00Z"), iniciada:new Date("2026-05-21T10:00:00Z"), evidencias:[] } }),
    db.ordenTrabajo.create({ data: { numero:"OT-2026-0044", equipoId:eq["CU-S0177"]!.id, titulo:"Revisión sistema de encendido en horno convector",           tipo:TipoOT.CORRECTIVO,  prioridad:Prioridad.ALTA,  estado:EstadoOT.ASIGNADA,   tecnicoId:robertoS.id, creadorId:mariaG.id, programada:new Date("2026-05-22T08:00:00Z"), evidencias:[] } }),
    db.ordenTrabajo.create({ data: { numero:"OT-2026-0043", equipoId:eq["CU-S0210"]!.id, titulo:"Mantenimiento preventivo mensual — refrigerador línea fría", tipo:TipoOT.PREVENTIVO,  prioridad:Prioridad.MEDIA, estado:EstadoOT.PROGRAMADA, tecnicoId:null,        creadorId:mariaG.id, programada:new Date("2026-05-25T08:00:00Z"), evidencias:[] } }),
    db.ordenTrabajo.create({ data: { numero:"OT-2026-0042", equipoId:eq["CU-S0055"]!.id, titulo:"Lubricación y ajuste en campana extractora",                 tipo:TipoOT.PREVENTIVO,  prioridad:Prioridad.BAJA,  estado:EstadoOT.CERRADA,    tecnicoId:carlosM.id,  creadorId:mariaG.id, programada:new Date("2026-05-19T08:00:00Z"), iniciada:new Date("2026-05-19T09:00:00Z"), cerrada:new Date("2026-05-19T11:30:00Z"), evidencias:[] } }),
    db.ordenTrabajo.create({ data: { numero:"OT-2026-0041", equipoId:eq["CU-S0033"]!.id, titulo:"Diagnóstico vibraciones en licuadora industrial",            tipo:TipoOT.PREDICTIVO,  prioridad:Prioridad.MEDIA, estado:EstadoOT.CERRADA,    tecnicoId:carlosM.id,  creadorId:mariaG.id, programada:new Date("2026-05-17T10:00:00Z"), iniciada:new Date("2026-05-17T11:00:00Z"), cerrada:new Date("2026-05-17T14:00:00Z"), evidencias:[] } }),
    db.ordenTrabajo.create({ data: { numero:"OT-2026-0040", equipoId:eq["CU-S0301"]!.id, titulo:"Revisión sistema de refrigeración — unidad condensadora",    tipo:TipoOT.PREVENTIVO,  prioridad:Prioridad.MEDIA, estado:EstadoOT.PROGRAMADA, tecnicoId:null,        creadorId:mariaG.id, programada:new Date("2026-05-28T08:00:00Z"), evidencias:[] } }),
    db.ordenTrabajo.create({ data: { numero:"OT-2026-0039", equipoId:eq["CU-S0122"]!.id, titulo:"Reemplazo resistencias en plancha",                          tipo:TipoOT.CORRECTIVO,  prioridad:Prioridad.MEDIA, estado:EstadoOT.ASIGNADA,   tecnicoId:robertoS.id, creadorId:mariaG.id, programada:new Date("2026-05-23T08:00:00Z"), evidencias:[] } }),
    db.ordenTrabajo.create({ data: { numero:"OT-2026-0038", equipoId:eq["CU-S0088"]!.id, titulo:"PM trimestral — sistema de extracción de humos",             tipo:TipoOT.PREVENTIVO,  prioridad:Prioridad.BAJA,  estado:EstadoOT.CANCELADA,  tecnicoId:null,        creadorId:mariaG.id, programada:new Date("2026-05-15T08:00:00Z"), evidencias:[] } }),
  ]);

  // ── Incidencias ────────────────────────────────────────────
  await Promise.all([
    db.incidencia.create({ data: { numero:"INC-2026-0091", equipoId:eq["CU-S0142"]!.id, titulo:"Freidora no alcanza temperatura",            severidad:Severidad.ALTA,  estado:EstadoIncidencia.EN_ATENCION, reportaId:carlosM.id, ordenId:ot45.id,  evidencias:[], createdAt:new Date("2026-05-21T08:00:00Z") } }),
    db.incidencia.create({ data: { numero:"INC-2026-0090", equipoId:eq["CU-S0098"]!.id, titulo:"Grill presenta falla en encendido",           severidad:Severidad.MEDIA, estado:EstadoIncidencia.EVALUACION,  reportaId:anaR.id,    ordenId:null,     evidencias:[], createdAt:new Date("2026-05-20T17:30:00Z") } }),
    db.incidencia.create({ data: { numero:"INC-2026-0089", equipoId:eq["CU-S0210"]!.id, titulo:"Refrigerador con temperatura elevada",        severidad:Severidad.ALTA,  estado:EstadoIncidencia.EVALUACION,  reportaId:luisT.id,   ordenId:null,     evidencias:[], createdAt:new Date("2026-05-20T14:00:00Z") } }),
    db.incidencia.create({ data: { numero:"INC-2026-0088", equipoId:eq["CU-S0055"]!.id, titulo:"Campana extractora con ruido anormal",        severidad:Severidad.BAJA,  estado:EstadoIncidencia.CERRADA,     reportaId:mariaG.id,  ordenId:ot42.id,  evidencias:[], createdAt:new Date("2026-05-19T09:00:00Z") } }),
    db.incidencia.create({ data: { numero:"INC-2026-0087", equipoId:eq["CU-S0177"]!.id, titulo:"Horno convector no enciende",                 severidad:Severidad.ALTA,  estado:EstadoIncidencia.EN_ATENCION, reportaId:carlosM.id, ordenId:ot44.id,  evidencias:[], createdAt:new Date("2026-05-18T11:00:00Z") } }),
    db.incidencia.create({ data: { numero:"INC-2026-0086", equipoId:eq["CU-S0033"]!.id, titulo:"Licuadora industrial con vibración excesiva",  severidad:Severidad.MEDIA, estado:EstadoIncidencia.CERRADA,     reportaId:robertoS.id, ordenId:ot41.id, evidencias:[], createdAt:new Date("2026-05-17T16:00:00Z") } }),
    db.incidencia.create({ data: { numero:"INC-2026-0085", equipoId:eq["CU-S0067"]!.id, titulo:"Máquina de hielo sin producción",             severidad:Severidad.MEDIA, estado:EstadoIncidencia.DESCARTADA,  reportaId:anaR.id,    ordenId:null,     evidencias:[], createdAt:new Date("2026-05-16T10:00:00Z") } }),
    db.incidencia.create({ data: { numero:"INC-2026-0084", equipoId:eq["CU-S0122"]!.id, titulo:"Plancha con zona fría en superficie",         severidad:Severidad.BAJA,  estado:EstadoIncidencia.EVALUACION,  reportaId:luisT.id,   ordenId:null,     evidencias:[], createdAt:new Date("2026-05-15T13:00:00Z") } }),
  ]);

  // ── Preventivos ────────────────────────────────────────────
  await Promise.all([
    db.preventivo.create({ data: { codigo:"PM-001", equipoId:eq["CU-S0142"]!.id, tarea:"Limpieza y desengrase de freidoras",                   frecuencia:Frecuencia.SEMANAL,    prox:new Date("2026-05-14T08:00:00Z"), estado:EstadoPM.VENCIDO,    tecnicoId:robertoS.id } }),
    db.preventivo.create({ data: { codigo:"PM-002", equipoId:eq["CU-S0210"]!.id, tarea:"Calibración de termostatos — refrigeración",            frecuencia:Frecuencia.MENSUAL,    prox:new Date("2026-05-23T08:00:00Z"), estado:EstadoPM.PROXIMO,    tecnicoId:carlosM.id  } }),
    db.preventivo.create({ data: { codigo:"PM-003", equipoId:eq["CU-S0177"]!.id, tarea:"Revisión y ajuste de quemadores en horno",              frecuencia:Frecuencia.TRIMESTRAL, prox:new Date("2026-06-15T08:00:00Z"), estado:EstadoPM.PROGRAMADO, tecnicoId:null         } }),
    db.preventivo.create({ data: { codigo:"PM-004", equipoId:eq["CU-S0055"]!.id, tarea:"Limpieza de filtros en campana extractora",             frecuencia:Frecuencia.QUINCENAL,  prox:new Date("2026-05-19T08:00:00Z"), estado:EstadoPM.VENCIDO,    tecnicoId:carlosM.id  } }),
    db.preventivo.create({ data: { codigo:"PM-005", equipoId:eq["CU-S0033"]!.id, tarea:"Engrase de cojinetes en licuadora industrial",          frecuencia:Frecuencia.MENSUAL,    prox:new Date("2026-06-01T08:00:00Z"), estado:EstadoPM.PROGRAMADO, tecnicoId:null         } }),
    db.preventivo.create({ data: { codigo:"PM-006", equipoId:eq["CU-S0400"]!.id, tarea:"PM semestral — sistema eléctrico general",              frecuencia:Frecuencia.SEMESTRAL,  prox:new Date("2026-07-01T08:00:00Z"), estado:EstadoPM.PROGRAMADO, tecnicoId:null         } }),
    db.preventivo.create({ data: { codigo:"PM-007", equipoId:eq["CU-S0067"]!.id, tarea:"Revisión de compresor en máquina de hielo",             frecuencia:Frecuencia.BIMESTRAL,  prox:new Date("2026-05-25T08:00:00Z"), estado:EstadoPM.PROXIMO,    tecnicoId:robertoS.id } }),
    db.preventivo.create({ data: { codigo:"PM-008", equipoId:eq["CU-S0122"]!.id, tarea:"Verificación de superficie y resistencias en plancha",  frecuencia:Frecuencia.MENSUAL,    prox:new Date("2026-04-30T08:00:00Z"), estado:EstadoPM.VENCIDO,    tecnicoId:null         } }),
    db.preventivo.create({ data: { codigo:"PM-009", equipoId:eq["CU-S0098"]!.id, tarea:"Cambio de aceite en grill de doble contacto",           frecuencia:Frecuencia.MENSUAL,    prox:new Date("2026-04-15T08:00:00Z"), estado:EstadoPM.COMPLETADO, tecnicoId:carlosM.id  } }),
  ]);

  // ── Refacciones ────────────────────────────────────────────
  type RefRow = { sku: string; nombre: string; cat: string; stock: number; min: number; max: number; costo: number; ub: string };
  const refData: RefRow[] = [
    { sku:"FRE-001", nombre:"Termostato de inmersión 350°C",               cat:"Freidoras",        stock:0,  min:2, max:6,  costo:480,  ub:"Bodega A-1" },
    { sku:"FRE-002", nombre:"Elemento calefactor 4kW freidora",            cat:"Freidoras",        stock:1,  min:2, max:4,  costo:1250, ub:"Bodega A-1" },
    { sku:"FRE-003", nombre:"Canastilla de acero inox 30cm",               cat:"Freidoras",        stock:6,  min:4, max:12, costo:320,  ub:"Cocina — estante 3" },
    { sku:"FRE-004", nombre:"Válvula de drenaje 1/2\" freidora",           cat:"Freidoras",        stock:3,  min:2, max:8,  costo:210,  ub:"Bodega A-2" },
    { sku:"REF-001", nombre:"Compresor hermético 1/3 HP R-134a",           cat:"Refrigeración",    stock:0,  min:1, max:2,  costo:3800, ub:"Bodega B-1" },
    { sku:"REF-002", nombre:"Termistor NTC 10kΩ cámara fría",              cat:"Refrigeración",    stock:4,  min:3, max:10, costo:85,   ub:"Bodega B-2" },
    { sku:"REF-003", nombre:"Gas refrigerante R-134a lata 340g",           cat:"Refrigeración",    stock:2,  min:4, max:10, costo:420,  ub:"Bodega B-1" },
    { sku:"REF-004", nombre:"Empaque de hule puerta refrigerador 60×120cm",cat:"Refrigeración",    stock:5,  min:2, max:8,  costo:650,  ub:"Bodega B-2" },
    { sku:"HOR-001", nombre:"Resistencia tubular horno convector 2.5kW",   cat:"Hornos",           stock:2,  min:2, max:6,  costo:890,  ub:"Bodega A-3" },
    { sku:"HOR-002", nombre:"Ventilador interno 220V horno Rational",      cat:"Hornos",           stock:1,  min:1, max:3,  costo:1650, ub:"Bodega A-3" },
    { sku:"HOR-003", nombre:"Sonda de temperatura tipo K horno",           cat:"Hornos",           stock:0,  min:2, max:5,  costo:340,  ub:"Bodega A-3" },
    { sku:"COC-001", nombre:"Aceite mineral NSF grado alimentario 1L",     cat:"Cocina general",   stock:12, min:6, max:24, costo:145,  ub:"Cocina — estante 1" },
    { sku:"COC-002", nombre:"Faja de transmisión 3L-360 licuadora",        cat:"Cocina general",   stock:3,  min:4, max:10, costo:95,   ub:"Bodega A-4" },
    { sku:"COC-003", nombre:"Cuchilla de plancha 30cm acero inox",         cat:"Cocina general",   stock:8,  min:4, max:16, costo:280,  ub:"Cocina — estante 2" },
    { sku:"ELE-001", nombre:"Contactor trifásico 25A 220V",                cat:"Eléctrico",        stock:2,  min:2, max:6,  costo:520,  ub:"Bodega C-1" },
    { sku:"ELE-002", nombre:"Fusible cerámico 15A 250V (pack 10)",         cat:"Eléctrico",        stock:30, min:10,max:50, costo:38,   ub:"Bodega C-1" },
    { sku:"ELE-003", nombre:"Relé térmico 10-16A motor",                   cat:"Eléctrico",        stock:1,  min:2, max:4,  costo:410,  ub:"Bodega C-1" },
    { sku:"FIL-001", nombre:"Filtro de malla campana extractora 50×50cm",  cat:"Filtros",          stock:14, min:7, max:28, costo:190,  ub:"Cocina — estante 4" },
    { sku:"FIL-002", nombre:"Filtro de carbón activo campana 40×40cm",     cat:"Filtros",          stock:6,  min:7, max:21, costo:230,  ub:"Cocina — estante 4" },
    { sku:"GAS-001", nombre:"Válvula solenoide gas LP 3/4\"",              cat:"Gas / Hidráulico", stock:2,  min:1, max:4,  costo:780,  ub:"Bodega D-1" },
    { sku:"GAS-002", nombre:"Manguera flexible gas LP 60cm",               cat:"Gas / Hidráulico", stock:4,  min:4, max:12, costo:350,  ub:"Bodega D-1" },
  ];

  await Promise.all(
    refData.map((r) =>
      db.refaccion.create({
        data: { sku:r.sku, empresaId:empresa.id, nombre:r.nombre, categoria:r.cat, stock:r.stock, min:r.min, max:r.max, costo:r.costo, ubicacion:r.ub },
      })
    )
  );

  console.log("✅ Seed completo");
  console.log(`   ${sucursales.length} sucursales`);
  console.log(`   ${equipos.length} equipos`);
  console.log(`   5 usuarios`);
  console.log(`   8 órdenes de trabajo`);
  console.log(`   8 incidencias`);
  console.log(`   9 preventivos`);
  console.log(`   ${refData.length} refacciones`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
