export interface CarModel {
  name: string;
  years: number[];
}

export interface CarMake {
  make: string;
  models: CarModel[];
}

const currentYear = new Date().getFullYear();
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => to - i);

export const CAR_DATA: CarMake[] = [
  {
    make: 'Toyota',
    models: [
      { name: 'Camry', years: range(1990, currentYear) },
      { name: 'Corolla', years: range(1990, currentYear) },
      { name: 'RAV4', years: range(1994, currentYear) },
      { name: 'Land Cruiser', years: range(1990, currentYear) },
      { name: 'Highlander', years: range(2001, currentYear) },
      { name: 'Prius', years: range(1997, currentYear) },
      { name: 'Yaris', years: range(1999, currentYear) },
      { name: 'Auris', years: range(2006, 2019) },
      { name: 'Avensis', years: range(1997, 2018) },
      { name: 'CHR', years: range(2016, currentYear) },
    ],
  },
  {
    make: 'Volkswagen',
    models: [
      { name: 'Golf', years: range(1990, currentYear) },
      { name: 'Passat', years: range(1990, currentYear) },
      { name: 'Polo', years: range(1990, currentYear) },
      { name: 'Tiguan', years: range(2007, currentYear) },
      { name: 'Touareg', years: range(2002, currentYear) },
      { name: 'Jetta', years: range(1990, currentYear) },
      { name: 'T-Roc', years: range(2017, currentYear) },
      { name: 'Caddy', years: range(1996, currentYear) },
      { name: 'Touran', years: range(2003, currentYear) },
      { name: 'Arteon', years: range(2017, currentYear) },
    ],
  },
  {
    make: 'BMW',
    models: [
      { name: '3 Series', years: range(1990, currentYear) },
      { name: '5 Series', years: range(1990, currentYear) },
      { name: 'X5', years: range(1999, currentYear) },
      { name: 'X3', years: range(2003, currentYear) },
      { name: '1 Series', years: range(2004, currentYear) },
      { name: '7 Series', years: range(1990, currentYear) },
      { name: 'X1', years: range(2009, currentYear) },
      { name: 'X6', years: range(2008, currentYear) },
      { name: '2 Series', years: range(2014, currentYear) },
      { name: 'M3', years: range(1990, currentYear) },
    ],
  },
  {
    make: 'Mercedes-Benz',
    models: [
      { name: 'C-Class', years: range(1993, currentYear) },
      { name: 'E-Class', years: range(1990, currentYear) },
      { name: 'S-Class', years: range(1990, currentYear) },
      { name: 'GLC', years: range(2015, currentYear) },
      { name: 'GLE', years: range(2015, currentYear) },
      { name: 'A-Class', years: range(1997, currentYear) },
      { name: 'CLA', years: range(2013, currentYear) },
      { name: 'GLK', years: range(2008, 2019) },
      { name: 'ML', years: range(1997, 2015) },
      { name: 'Sprinter', years: range(1995, currentYear) },
    ],
  },
  {
    make: 'Audi',
    models: [
      { name: 'A4', years: range(1994, currentYear) },
      { name: 'A6', years: range(1994, currentYear) },
      { name: 'Q5', years: range(2008, currentYear) },
      { name: 'Q7', years: range(2005, currentYear) },
      { name: 'A3', years: range(1996, currentYear) },
      { name: 'A5', years: range(2007, currentYear) },
      { name: 'Q3', years: range(2011, currentYear) },
      { name: 'A8', years: range(1994, currentYear) },
      { name: 'TT', years: range(1998, currentYear) },
      { name: 'A1', years: range(2010, currentYear) },
    ],
  },
  {
    make: 'Ford',
    models: [
      { name: 'Focus', years: range(1998, currentYear) },
      { name: 'Fiesta', years: range(1990, 2023) },
      { name: 'Mondeo', years: range(1993, 2022) },
      { name: 'Kuga', years: range(2008, currentYear) },
      { name: 'Explorer', years: range(1990, currentYear) },
      { name: 'F-150', years: range(1990, currentYear) },
      { name: 'Mustang', years: range(1990, currentYear) },
      { name: 'Ranger', years: range(1998, currentYear) },
      { name: 'Edge', years: range(2006, currentYear) },
      { name: 'EcoSport', years: range(2003, currentYear) },
    ],
  },
  {
    make: 'Hyundai',
    models: [
      { name: 'Tucson', years: range(2004, currentYear) },
      { name: 'Elantra', years: range(1990, currentYear) },
      { name: 'Santa Fe', years: range(2000, currentYear) },
      { name: 'Sonata', years: range(1990, currentYear) },
      { name: 'i30', years: range(2007, currentYear) },
      { name: 'Accent', years: range(1994, currentYear) },
      { name: 'Kona', years: range(2017, currentYear) },
      { name: 'ix35', years: range(2009, 2022) },
      { name: 'Creta', years: range(2015, currentYear) },
      { name: 'i20', years: range(2008, currentYear) },
    ],
  },
  {
    make: 'Kia',
    models: [
      { name: 'Sportage', years: range(1993, currentYear) },
      { name: 'Sorento', years: range(2002, currentYear) },
      { name: 'Cerato', years: range(2003, currentYear) },
      { name: 'Rio', years: range(2000, currentYear) },
      { name: 'Ceed', years: range(2006, currentYear) },
      { name: 'Stinger', years: range(2017, currentYear) },
      { name: 'Niro', years: range(2016, currentYear) },
      { name: 'Picanto', years: range(2004, currentYear) },
      { name: 'Optima', years: range(2000, 2020) },
      { name: 'Stonic', years: range(2017, currentYear) },
    ],
  },
  {
    make: 'Opel',
    models: [
      { name: 'Astra', years: range(1991, currentYear) },
      { name: 'Corsa', years: range(1990, currentYear) },
      { name: 'Insignia', years: range(2008, currentYear) },
      { name: 'Zafira', years: range(1999, 2019) },
      { name: 'Mokka', years: range(2012, currentYear) },
      { name: 'Vectra', years: range(1990, 2008) },
      { name: 'Meriva', years: range(2003, 2017) },
      { name: 'Antara', years: range(2006, 2015) },
      { name: 'Omega', years: range(1990, 2003) },
      { name: 'Grandland X', years: range(2017, currentYear) },
    ],
  },
  {
    make: 'Skoda',
    models: [
      { name: 'Octavia', years: range(1996, currentYear) },
      { name: 'Fabia', years: range(1999, currentYear) },
      { name: 'Superb', years: range(2001, currentYear) },
      { name: 'Kodiaq', years: range(2016, currentYear) },
      { name: 'Karoq', years: range(2017, currentYear) },
      { name: 'Rapid', years: range(2012, 2021) },
      { name: 'Scala', years: range(2018, currentYear) },
      { name: 'Yeti', years: range(2009, 2017) },
      { name: 'Roomster', years: range(2006, 2015) },
      { name: 'Kamiq', years: range(2019, currentYear) },
    ],
  },
  {
    make: 'Renault',
    models: [
      { name: 'Megane', years: range(1995, currentYear) },
      { name: 'Clio', years: range(1990, currentYear) },
      { name: 'Logan', years: range(2004, currentYear) },
      { name: 'Duster', years: range(2010, currentYear) },
      { name: 'Scenic', years: range(1996, currentYear) },
      { name: 'Laguna', years: range(1993, 2015) },
      { name: 'Sandero', years: range(2007, currentYear) },
      { name: 'Kadjar', years: range(2015, currentYear) },
      { name: 'Captur', years: range(2013, currentYear) },
      { name: 'Koleos', years: range(2007, currentYear) },
    ],
  },
  {
    make: 'Peugeot',
    models: [
      { name: '206', years: range(1998, 2013) },
      { name: '207', years: range(2006, 2014) },
      { name: '208', years: range(2012, currentYear) },
      { name: '301', years: range(2012, currentYear) },
      { name: '307', years: range(2001, 2012) },
      { name: '308', years: range(2007, currentYear) },
      { name: '407', years: range(2004, 2011) },
      { name: '508', years: range(2011, currentYear) },
      { name: '2008', years: range(2013, currentYear) },
      { name: '3008', years: range(2008, currentYear) },
    ],
  },
  {
    make: 'Mazda',
    models: [
      { name: 'CX-5', years: range(2012, currentYear) },
      { name: 'Mazda 3', years: range(2003, currentYear) },
      { name: 'Mazda 6', years: range(2002, currentYear) },
      { name: 'CX-3', years: range(2015, currentYear) },
      { name: 'CX-7', years: range(2006, 2012) },
      { name: 'CX-9', years: range(2007, currentYear) },
      { name: 'MX-5', years: range(1990, currentYear) },
      { name: 'Mazda 2', years: range(2002, currentYear) },
      { name: 'BT-50', years: range(2006, currentYear) },
      { name: 'RX-8', years: range(2003, 2012) },
    ],
  },
  {
    make: 'Honda',
    models: [
      { name: 'Civic', years: range(1990, currentYear) },
      { name: 'Accord', years: range(1990, currentYear) },
      { name: 'CR-V', years: range(1995, currentYear) },
      { name: 'HR-V', years: range(1999, currentYear) },
      { name: 'Jazz', years: range(2001, currentYear) },
      { name: 'Pilot', years: range(2003, currentYear) },
      { name: 'Fit', years: range(2001, currentYear) },
      { name: 'Ridgeline', years: range(2005, currentYear) },
      { name: 'Insight', years: range(1999, currentYear) },
      { name: 'Element', years: range(2003, 2011) },
    ],
  },
  {
    make: 'Nissan',
    models: [
      { name: 'Qashqai', years: range(2006, currentYear) },
      { name: 'X-Trail', years: range(2000, currentYear) },
      { name: 'Juke', years: range(2010, currentYear) },
      { name: 'Leaf', years: range(2010, currentYear) },
      { name: 'Tiida', years: range(2004, 2019) },
      { name: 'Almera', years: range(1995, 2018) },
      { name: 'Note', years: range(2005, currentYear) },
      { name: 'Murano', years: range(2002, currentYear) },
      { name: 'Navara', years: range(2004, currentYear) },
      { name: 'Pathfinder', years: range(1990, currentYear) },
    ],
  },
  {
    make: 'Mitsubishi',
    models: [
      { name: 'Outlander', years: range(2001, currentYear) },
      { name: 'Lancer', years: range(1990, 2017) },
      { name: 'ASX', years: range(2010, currentYear) },
      { name: 'Pajero', years: range(1990, currentYear) },
      { name: 'Eclipse Cross', years: range(2017, currentYear) },
      { name: 'L200', years: range(1996, currentYear) },
      { name: 'Galant', years: range(1990, 2012) },
      { name: 'Colt', years: range(1990, 2013) },
      { name: 'Carisma', years: range(1995, 2004) },
      { name: 'Space Star', years: range(1998, currentYear) },
    ],
  },
  {
    make: 'Subaru',
    models: [
      { name: 'Forester', years: range(1997, currentYear) },
      { name: 'Outback', years: range(1994, currentYear) },
      { name: 'Impreza', years: range(1992, currentYear) },
      { name: 'XV', years: range(2011, currentYear) },
      { name: 'Legacy', years: range(1990, currentYear) },
      { name: 'WRX', years: range(2014, currentYear) },
      { name: 'BRZ', years: range(2012, currentYear) },
      { name: 'Tribeca', years: range(2005, 2014) },
      { name: 'Ascent', years: range(2018, currentYear) },
      { name: 'Crosstrek', years: range(2012, currentYear) },
    ],
  },
  {
    make: 'Jeep',
    models: [
      { name: 'Wrangler', years: range(1990, currentYear) },
      { name: 'Cherokee', years: range(1990, currentYear) },
      { name: 'Grand Cherokee', years: range(1992, currentYear) },
      { name: 'Compass', years: range(2006, currentYear) },
      { name: 'Renegade', years: range(2014, currentYear) },
      { name: 'Gladiator', years: range(2019, currentYear) },
      { name: 'Patriot', years: range(2006, 2017) },
      { name: 'Commander', years: range(2006, 2010) },
    ],
  },
  {
    make: 'Land Rover',
    models: [
      { name: 'Range Rover', years: range(1990, currentYear) },
      { name: 'Discovery', years: range(1990, currentYear) },
      { name: 'Defender', years: range(1990, currentYear) },
      { name: 'Freelander', years: range(1997, 2014) },
      { name: 'Evoque', years: range(2011, currentYear) },
      { name: 'Velar', years: range(2017, currentYear) },
      { name: 'Discovery Sport', years: range(2014, currentYear) },
    ],
  },
  {
    make: 'Volvo',
    models: [
      { name: 'XC90', years: range(2002, currentYear) },
      { name: 'XC60', years: range(2008, currentYear) },
      { name: 'V60', years: range(2010, currentYear) },
      { name: 'V70', years: range(1996, 2016) },
      { name: 'S60', years: range(2000, currentYear) },
      { name: 'S80', years: range(1998, 2016) },
      { name: 'XC40', years: range(2017, currentYear) },
      { name: 'S40', years: range(1995, 2012) },
    ],
  },
  {
    make: 'Chevrolet',
    models: [
      { name: 'Cruze', years: range(2008, 2019) },
      { name: 'Captiva', years: range(2006, 2019) },
      { name: 'Aveo', years: range(2002, 2017) },
      { name: 'Malibu', years: range(1997, currentYear) },
      { name: 'Equinox', years: range(2004, currentYear) },
      { name: 'Traverse', years: range(2008, currentYear) },
      { name: 'Suburban', years: range(1990, currentYear) },
      { name: 'Tahoe', years: range(1995, currentYear) },
      { name: 'Silverado', years: range(1999, currentYear) },
      { name: 'Spark', years: range(2010, currentYear) },
    ],
  },
  {
    make: 'Suzuki',
    models: [
      { name: 'Swift', years: range(1990, currentYear) },
      { name: 'Vitara', years: range(1990, currentYear) },
      { name: 'SX4', years: range(2006, currentYear) },
      { name: 'Grand Vitara', years: range(1998, 2015) },
      { name: 'Jimny', years: range(1998, currentYear) },
      { name: 'Baleno', years: range(2015, currentYear) },
      { name: 'Ignis', years: range(2016, currentYear) },
    ],
  },
  {
    make: 'Fiat',
    models: [
      { name: 'Punto', years: range(1993, 2018) },
      { name: 'Bravo', years: range(1995, 2014) },
      { name: 'Panda', years: range(1990, currentYear) },
      { name: '500', years: range(2007, currentYear) },
      { name: 'Tipo', years: range(2015, currentYear) },
      { name: 'Doblo', years: range(2000, currentYear) },
      { name: 'Ducato', years: range(1990, currentYear) },
    ],
  },
  {
    make: 'Seat',
    models: [
      { name: 'Ibiza', years: range(1990, currentYear) },
      { name: 'Leon', years: range(1999, currentYear) },
      { name: 'Ateca', years: range(2016, currentYear) },
      { name: 'Arona', years: range(2017, currentYear) },
      { name: 'Tarraco', years: range(2018, currentYear) },
      { name: 'Alhambra', years: range(1996, currentYear) },
      { name: 'Toledo', years: range(1991, 2019) },
    ],
  },
  {
    make: 'Citroen',
    models: [
      { name: 'C3', years: range(2002, currentYear) },
      { name: 'C4', years: range(2004, currentYear) },
      { name: 'C5', years: range(2000, currentYear) },
      { name: 'Berlingo', years: range(1996, currentYear) },
      { name: 'Picasso', years: range(1999, 2016) },
      { name: 'Jumper', years: range(1994, currentYear) },
      { name: 'C-Elysee', years: range(2012, currentYear) },
    ],
  },
  {
    make: 'Lexus',
    models: [
      { name: 'RX', years: range(1998, currentYear) },
      { name: 'NX', years: range(2014, currentYear) },
      { name: 'IS', years: range(1998, currentYear) },
      { name: 'GS', years: range(1993, 2020) },
      { name: 'LS', years: range(1990, currentYear) },
      { name: 'ES', years: range(1990, currentYear) },
      { name: 'LX', years: range(1996, currentYear) },
    ],
  },
  {
    make: 'Porsche',
    models: [
      { name: 'Cayenne', years: range(2002, currentYear) },
      { name: 'Macan', years: range(2014, currentYear) },
      { name: '911', years: range(1990, currentYear) },
      { name: 'Panamera', years: range(2009, currentYear) },
      { name: 'Taycan', years: range(2019, currentYear) },
      { name: 'Boxster', years: range(1996, currentYear) },
    ],
  },
  {
    make: 'Tesla',
    models: [
      { name: 'Model 3', years: range(2017, currentYear) },
      { name: 'Model S', years: range(2012, currentYear) },
      { name: 'Model X', years: range(2015, currentYear) },
      { name: 'Model Y', years: range(2020, currentYear) },
      { name: 'Cybertruck', years: range(2023, currentYear) },
    ],
  },
  {
    make: 'Dacia',
    models: [
      { name: 'Logan', years: range(2004, currentYear) },
      { name: 'Sandero', years: range(2007, currentYear) },
      { name: 'Duster', years: range(2010, currentYear) },
      { name: 'Dokker', years: range(2012, currentYear) },
      { name: 'Lodgy', years: range(2012, currentYear) },
      { name: 'Spring', years: range(2021, currentYear) },
    ],
  },
  {
    make: 'Alfa Romeo',
    models: [
      { name: 'Giulia', years: range(2015, currentYear) },
      { name: 'Stelvio', years: range(2017, currentYear) },
      { name: '156', years: range(1997, 2007) },
      { name: '147', years: range(2000, 2010) },
      { name: '159', years: range(2005, 2012) },
      { name: 'Giulietta', years: range(2010, 2020) },
    ],
  },
  {
    make: 'Lada',
    models: [
      { name: 'Vesta', years: range(2015, currentYear) },
      { name: 'Granta', years: range(2011, currentYear) },
      { name: 'Niva Legend', years: range(1977, currentYear) },
      { name: 'Largus', years: range(2012, currentYear) },
      { name: 'XRAY', years: range(2015, currentYear) },
      { name: '2107', years: range(1982, 2012) },
    ],
  },
  {
    make: 'ZAZ',
    models: [
      { name: 'Slavuta', years: range(1999, 2011) },
      { name: 'Sens', years: range(2002, 2011) },
      { name: 'Forza', years: range(2011, 2017) },
      { name: 'Vida', years: range(2012, 2017) },
    ],
  },
  {
    make: 'Geely',
    models: [
      { name: 'Atlas', years: range(2016, currentYear) },
      { name: 'CK', years: range(2005, 2016) },
      { name: 'Emgrand', years: range(2009, currentYear) },
      { name: 'Coolray', years: range(2019, currentYear) },
      { name: 'Tugella', years: range(2019, currentYear) },
    ],
  },
  {
    make: 'Chery',
    models: [
      { name: 'Tiggo 3', years: range(2014, currentYear) },
      { name: 'Tiggo 7', years: range(2016, currentYear) },
      { name: 'Tiggo 8', years: range(2018, currentYear) },
      { name: 'Arrizo 5', years: range(2015, currentYear) },
      { name: 'QQ', years: range(2003, 2018) },
    ],
  },
  {
    make: 'Great Wall',
    models: [
      { name: 'Hover H5', years: range(2010, currentYear) },
      { name: 'Hover H6', years: range(2011, currentYear) },
      { name: 'Wingle 7', years: range(2018, currentYear) },
      { name: 'Poer', years: range(2019, currentYear) },
    ],
  },
];

export function getMakes(): string[] {
  return CAR_DATA.map((c) => c.make);
}

export function getModels(make: string): string[] {
  return CAR_DATA.find((c) => c.make === make)?.models.map((m) => m.name) ?? [];
}

export function getYears(make: string, model: string): number[] {
  return CAR_DATA.find((c) => c.make === make)?.models.find((m) => m.name === model)?.years ?? [];
}
