/* RODAR — datos de demostración. Precios, unidades y personas son de ejemplo.
   Fotos: Pexels (licencia libre), ver CREDITOS.md. */

const CONFIG = {
  tna: 0.45,             // tasa nominal anual de referencia para la simulación
  anticipoMin: 0.3,
  plazos: [12, 24, 36, 48],
  sena: 200000,          // seña reembolsable para reservar
  horasReserva: 72,
  pctInmediata: 0.82,    // venta inmediata: RODAR compra el auto
  comisionConsignacion: 0.04, // consignación: se publica a precio de mercado y se cobra al vender
};

const SEDES = ["Córdoba Capital", "Villa Carlos Paz", "Rosario", "CABA"];

const COLORES = {
  blanco: { nombre: "Blanco", hex: "#eef0f3" },
  gris: { nombre: "Gris plata", hex: "#a9b0bb" },
  negro: { nombre: "Negro", hex: "#2a2e36" },
  rojo: { nombre: "Rojo", hex: "#c8322b" },
  azul: { nombre: "Azul", hex: "#2f5aa8" },
  verde: { nombre: "Verde", hex: "#3f7d5c" },
  arena: { nombre: "Arena", hex: "#c9b48f" },
  amarillo: { nombre: "Amarillo", hex: "#e2b33a" },
  naranja: { nombre: "Naranja", hex: "#e0702e" },
};

// valor de referencia de un 0 km por modelo (para la cotización del vendedor)
const MODELOS = {
  "Volkswagen": { "Gol Trend": { carroceria: "hatch", base: 22000000 }, "Golf": { carroceria: "hatch", base: 46000000 }, "T-Cross": { carroceria: "suv", base: 44000000 }, "T-Roc": { carroceria: "suv", base: 52000000 }, "Amarok": { carroceria: "pickup", base: 62000000 } },
  "Peugeot": { "208": { carroceria: "hatch", base: 30000000 }, "2008": { carroceria: "suv", base: 38000000 } },
  "Fiat": { "Cronos": { carroceria: "sedan", base: 27000000 }, "Argo": { carroceria: "hatch", base: 30500000 } },
  "Toyota": { "Etios": { carroceria: "hatch", base: 25000000 }, "Yaris": { carroceria: "hatch", base: 33000000 }, "Corolla": { carroceria: "sedan", base: 48000000 }, "Corolla Cross": { carroceria: "suv", base: 52000000 }, "Hilux": { carroceria: "pickup", base: 68000000 } },
  "Chevrolet": { "Onix": { carroceria: "hatch", base: 27500000 }, "Tracker": { carroceria: "suv", base: 39000000 }, "Silverado": { carroceria: "pickup", base: 90000000 } },
  "Renault": { "Sandero": { carroceria: "hatch", base: 24000000 }, "Clio": { carroceria: "hatch", base: 26000000 }, "Duster": { carroceria: "suv", base: 33000000 } },
  "Ford": { "EcoSport": { carroceria: "suv", base: 31000000 }, "Ranger": { carroceria: "pickup", base: 60000000 } },
  "Nissan": { "Kicks": { carroceria: "suv", base: 37000000 } },
  "Jeep": { "Renegade": { carroceria: "suv", base: 40000000 } },
};

const CARROCERIAS = { hatch: "Hatchback", sedan: "Sedán", suv: "SUV", pickup: "Pick-up" };

function crearDatosIniciales() {
  // foto: id de Pexels (img/<id>.jpg) · pos: encuadre (object-position)
  const autos = [
    ["a1", "Peugeot", "208", "1.6 Allure", 2022, 38500, "manual", "nafta", "blanco", 24500000, "Córdoba Capital", { rebaja: 900000, foto: 23156446 }],
    ["a2", "Toyota", "Yaris", "1.5 XS CVT", 2021, 41200, "automatica", "nafta", "amarillo", 25900000, "Villa Carlos Paz", { foto: 5733711 }],
    ["a3", "Volkswagen", "Golf", "1.4 TSI Highline", 2018, 74800, "manual", "nafta", "rojo", 27400000, "Rosario", { foto: 10843557 }],
    ["a4", "Volkswagen", "Golf", "1.4 TSI Comfortline DSG", 2020, 52100, "automatica", "nafta", "azul", 31900000, "Córdoba Capital", { foto: 17110456 }],
    ["a5", "Toyota", "Corolla", "1.8 XEI CVT", 2019, 62300, "automatica", "nafta", "blanco", 29900000, "CABA", { foto: 37620310 }],
    ["a6", "Renault", "Clio", "1.6 Intens", 2021, 44100, "manual", "nafta", "blanco", 19200000, "Córdoba Capital", { rebaja: 600000, foto: 20037393 }],
    ["a7", "Toyota", "Corolla Cross", "2.0 XEI CVT", 2022, 29500, "automatica", "nafta", "rojo", 41500000, "Villa Carlos Paz", { foto: 14825003 }],
    ["a8", "Volkswagen", "T-Roc", "1.4 TSI Comfortline AT", 2021, 39800, "automatica", "nafta", "gris", 38900000, "Rosario", { foto: 15668418 }],
    ["a9", "Renault", "Duster", "1.6 Intens 4x2", 2020, 58900, "manual", "nafta", "naranja", 21400000, "CABA", { foto: 19923014 }],
    ["a12", "Ford", "Ranger", "3.2 Wildtrak 4x4 AT", 2020, 87600, "automatica", "diesel", "naranja", 40900000, "Rosario", { foto: 16058147 }],
    ["a13", "Toyota", "Hilux", "2.8 SRV 4x4", 2019, 98400, "manual", "diesel", "negro", 42500000, "Córdoba Capital", { foto: 18240251 }],
    ["a14", "Ford", "Ranger", "3.0 XLT 4x4", 2011, 168400, "manual", "diesel", "azul", 17800000, "Villa Carlos Paz", { foto: 10842901 }],
    ["a15", "Volkswagen", "Amarok", "2.0 Highline 4x4", 2019, 104300, "manual", "diesel", "negro", 39500000, "Rosario", { foto: 23247753 }],
    ["a16", "Chevrolet", "Silverado", "5.3 LT 4x4", 2007, 182000, "automatica", "nafta", "gris", 24900000, "CABA", { foto: 9182736 }],
  ].map(([id, marca, modelo, version, anio, km, trans, comb, color, precio, sede, extra = {}]) => ({
    id, marca, modelo, version, anio, km, transmision: trans, combustible: comb, color, precio, sede,
    carroceria: MODELOS[marca][modelo].carroceria,
    rebaja: extra.rebaja || 0,
    foto: extra.foto ? `img/${extra.foto}.jpg` : null,
    fotoPos: extra.pos || "50% 55%",
    duenios: km > 80000 ? 2 : 1,
    serviceOficial: km < 70000,
    observaciones: km > 60000 ? ["Cambio de pastillas de freno", "Pulido de óptica delantera"] : ["Cambio de escobillas"],
    estado: "disponible",
  }));
  return {
    version: 2,
    autos,
    favoritos: ["a5", "a8"],
    reservas: [],
    ventas: [],
    seq: { reserva: 2401, venta: 801 },
  };
}
