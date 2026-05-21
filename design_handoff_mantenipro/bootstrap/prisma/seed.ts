// ════════════════════════════════════════════════════════════
//  ManteniPro — Seed inicial
//  Carga los datos demo del prototipo (Sabor Express)
//  Run: pnpm db:seed
// ════════════════════════════════════════════════════════════

import { PrismaClient, Rol, Criticidad, EstadoEquipo, TipoOT, Prioridad, EstadoOT, Severidad, EstadoIncidencia, Frecuencia, EstadoPM, FormatoSucursal } from "@prisma/client";

const db = new PrismaClient();

const SUCURSALES_NOMBRES = [
  { nombre: "Sucursal Polanco",        formato: FormatoSucursal.STANDARD },
  { nombre: "Sucursal Roma Norte",     formato: FormatoSucursal.STANDARD },
  { nombre: "Sucursal Santa Fe",       formato: FormatoSucursal.STANDARD },
  { nombre: "Sucursal Plaza GDL",      formato: FormatoSucursal.STANDARD },
  { nombre: "Sucursal Plaza MTY",      formato: FormatoSucursal.STANDARD },
  { nombre: "Sucursal Plaza QRO",      formato: FormatoSucursal.STANDARD },
  { nombre: "Dark Kitchen Coyoacán",   formato: FormatoSucursal.DARK_KITCHEN },
];

async function main() {
  console.log("🌱 Seeding database...");

  // Cleanup (dev only)
  await db.bitacora.deleteMany();
  await db.refaccionUsada.deleteMany();
  await db.ordenTrabajo.deleteMany();
  await db.incidencia.deleteMany();
  await db.preventivo.deleteMany();
  await db.equipo.deleteMany();
  await db.refaccion.deleteMany();
  await db.actividad.deleteMany();
  await db.usuario.deleteMany();
  await db.sucursal.deleteMany();
  await db.empresa.deleteMany();

  // Empresa
  const empresa = await db.empresa.create({
    data: {
      nombre: "Sabor Express",
      rfc:    "SBE220815JK9",
      marca:  "Cadena de pizzas y hamburguesas",
    },
  });

  // Sucursales
  const sucursales = await Promise.all(
    SUCURSALES_NOMBRES.map((s) =>
      db.sucursal.create({
        data: { ...s, empresaId: empresa.id },
      })
    )
  );
  const sucMap = Object.fromEntries(sucursales.map((s) => [s.nombre, s]));

  // Usuarios
  const [mariaG, carlosV, dianaL, robertoM, sofiaR] = await Promise.all([
    db.usuario.create({
      data: { empresaId: empresa.id, email: "maria.gonzalez@saborexpress.mx", nombre: "María González", iniciales: "MG", rol: Rol.GERENTE_OPERACIONES },
    }),
    db.usuario.create({
      data: { empresaId: empresa.id, email: "carlos.vega@saborexpress.mx", nombre: "Carlos Vega", iniciales: "CV", rol: Rol.TECNICO },
    }),
    db.usuario.create({
      data: { empresaId: empresa.id, email: "diana.lopez@saborexpress.mx", nombre: "Diana López", iniciales: "DL", rol: Rol.TECNICO },
    }),
    db.usuario.create({
      data: { empresaId: empresa.id, email: "roberto.mendez@saborexpress.mx", nombre: "Roberto Méndez", iniciales: "RM", rol: Rol.TECNICO },
    }),
    db.usuario.create({
      data: { empresaId: empresa.id, email: "sofia.ruiz@saborexpress.mx", nombre: "Sofía Ruiz", iniciales: "SR", rol: Rol.TECNICO },
    }),
  ]);

  // Equipos (subset representativo — completar desde mp-data.jsx)
  const equipos = [
    { cu:"CU-S0142", suc:"Sucursal Polanco",    tipo:"Horno pizza Middleby PS636",  area:"Cocción pizza",  cri:Criticidad.ALTA,  est:EstadoEquipo.OPERATIVO,     hrs:8420,  m:"Middleby Marshall", mo:"PS636-WB" },
    { cu:"CU-S0143", suc:"Sucursal Roma Norte", tipo:"Horno pizza Lincoln 1162",    area:"Cocción pizza",  cri:Criticidad.ALTA,  est:EstadoEquipo.MANTENIMIENTO, hrs:12104, m:"Lincoln Impinger",  mo:"1162-000-U" },
    { cu:"CU-S0144", suc:"Sucursal Santa Fe",   tipo:"Horno pizza Middleby PS636",  area:"Cocción pizza",  cri:Criticidad.ALTA,  est:EstadoEquipo.OPERATIVO,     hrs:6230,  m:"Middleby Marshall", mo:"PS636-WB" },
    { cu:"CU-S0204", suc:"Sucursal Plaza GDL",  tipo:"Freidora Henny Penny F5-2",   area:"Freído",         cri:Criticidad.ALTA,  est:EstadoEquipo.FALLA,         hrs:6240,  m:"Henny Penny",       mo:"F5-2" },
    { cu:"CU-S0205", suc:"Sucursal Plaza MTY",  tipo:"Freidora Henny Penny F5-2",   area:"Freído",         cri:Criticidad.ALTA,  est:EstadoEquipo.OPERATIVO,     hrs:7140,  m:"Henny Penny",       mo:"F5-2" },
    { cu:"CU-S0302", suc:"Sucursal Polanco",    tipo:"Walk-in cooler 3x4m",         area:"Refrigeración",  cri:Criticidad.ALTA,  est:EstadoEquipo.OPERATIVO,     hrs:12400, m:"Master-Bilt",       mo:"WIC-3x4" },
    { cu:"CU-S0403", suc:"Sucursal Plaza MTY",  tipo:"Máquina de hielo Manitowoc",  area:"Bebidas",        cri:Criticidad.MEDIA, est:EstadoEquipo.FALLA,         hrs:5640,  m:"Manitowoc",         mo:"IY-0454A" },
    // ... completar con resto de mp-data.jsx EQUIPOS
  ];

  for (const e of equipos) {
    await db.equipo.create({
      data: {
        cu: e.cu,
        sucursalId: sucMap[e.suc]!.id,
        tipo: e.tipo,
        area: e.area,
        marca: e.m,
        modelo: e.mo,
        criticidad: e.cri,
        estado: e.est,
        horas: e.hrs,
        ultMant: new Date("2026-04-22"),
        proxMant: new Date("2026-05-22"),
      },
    });
  }

  console.log("✅ Seed completo");
  console.log(`   ${sucursales.length} sucursales`);
  console.log(`   ${equipos.length} equipos`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
