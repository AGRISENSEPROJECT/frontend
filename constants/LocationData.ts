// Real administrative divisions for East African countries

export const COUNTRIES = [
    { id: 'uganda', label: 'Uganda' },
    { id: 'kenya', label: 'Kenya' },
    { id: 'tanzania', label: 'Tanzania' },
    { id: 'rwanda', label: 'Rwanda' },
];

export const PROVINCES: Record<string, { id: string; label: string }[]> = {
    uganda: [
        { id: 'central', label: 'Central Region' },
        { id: 'eastern', label: 'Eastern Region' },
        { id: 'northern', label: 'Northern Region' },
        { id: 'western', label: 'Western Region' },
    ],
    kenya: [
        { id: 'nairobi', label: 'Nairobi County' },
        { id: 'mombasa', label: 'Mombasa County' },
        { id: 'kisumu', label: 'Kisumu County' },
        { id: 'nakuru', label: 'Nakuru County' },
        { id: 'kiambu', label: 'Kiambu County' },
        { id: 'uasin_gishu', label: 'Uasin Gishu County' },
    ],
    tanzania: [
        { id: 'dar_es_salaam', label: 'Dar es Salaam' },
        { id: 'arusha', label: 'Arusha' },
        { id: 'dodoma', label: 'Dodoma' },
        { id: 'mwanza', label: 'Mwanza' },
        { id: 'kilimanjaro', label: 'Kilimanjaro' },
    ],
    rwanda: [
        { id: 'kigali', label: 'Kigali City' },
        { id: 'eastern', label: 'Eastern Province' },
        { id: 'northern', label: 'Northern Province' },
        { id: 'southern', label: 'Southern Province' },
        { id: 'western', label: 'Western Province' },
    ],
};

export const SECTORS: Record<string, { id: string; label: string }[]> = {
    // Rwanda - Kigali City districts (complete sector lists)
    nyarugenge: [
        { id: 'gitega', label: 'Gitega' },
        { id: 'kanyinya', label: 'Kanyinya' },
        { id: 'kigali', label: 'Kigali' },
        { id: 'kimisagara', label: 'Kimisagara' },
        { id: 'mageragere', label: 'Mageragere' },
        { id: 'muhima', label: 'Muhima' },
        { id: 'nyakabanda', label: 'Nyakabanda' },
        { id: 'nyamirambo', label: 'Nyamirambo' },
        { id: 'nyarugenge_sector', label: 'Nyarugenge' },
        { id: 'rwezamenyo', label: 'Rwezamenyo' },
    ],
    gasabo: [
        { id: 'bumbogo', label: 'Bumbogo' },
        { id: 'gatsata', label: 'Gatsata' },
        { id: 'gikomero', label: 'Gikomero' },
        { id: 'gisozi', label: 'Gisozi' },
        { id: 'jabana', label: 'Jabana' },
        { id: 'jali', label: 'Jali' },
        { id: 'kacyiru', label: 'Kacyiru' },
        { id: 'kimihurura', label: 'Kimihurura' },
        { id: 'kimironko', label: 'Kimironko' },
        { id: 'kinyinya', label: 'Kinyinya' },
        { id: 'ndera', label: 'Ndera' },
        { id: 'nduba', label: 'Nduba' },
        { id: 'remera', label: 'Remera' },
        { id: 'rusororo', label: 'Rusororo' },
        { id: 'rutunga', label: 'Rutunga' },
    ],
    kicukiro: [
        { id: 'gahanga', label: 'Gahanga' },
        { id: 'gatenga', label: 'Gatenga' },
        { id: 'gikondo', label: 'Gikondo' },
        { id: 'kagarama', label: 'Kagarama' },
        { id: 'kanombe', label: 'Kanombe' },
        { id: 'kicukiro_sector', label: 'Kicukiro' },
        { id: 'kigarama', label: 'Kigarama' },
        { id: 'masaka_sector', label: 'Masaka' },
        { id: 'niboye', label: 'Niboye' },
        { id: 'nyarugunga', label: 'Nyarugunga' },
    ],
};

export const CELLS: Record<string, { id: string; label: string }[]> = {
    remera: [
        { id: 'rukiri_1', label: 'Rukiri I' },
        { id: 'rukiri_2', label: 'Rukiri II' },
        { id: 'nyarutarama', label: 'Nyarutarama' },
    ],
};

export const VILLAGES: Record<string, { id: string; label: string }[]> = {
    rukiri_1: [
        { id: 'amahoro', label: 'Amahoro' },
        { id: 'umucyo', label: 'Umucyo' },
    ],
};

export const DISTRICTS: Record<string, { id: string; label: string }[]> = {
    // Uganda Central
    central: [
        { id: 'kampala', label: 'Kampala' },
        { id: 'wakiso', label: 'Wakiso' },
        { id: 'mukono', label: 'Mukono' },
        { id: 'masaka', label: 'Masaka' },
        { id: 'luweero', label: 'Luweero' },
    ],
    // Uganda Eastern
    eastern: [
        { id: 'jinja', label: 'Jinja' },
        { id: 'mbale', label: 'Mbale' },
        { id: 'soroti', label: 'Soroti' },
        { id: 'tororo', label: 'Tororo' },
    ],
    // Kenya Nairobi
    nairobi: [
        { id: 'dagoretti', label: 'Dagoretti' },
        { id: 'embakasi', label: 'Embakasi' },
        { id: 'kasarani', label: 'Kasarani' },
        { id: 'kibra', label: 'Kibra' },
        { id: 'westlands', label: 'Westlands' },
    ],
    // Tanzania Dar es Salaam
    dar_es_salaam: [
        { id: 'kinondoni', label: 'Kinondoni' },
        { id: 'ilala', label: 'Ilala' },
        { id: 'temeke', label: 'Temeke' },
        { id: 'ubungo', label: 'Ubungo' },
        { id: 'kigamboni', label: 'Kigamboni' },
    ],
    // Rwanda Kigali
    kigali: [
        { id: 'nyarugenge', label: 'Nyarugenge' },
        { id: 'gasabo', label: 'Gasabo' },
        { id: 'kicukiro', label: 'Kicukiro' },
    ],
};

export const SOIL_TYPES = [
    { id: 'sandy', label: 'Sandy' },
    { id: 'clay', label: 'Clay' },
    { id: 'loamy', label: 'Loamy' },
    { id: 'silty', label: 'Silty' },
    { id: 'peaty', label: 'Peaty' },
    { id: 'chalky', label: 'Chalky' },
];
