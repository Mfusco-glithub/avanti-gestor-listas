'use strict'
const ExcelJS = require('exceljs')
const path = require('path')

// ── Colores ───────────────────────────────────────────────────────────────────
const RED    = 'FFCC0000'
const WHITE  = 'FFFFFFFF'
const LRED   = 'FFFFEBEE'
const BLUE   = 'FF0D47A1'
const LBLUE  = 'FFE3F2FD'
const GRAY   = 'FF616161'
const LGRAY  = 'FFF5F5F5'
const GREEN  = 'FF2E7D32'
const DBROWN = 'FF4E342E'
const LORANGE = 'FFFFF8E1'  // fondo suave para columna margen

// ── Datos ─────────────────────────────────────────────────────────────────────
// Campos: ean, cod, desc, familia, sf (sub_familia), marca, uc (unidades_caja),
//         iva, neto, civa, pvp, ant_neto, ant_civa
// Congelados: precio interior = precio comercio / 1.30 (misma base que gl_lista_precios; IVA sobre el neto interior)
const ITEMS = [
  // ── AVANTI MASAS ─────────────────────────────────────────────────────────
  // Masas para Empanadas
  { ean:'7730927020135', cod:'12',   desc:'Tapa empanadas AVANTI horno copetín 24 un.', familia:'Masas', sf:'Copetin', marca:'AVANTI', uc:18, iva:0.22, neto:81.96,  civa:99.99,  pvp:162, ant_neto:79.19,  ant_civa:96.62 },
  { ean:'7730927020500', cod:'114',  desc:'Tapa empanadas AVANTI caseras x 15 un. 437 g', familia:'Masas', sf:'Empanadas x 12', marca:'AVANTI', uc:28, iva:0.22, neto:81.65,  civa:99.61,  pvp:162, ant_neto:76.67,  ant_civa:93.54 },
  { ean:'7730927020111', cod:'113',  desc:'Tapas para Empanadas Hojaldradas AVANTI 15 Unidades', familia:'Masas', sf:'Empanadas x 12', marca:'AVANTI', uc:28, iva:0.22, neto:81.65,  civa:99.61,  pvp:162, ant_neto:76.67,  ant_civa:93.54 },
  { ean:'7730927022399', cod:'115',  desc:'Tapas para Empanadas XL AVANTI x 10 un.', familia:'Masas', sf:'Empanadas XL', marca:'AVANTI', uc:32, iva:0.22, neto:71.72,  civa:87.50,  pvp:176, ant_neto:68.30,  ant_civa:83.33 },
  { ean:'7730927020395', cod:'50',   desc:'Tapa empanadas AVANTI horno 20 un.', familia:'Masas', sf:'Empanadas x 20', marca:'AVANTI', uc:20, iva:0.22, neto:112.80, civa:137.62, pvp:224, ant_neto:107.94, ant_civa:131.69 },
  { ean:'7730927020548', cod:'60',   desc:'Tapas para Empanadas Tipo Casera AVANTI x 20 Tapas 600 gr', familia:'Masas', sf:'Empanadas x 20', marca:'AVANTI', uc:20, iva:0.22, neto:112.80, civa:137.62, pvp:224, ant_neto:107.94, ant_civa:131.69 },
  { ean:'7730927020821', cod:'107',  desc:'Pack AVANTI empanadas tipo casera 40 un. 1200 g', familia:'Masas', sf:'Empanadas x 40', marca:'AVANTI', uc:10, iva:0.22, neto:206.17, civa:251.53, pvp:409, ant_neto:198.24, ant_civa:241.86 },
  { ean:'7730927020814', cod:'106',  desc:'Pack AVANTI tapa empanada horno hojaldrada 40 un.', familia:'Masas', sf:'Empanadas x 40', marca:'AVANTI', uc:10, iva:0.22, neto:206.17, civa:251.53, pvp:409, ant_neto:198.24, ant_civa:241.86 },
  // Masas Light
  { ean:'7730927020791', cod:'62',   desc:'Tapas para Empanadas Light sin Hojaldrar AVANTI 12 Unidades', familia:'Masas', sf:'Empanadas x 12', marca:'AVANTI', uc:32, iva:0.22, neto:85.81,  civa:104.69, pvp:170, ant_neto:81.72,  ant_civa:99.70 },
  { ean:'7730927020784', cod:'21',   desc:'Tapas Redondas Light con Separadores AVANTI 350 gr', familia:'Masas', sf:'Tapas Redondas', marca:'AVANTI', uc:20, iva:0.22, neto:88.98,  civa:108.56, pvp:176, ant_neto:84.74,  ant_civa:103.38 },
  // Masas para Tapas
  { ean:'7730927020098', cod:'14',   desc:'Tapa rectangular AVANTI 550 g', familia:'Masas', sf:'Tapas Rectangulares', marca:'AVANTI', uc:20, iva:0.22, neto:106.94, civa:130.47, pvp:212, ant_neto:100.89, ant_civa:123.08 },
  { ean:'7730927020623', cod:'80',   desc:'Tapas Rectangulares con Separadores Tipo Casera AVANTI 550 gr', familia:'Masas', sf:'Tapas Rectangulares', marca:'AVANTI', uc:20, iva:0.22, neto:106.94, civa:130.47, pvp:212, ant_neto:100.89, ant_civa:123.08 },
  { ean:'7730927020166', cod:'13',   desc:'Tapa redonda AVANTI 350 g', familia:'Masas', sf:'Tapas Redondas', marca:'AVANTI', uc:20, iva:0.22, neto:75.20,  civa:91.74,  pvp:149, ant_neto:71.62,  ant_civa:87.38 },
  { ean:'7730927020494', cod:'18',   desc:'Tapas para Pascualina Redondas Tipo Casera AVANTI 350 gr', familia:'Masas', sf:'Tapas Redondas', marca:'AVANTI', uc:20, iva:0.22, neto:75.20,  civa:91.74,  pvp:149, ant_neto:71.62,  ant_civa:87.38 },
  { ean:'7730927023662', cod:'32',   desc:'Tapas para Tartas Individuales AVANTI 20 cm sin hojaldre', familia:'Masas', sf:'Tapas Redondas', marca:'AVANTI', uc:16, iva:0.22, neto:44.89,  civa:54.77,  pvp:89,  ant_neto:44.89,  ant_civa:54.77 },
  // Masas para Tartas
  { ean:'7730927022108', cod:'421',  desc:'Masa AVANTI para tarta integral 250 g', familia:'Masas', sf:'Masa Tarta', marca:'AVANTI', uc:20, iva:0.22, neto:70.14,  civa:85.57,  pvp:139, ant_neto:68.10,  ant_civa:83.08 },
  { ean:'7730927022092', cod:'420',  desc:'Masa AVANTI para tartas con semillas 250 g', familia:'Masas', sf:'Masa Tarta', marca:'AVANTI', uc:20, iva:0.22, neto:70.14,  civa:85.57,  pvp:139, ant_neto:68.10,  ant_civa:83.08 },
  { ean:'7730927020906', cod:'400',  desc:'Masa Brisee AVANTI 250 g', familia:'Masas', sf:'Masa Tarta', marca:'AVANTI', uc:20, iva:0.22, neto:56.39,  civa:68.80,  pvp:112, ant_neto:52.46,  ant_civa:64.00 },

  // ── AVANTI PASTAS Y SALSAS ────────────────────────────────────────────────
  // Pasta Fresca Envasada
  { ean:'7730927023655', cod:'790',  desc:'Ravioles + Proteína Calabaza AVANTI 180 g', familia:'Pastas Frescas ATM', sf:'Ravioles', marca:'AVANTI', uc:20, iva:0.10, neto:94.54,  civa:103.99, pvp:169, ant_neto:94.54,  ant_civa:104.00 },
  { ean:'7730927023648', cod:'780',  desc:'Ravioles + Proteína Esp. y Pollo AVANTI 180 g', familia:'Pastas Frescas ATM', sf:'Ravioles', marca:'AVANTI', uc:20, iva:0.10, neto:94.54,  civa:103.99, pvp:169, ant_neto:94.54,  ant_civa:104.00 },
  { ean:'7730927023556', cod:'823',  desc:'Nuevos Ravioles Jamón y Queso AVANTI 500 g', familia:'Pastas Frescas ATM', sf:'Ravioles', marca:'AVANTI', uc:12, iva:0.10, neto:167.44, civa:184.18, pvp:299, ant_neto:163.36, ant_civa:179.70 },
  { ean:'7730927023563', cod:'824',  desc:'Nuevos Ravioles Pollo Grillado AVANTI 500 g', familia:'Pastas Frescas ATM', sf:'Ravioles', marca:'AVANTI', uc:12, iva:0.10, neto:167.44, civa:184.18, pvp:299, ant_neto:163.36, ant_civa:179.70 },
  { ean:'7730927023549', cod:'822',  desc:'Nuevos Ravioles Verdura AVANTI 500 g', familia:'Pastas Frescas ATM', sf:'Ravioles', marca:'AVANTI', uc:12, iva:0.10, neto:167.44, civa:184.18, pvp:299, ant_neto:163.36, ant_civa:179.70 },
  { ean:'7730927021453', cod:'827',  desc:'Sorrentinos AVANTI 4 Quesos 500 gr', familia:'Pastas Frescas ATM', sf:'Sorrentinos', marca:'AVANTI', uc:12, iva:0.10, neto:182.08, civa:200.29, pvp:325, ant_neto:176.78, ant_civa:194.46 },
  { ean:'7730927021408', cod:'826',  desc:'Sorrentinos AVANTI jamón y queso 500 g', familia:'Pastas Frescas ATM', sf:'Sorrentinos', marca:'AVANTI', uc:12, iva:0.10, neto:182.08, civa:200.29, pvp:325, ant_neto:176.78, ant_civa:194.46 },
  { ean:'7730927021415', cod:'825',  desc:'Sorrentinos de Ricotta y Espinaca AVANTI 500 gr', familia:'Pastas Frescas ATM', sf:'Sorrentinos', marca:'AVANTI', uc:12, iva:0.10, neto:182.08, civa:200.29, pvp:325, ant_neto:176.78, ant_civa:194.46 },
  { ean:'7730927022191', cod:'747',  desc:'Tagliatelle de Albahaca AVANTI 270 gr', familia:'Pastas Frescas ATM', sf:'Tagliatelle', marca:'AVANTI', uc:16, iva:0.10, neto:108.90, civa:119.79, pvp:195, ant_neto:105.73, ant_civa:116.30 },
  { ean:'7730927022115', cod:'766',  desc:'Pack Tallarines AVANTI 500 g x 2', familia:'Pastas Frescas ATM', sf:'Tallarines', marca:'AVANTI', uc:6,  iva:0.10, neto:133.76, civa:147.14, pvp:265, ant_neto:125.60, ant_civa:153.23 },
  { ean:'7730927020593', cod:'216',  desc:'Tallarines AVANTI 500 g', familia:'Pastas Frescas ATM', sf:'Tallarines', marca:'AVANTI', uc:null, iva:0.10, neto:78.55,  civa:86.41,  pvp:140, ant_neto:75.53,  ant_civa:83.08 },
  // Salsas
  { ean:'7730927022405', cod:'803',  desc:'Salsa 4 Quesos AVANTI 220 g', familia:'Salsas', sf:'Salsas 200 g', marca:'AVANTI', uc:12, iva:0.22, neto:100.57, civa:122.70, pvp:199, ant_neto:95.33,  ant_civa:116.30 },
  { ean:'7730927022375', cod:'801',  desc:'Salsa bolognesa AVANTI 220 g', familia:'Salsas', sf:'Salsas 200 g', marca:'AVANTI', uc:12, iva:0.22, neto:100.57, civa:122.70, pvp:199, ant_neto:95.33,  ant_civa:116.30 },
  { ean:'7730927022382', cod:'802',  desc:'Salsa carusso AVANTI 220 g', familia:'Salsas', sf:'Salsas 200 g', marca:'AVANTI', uc:12, iva:0.22, neto:100.57, civa:122.70, pvp:199, ant_neto:95.33,  ant_civa:116.30 },
  { ean:'7730927023532', cod:'805',  desc:'Salsa de Quesos a la Filetto AVANTI 220 g', familia:'Salsas', sf:'Salsas 200 g', marca:'AVANTI', uc:12, iva:0.22, neto:100.57, civa:122.70, pvp:199, ant_neto:95.33,  ant_civa:116.30 },
  { ean:'7730927023525', cod:'804',  desc:'Tuco Casero de Pollo AVANTI 220 g', familia:'Salsas', sf:'Salsas 200 g', marca:'AVANTI', uc:12, iva:0.22, neto:100.57, civa:122.70, pvp:199, ant_neto:95.33,  ant_civa:116.30 },
  // Empanadas Congeladas (40% margen: civa = pvp × 0.60)
  { ean:'7730927023617', cod:'797',  desc:'Pack Empanadas Congeladas 4 Quesos x 3 un. AVANTI 210 g', familia:'Empanadas Congeladas', sf:'Empanadas x 3', marca:'AVANTI', uc:9,  iva:0.22, neto:128.53, civa:156.81, pvp:265, ant_neto:133.67, ant_civa:163.08 },
  { ean:'7730927023624', cod:'798',  desc:'Pack Empanadas Congeladas Carne x 3 un. AVANTI 210 g', familia:'Empanadas Congeladas', sf:'Empanadas x 3', marca:'AVANTI', uc:9,  iva:0.22, neto:128.53, civa:156.81, pvp:265, ant_neto:133.67, ant_civa:163.08 },
  { ean:'7730927023600', cod:'796',  desc:'Pack Empanadas Congeladas J y Q x 3 un. AVANTI 210 g', familia:'Empanadas Congeladas', sf:'Empanadas x 3', marca:'AVANTI', uc:9,  iva:0.22, neto:128.53, civa:156.81, pvp:265, ant_neto:133.67, ant_civa:163.08 },
  { ean:'7730927023631', cod:'799',  desc:'Pack Empanadas Congeladas R y E x 3 un. AVANTI 210 g', familia:'Empanadas Congeladas', sf:'Empanadas x 3', marca:'AVANTI', uc:9,  iva:0.22, neto:128.53, civa:156.81, pvp:265, ant_neto:133.67, ant_civa:163.08 },
  // Pastas Congeladas (40% margen)
  { ean:'7730927023693', cod:'364',  desc:'Ravioles Congelados 4 Quesos AVANTI 750 g', familia:'Pastas Congeladas', sf:'Ravioles Congelados', marca:'AVANTI', uc:8,  iva:0.10, neto:182.89, civa:201.18, pvp:340, ant_neto:190.21, ant_civa:209.23 },
  { ean:'7730927023686', cod:'2201', desc:'Ravioles Congelados Jamón y Queso AVANTI 750 g', familia:'Pastas Congeladas', sf:'Ravioles Congelados', marca:'AVANTI', uc:8,  iva:0.10, neto:182.89, civa:201.18, pvp:340, ant_neto:190.21, ant_civa:209.23 },
  { ean:'7730927023679', cod:'365',  desc:'Ravioles Congelados Verdura AVANTI 750 g', familia:'Pastas Congeladas', sf:'Ravioles Congelados', marca:'AVANTI', uc:8,  iva:0.10, neto:182.89, civa:201.18, pvp:340, ant_neto:190.21, ant_civa:209.23 },
  { ean:'7730927023709', cod:'3010', desc:'Sorrentinos Congelados Jamón y Queso AVANTI 750 g', familia:'Pastas Congeladas', sf:'Sorrentinos Congelados', marca:'AVANTI', uc:8,  iva:0.10, neto:196.34, civa:215.97, pvp:365, ant_neto:204.20, ant_civa:224.62 },
  { ean:'7730927023716', cod:'3011', desc:'Sorrentinos Congelados Ricota y Espinaca AVANTI 750 g', familia:'Pastas Congeladas', sf:'Sorrentinos Congelados', marca:'AVANTI', uc:8,  iva:0.10, neto:196.34, civa:215.97, pvp:365, ant_neto:204.20, ant_civa:224.62 },
  // Pizzas Congeladas
  { ean:'7730927023587', cod:'151',  desc:'Pinsa Romana con Muzzarella AVANTI 670 g', familia:'Pizzas Congeladas', sf:'Pizzas Congeladas', marca:'AVANTI', uc:20, iva:0.22, neto:305.56, civa:372.78, pvp:630, ant_neto:317.78, ant_civa:387.70 },
  { ean:'7730927023594', cod:'152',  desc:'Pinsa Romana con Tomate Italiano AVANTI 630 g', familia:'Pizzas Congeladas', sf:'Pizzas Congeladas', marca:'AVANTI', uc:20, iva:0.22, neto:237.66, civa:289.94, pvp:490, ant_neto:247.16, ant_civa:301.54 },

  // ── PASTAMANÍA ────────────────────────────────────────────────────────────
  // Masas para Empanadas
  { ean:'7730927020272', cod:'204',  desc:'Empanadas Horno Hojaldre PASTAMANÍA x 12 un. 300 g', familia:'Masas', sf:'Empanadas x 12', marca:'PASTAMANÍA', uc:36, iva:0.22, neto:60.09,  civa:73.31,  pvp:119, ant_neto:57.50,  ant_civa:70.15 },
  { ean:'7730927020777', cod:'190',  desc:'Empanadas Horno Sin Hojaldre PASTAMANÍA x 12 un. 300 g', familia:'Masas', sf:'Empanadas x 12', marca:'PASTAMANÍA', uc:36, iva:0.22, neto:60.09,  civa:73.31,  pvp:119, ant_neto:57.50,  ant_civa:70.15 },
  { ean:'7730927020449', cod:'195',  desc:'Empanadas Horno Hojaldre PASTAMANÍA x 20 un. 500 g', familia:'Masas', sf:'Empanadas x 20', marca:'PASTAMANÍA', uc:24, iva:0.22, neto:88.13,  civa:107.52, pvp:175, ant_neto:84.74,  ant_civa:103.38 },
  // Masas para Tapas
  { ean:'7730927023112', cod:'207',  desc:'Tapa Rectangular Hojaldre PASTAMANÍA x 2 un. 500 g', familia:'Masas', sf:'Tapas Rectangulares', marca:'PASTAMANÍA', uc:null, iva:0.22, neto:89.51,  civa:109.20, pvp:177, ant_neto:85.25,  ant_civa:104.00 },
  { ean:'7730927020739', cod:'192',  desc:'Tapa Rectangular sin Hojaldre PASTAMANÍA x 2 un. 500 g', familia:'Masas', sf:'Tapas Rectangulares', marca:'PASTAMANÍA', uc:20, iva:0.22, neto:89.51,  civa:109.20, pvp:177, ant_neto:85.25,  ant_civa:104.00 },
  { ean:'7730927020265', cod:'206',  desc:'Tapa Redonda Hojaldre PASTAMANÍA x 2 un. 330 g', familia:'Masas', sf:'Tapas Redondas', marca:'PASTAMANÍA', uc:20, iva:0.22, neto:59.80,  civa:72.96,  pvp:119, ant_neto:57.50,  ant_civa:70.15 },
  // Pasta Fresca Envasada
  { ean:'7730927021040', cod:'282',  desc:'Pack ravioles PASTAMANÍA 4 Quesos 1 kg', familia:'Pastas Frescas ATM', sf:'Pack Ravioles', marca:'PASTAMANÍA', uc:6,  iva:0.10, neto:220.74, civa:242.81, pvp:395, ant_neto:209.23, ant_civa:230.15 },
  { ean:'7730927021064', cod:'281',  desc:'Pack ravioles PASTAMANÍA Carne y Verdura 1 kg', familia:'Pastas Frescas ATM', sf:'Pack Ravioles', marca:'PASTAMANÍA', uc:6,  iva:0.10, neto:220.74, civa:242.81, pvp:395, ant_neto:209.23, ant_civa:230.15 },
  { ean:'7730927021057', cod:'280',  desc:'Pack ravioles PASTAMANÍA Ricota y Espinaca 1 kg', familia:'Pastas Frescas ATM', sf:'Pack Ravioles', marca:'PASTAMANÍA', uc:6,  iva:0.10, neto:220.74, civa:242.81, pvp:395, ant_neto:209.23, ant_civa:230.15 },
  { ean:'7730927020555', cod:'217',  desc:'Ravioles 4 Quesos PASTAMANÍA 500 g', familia:'Pastas Frescas ATM', sf:'Ravioles', marca:'PASTAMANÍA', uc:null, iva:0.10, neto:108.86, civa:119.75, pvp:195, ant_neto:105.18, ant_civa:115.70 },
  { ean:'7730927020685', cod:'286',  desc:'Ravioles Carne y Verdura PASTAMANÍA 500 g', familia:'Pastas Frescas ATM', sf:'Ravioles', marca:'PASTAMANÍA', uc:null, iva:0.10, neto:108.86, civa:119.75, pvp:195, ant_neto:105.18, ant_civa:115.70 },
  { ean:'7730927020579', cod:'214',  desc:'Ravioles Ricota y Espinaca PASTAMANÍA 500 g', familia:'Pastas Frescas ATM', sf:'Ravioles', marca:'PASTAMANÍA', uc:null, iva:0.10, neto:108.86, civa:119.75, pvp:195, ant_neto:105.18, ant_civa:115.70 },
  { ean:'7730927020937', cod:'329',  desc:'Sorrentinos Jamón y Queso PASTAMANÍA 500 g', familia:'Pastas Frescas ATM', sf:'Sorrentinos', marca:'PASTAMANÍA', uc:null, iva:0.10, neto:131.58, civa:144.74, pvp:235, ant_neto:125.31, ant_civa:137.85 },
  // Pastas Congeladas 500 g (nuevos — interior = comercio / 1.30; sin lista anterior)
  { ean:'7730927022306', cod:'76361', desc:'Ravioles con Jamón y Queso PASTAMANIA Congelados 500 g', familia:'Pastas Congeladas', sf:'Ravioles Congelados', marca:'PASTAMANÍA', uc:12, iva:0.10, neto:72.86, civa:80.15, pvp:135.45, ant_neto:72.86, ant_civa:80.15 },
  { ean:'7730927022313', cod:'76362', desc:'Ravioles con Ricota PASTAMANIA Congelados 500 g', familia:'Pastas Congeladas', sf:'Ravioles Congelados', marca:'PASTAMANÍA', uc:12, iva:0.10, neto:72.86, civa:80.15, pvp:135.45, ant_neto:72.86, ant_civa:80.15 },
  { ean:'7730927022337', cod:'76363', desc:'Sorrentinos con Jamón y Queso PASTAMANIA Congelados 500 g', familia:'Pastas Congeladas', sf:'Sorrentinos Congelados', marca:'PASTAMANÍA', uc:12, iva:0.10, neto:78.51, civa:86.36, pvp:145.95, ant_neto:78.51, ant_civa:86.36 },
  { ean:'7730927022290', cod:'76364', desc:'Ñoquis con Papa PASTAMANIA Congelados 500 g', familia:'Pastas Congeladas', sf:'Ñoquis Congelados', marca:'PASTAMANÍA', uc:12, iva:0.10, neto:53.66, civa:59.03, pvp:99.75, ant_neto:53.66, ant_civa:59.03 },
]

// ── Orden sub-familias ────────────────────────────────────────────────────────
const SF_ORDER = [
  'Copetin','Empanadas x 12','Empanadas x 20','Empanadas x 40','Empanadas XL','Empanadas x 6',
  'Tapas Redondas','Tapas Rectangulares','Masa Tarta',
  'Ravioles','Raviolones','Sorrentinos','Tallarines','Tagliatelle',
  'Pack Ravioles',
  'Ravioles Congelados','Sorrentinos Congelados',
  'Empanadas x 3','Pizzas Congeladas',
  'Salsas 200 g','Salsas 480 g',
]
function sfRank(sf) {
  const i = SF_ORDER.indexOf(sf)
  return i === -1 ? 99 : i
}

// ── Agrupación ────────────────────────────────────────────────────────────────
function getMasasGroup(item) {
  if (item.desc.toLowerCase().includes('light')) return 'Masas Light'
  const sf = item.sf
  if (['Copetin','Empanadas x 12','Empanadas x 20','Empanadas x 40','Empanadas XL','Empanadas x 6'].includes(sf))
    return 'Masas para Empanadas'
  if (['Tapas Rectangulares','Tapas Redondas'].includes(sf)) return 'Masas para Tapas'
  if (sf === 'Masa Tarta') return 'Masas para Tartas'
  return 'Masas para Empanadas'
}

const isPM = m => m === 'PASTAMANIA' || m === 'PASTAMANÍA'

const SHEET_DEFS = [
  {
    name: 'AVANTI MASAS',
    filter: i => i.familia === 'Masas' && i.marca === 'AVANTI',
    getGroup: i => getMasasGroup(i),
    groupOrder: ['Masas para Empanadas','Masas para Tapas','Masas para Tartas','Masas Light'],
    accent: RED,
    pvpFill: LRED,
  },
  {
    name: 'AVANTI PASTAS Y SALSAS',
    filter: i => i.marca === 'AVANTI' && i.familia !== 'Masas',
    getGroup: i => {
      if (i.familia === 'Pastas Frescas ATM') return 'Pasta Fresca Envasada'
      if (i.familia === 'Salsas') return 'Salsas'
      if (i.familia === 'Empanadas Congeladas') return 'Empanadas Congeladas'
      if (i.familia === 'Pastas Congeladas') return 'Pastas Congeladas'
      if (i.familia === 'Pizzas Congeladas') return 'Pizzas Congeladas'
      return i.familia
    },
    groupOrder: ['Pasta Fresca Envasada','Salsas','Empanadas Congeladas','Pastas Congeladas','Pizzas Congeladas'],
    accent: RED,
    pvpFill: LRED,
  },
  {
    name: 'PASTAMANIA',
    filter: i => isPM(i.marca),
    getGroup: i => {
      if (i.familia === 'Masas') return getMasasGroup(i)
      if (i.sf === 'Pack Ravioles' || i.familia === 'Pastas Frescas ATM') return 'Pasta Fresca Envasada'
      return i.familia
    },
    groupOrder: ['Masas para Empanadas','Masas para Tapas','Pasta Fresca Envasada','Pastas Congeladas'],
    accent: BLUE,
    pvpFill: LBLUE,
  },
]

// ── Helpers de estilo ─────────────────────────────────────────────────────────
function bold(cell, bg, fg = WHITE) {
  cell.fill      = { type:'pattern', pattern:'solid', fgColor:{ argb:bg } }
  cell.font      = { bold:true, color:{ argb:fg }, size:8, name:'Arial' }
  cell.alignment = { horizontal:'center', vertical:'middle', wrapText:true }
}

function numCell(cell, value, fmt = '"$"#,##0.00', bg = WHITE) {
  cell.value     = value ?? null
  if (value != null) cell.numFmt = fmt
  cell.font      = { size:8, name:'Arial' }
  cell.alignment = { horizontal:'right', vertical:'middle' }
  cell.fill      = { type:'pattern', pattern:'solid', fgColor:{ argb:bg } }
}

function txtCell(cell, value, bg = WHITE, align = 'left') {
  cell.value     = value ?? ''
  cell.font      = { size:8, name:'Arial' }
  cell.fill      = { type:'pattern', pattern:'solid', fgColor:{ argb:bg } }
  cell.alignment = { horizontal:align, vertical:'middle' }
  cell.numFmt    = '@'
}

// ── Construcción de cada hoja ─────────────────────────────────────────────────
// Columnas:
//  A(2) B(18) C(10) D(44) E(12) F(14) G(14) H(14) I(12) J(2) K(14) L(14) M(10)
//  A spacer | B EAN | C COD | D DESC | E UNITS | F S/IVA | G C/IVA | H PVP | I MARGEN | J spacer | K ANT S/IVA | L ANT C/IVA | M AUMENTO

function buildSheet(wb, def, sheetItems, fechaVig) {
  if (!sheetItems.length) return

  const ws = wb.addWorksheet(def.name)
  ws.columns = [
    { width:2  },  // A spacer
    { width:18 },  // B EAN
    { width:10 },  // C COD
    { width:44 },  // D DESC
    { width:12 },  // E UNITS
    { width:14 },  // F PRECIO S/IVA
    { width:14 },  // G PRECIO C/IVA
    { width:14 },  // H PVP SUGERIDO
    { width:12 },  // I MARGEN DIST
    { width:2  },  // J spacer
    { width:14 },  // K ANT S/IVA
    { width:14 },  // L ANT C/IVA
    { width:10 },  // M AUMENTO
  ]

  // Fila 1: banners
  ws.getRow(1).height = 48
  ws.mergeCells('B1:I1')
  const bannerCell = ws.getCell('B1')
  bannerCell.value     = `DISTRIBUCIÓN INTERIOR  |  Vigencia: ${fechaVig}`
  bannerCell.fill      = { type:'pattern', pattern:'solid', fgColor:{ argb:DBROWN } }
  bannerCell.font      = { bold:true, size:13, name:'Arial', color:{ argb:WHITE } }
  bannerCell.alignment = { horizontal:'center', vertical:'middle' }

  ws.mergeCells('K1:M1')
  const antBanner = ws.getCell('K1')
  antBanner.value     = 'PRECIOS ANTERIORES'
  antBanner.fill      = { type:'pattern', pattern:'solid', fgColor:{ argb:GRAY } }
  antBanner.font      = { bold:true, size:9, name:'Arial', color:{ argb:WHITE } }
  antBanner.alignment = { horizontal:'center', vertical:'middle' }

  let row = 2

  // Agrupar y ordenar
  const porGrupo = {}
  for (const item of sheetItems) {
    const g = def.getGroup(item)
    if (!porGrupo[g]) porGrupo[g] = []
    porGrupo[g].push(item)
  }

  const defined = def.groupOrder.filter(g => porGrupo[g])
  const rest    = Object.keys(porGrupo).filter(g => !def.groupOrder.includes(g)).sort()
  const grupos  = [...defined, ...rest]

  for (const grupo of grupos) {
    const groupItems = porGrupo[grupo]
    if (!groupItems?.length) continue

    // Sub-cabecera de grupo
    ws.getRow(row).height = 16
    ws.mergeCells(`B${row}:I${row}`)
    const gh = ws.getCell(`B${row}`)
    gh.value     = grupo.toUpperCase()
    gh.fill      = { type:'pattern', pattern:'solid', fgColor:{ argb:def.accent } }
    gh.font      = { bold:true, size:9, name:'Arial', color:{ argb:WHITE } }
    gh.alignment = { horizontal:'left', vertical:'middle', indent:1 }

    ws.mergeCells(`K${row}:M${row}`)
    const antGh = ws.getCell(`K${row}`)
    antGh.value     = 'LISTA DE PRECIOS ANT'
    antGh.fill      = { type:'pattern', pattern:'solid', fgColor:{ argb:GRAY } }
    antGh.font      = { bold:true, size:9, name:'Arial', color:{ argb:WHITE } }
    antGh.alignment = { horizontal:'center', vertical:'middle' }
    row++

    // Cabeceras de columna
    ws.getRow(row).height = 30
    const hdrs = [
      { col:'B', lbl:'COD. BARRAS',         bg:def.accent },
      { col:'C', lbl:'COD.\nINTERNO',        bg:def.accent },
      { col:'D', lbl:'DESCRIPCION',          bg:def.accent },
      { col:'E', lbl:'UNIDADES\nPAQ / CAJA', bg:def.accent },
      { col:'F', lbl:'PRECIO\nS/IVA',        bg:def.accent },
      { col:'G', lbl:'PRECIO\nC/IVA',        bg:def.accent },
      { col:'H', lbl:'PVP\nSUGERIDO',        bg:def.accent },
      { col:'I', lbl:'MARGEN\nDIST.',        bg:def.accent },
      { col:'K', lbl:'COSTO\nS/IVA ANT',     bg:GRAY },
      { col:'L', lbl:'COSTO\nC/IVA ANT',     bg:GRAY },
      { col:'M', lbl:'AUMENTO',              bg:GRAY },
    ]
    for (const h of hdrs) {
      const cell = ws.getCell(`${h.col}${row}`)
      bold(cell, h.bg)
      cell.value = h.lbl
    }
    row++

    // Filas de datos
    groupItems
      .sort((a, b) => {
        const d = sfRank(a.sf) - sfRank(b.sf)
        return d !== 0 ? d : a.desc.localeCompare(b.desc)
      })
      .forEach((item, idx) => {
        const r  = ws.getRow(row)
        r.height = 18
        const bg = idx % 2 === 0 ? LGRAY : WHITE

        const aumento = item.ant_neto > 0 ? (item.neto - item.ant_neto) / item.ant_neto : null
        const margen  = item.pvp > 0 ? 1 - item.civa / item.pvp : null

        ws.getCell(`A${row}`).fill = { type:'pattern', pattern:'solid', fgColor:{ argb:bg } }

        txtCell(ws.getCell(`B${row}`), item.ean, bg, 'left')
        ws.getCell(`B${row}`).numFmt = '@'
        txtCell(ws.getCell(`C${row}`), item.cod, bg, 'center')
        txtCell(ws.getCell(`D${row}`), item.desc, bg)
        txtCell(ws.getCell(`E${row}`), item.uc ? `${item.uc} PAQ` : '', bg, 'center')

        numCell(ws.getCell(`F${row}`), item.neto,  '"$"#,##0.00', bg)
        numCell(ws.getCell(`G${row}`), item.civa,  '"$"#,##0.00', bg)

        // H: PVP sugerido destacado
        numCell(ws.getCell(`H${row}`), item.pvp, '"$"#,##0.00', def.pvpFill)
        ws.getCell(`H${row}`).font = { bold:true, size:8, name:'Arial' }

        // I: Margen distribuidor
        if (margen !== null) {
          ws.getCell(`I${row}`).value     = margen
          ws.getCell(`I${row}`).numFmt    = '0.0%'
          ws.getCell(`I${row}`).font      = { bold:true, size:8, name:'Arial', color:{ argb:'FF1B5E20' } }
          ws.getCell(`I${row}`).fill      = { type:'pattern', pattern:'solid', fgColor:{ argb:LORANGE } }
          ws.getCell(`I${row}`).alignment = { horizontal:'center', vertical:'middle' }
        }

        ws.getCell(`J${row}`).fill = { type:'pattern', pattern:'solid', fgColor:{ argb:bg } }

        numCell(ws.getCell(`K${row}`), item.ant_neto,  '"$"#,##0.00', bg)
        numCell(ws.getCell(`L${row}`), item.ant_civa,  '"$"#,##0.00', bg)

        if (aumento !== null) {
          ws.getCell(`M${row}`).value     = aumento
          ws.getCell(`M${row}`).numFmt    = '0.0%'
          ws.getCell(`M${row}`).font      = { size:8, name:'Arial', color:{ argb: aumento > 0 ? GREEN : 'FFC62828' } }
          ws.getCell(`M${row}`).fill      = { type:'pattern', pattern:'solid', fgColor:{ argb:bg } }
          ws.getCell(`M${row}`).alignment = { horizontal:'center', vertical:'middle' }
        }

        row++
      })

    row++ // espacio entre grupos
  }

  ws.views = [{ state:'frozen', ySplit:1 }]
}

// ── Función principal ─────────────────────────────────────────────────────────
async function main() {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Avanti Uruguay'
  wb.created = new Date()

  const fechaVig = '06/07/2026'  // vigencia julio 2026

  for (const def of SHEET_DEFS) {
    buildSheet(wb, def, ITEMS.filter(i => def.filter(i)), fechaVig)
  }

  const outPath = path.join(__dirname, 'simulacion-interior-julio-2026.xlsx')
  await wb.xlsx.writeFile(outPath)
  console.log('✓ Guardado:', outPath)
}

main().catch(err => { console.error(err); process.exit(1) })
