// Administrative divisions for East African countries.
// IDs are namespaced per country (e.g. rw_eastern vs ug_eastern) so
// provinces with the same name in different countries never collide.

export const COUNTRIES = [
    { id: 'uganda', label: 'Uganda' },
    { id: 'kenya', label: 'Kenya' },
    { id: 'tanzania', label: 'Tanzania' },
    { id: 'rwanda', label: 'Rwanda' },
];

export const PROVINCES: Record<string, { id: string; label: string }[]> = {
    uganda: [
        { id: 'ug_central', label: 'Central Region' },
        { id: 'ug_eastern', label: 'Eastern Region' },
        { id: 'ug_northern', label: 'Northern Region' },
        { id: 'ug_western', label: 'Western Region' },
    ],
    kenya: [
        { id: 'ke_nairobi', label: 'Nairobi County' },
        { id: 'ke_mombasa', label: 'Mombasa County' },
        { id: 'ke_kisumu', label: 'Kisumu County' },
        { id: 'ke_nakuru', label: 'Nakuru County' },
        { id: 'ke_kiambu', label: 'Kiambu County' },
        { id: 'ke_uasin_gishu', label: 'Uasin Gishu County' },
    ],
    tanzania: [
        { id: 'tz_dar_es_salaam', label: 'Dar es Salaam' },
        { id: 'tz_arusha', label: 'Arusha' },
        { id: 'tz_dodoma', label: 'Dodoma' },
        { id: 'tz_mwanza', label: 'Mwanza' },
        { id: 'tz_kilimanjaro', label: 'Kilimanjaro' },
    ],
    rwanda: [
        { id: 'rw_kigali', label: 'Kigali City' },
        { id: 'rw_eastern', label: 'Eastern Province' },
        { id: 'rw_northern', label: 'Northern Province' },
        { id: 'rw_southern', label: 'Southern Province' },
        { id: 'rw_western', label: 'Western Province' },
    ],
};

export const DISTRICTS: Record<string, { id: string; label: string }[]> = {
    // Uganda
    ug_central: [
        { id: 'kampala', label: 'Kampala' },
        { id: 'wakiso', label: 'Wakiso' },
        { id: 'mukono', label: 'Mukono' },
        { id: 'masaka', label: 'Masaka' },
        { id: 'luweero', label: 'Luweero' },
    ],
    ug_eastern: [
        { id: 'jinja', label: 'Jinja' },
        { id: 'mbale', label: 'Mbale' },
        { id: 'soroti', label: 'Soroti' },
        { id: 'tororo', label: 'Tororo' },
    ],
    ug_northern: [
        { id: 'gulu', label: 'Gulu' },
        { id: 'lira', label: 'Lira' },
        { id: 'arua', label: 'Arua' },
        { id: 'kitgum', label: 'Kitgum' },
    ],
    ug_western: [
        { id: 'mbarara', label: 'Mbarara' },
        { id: 'kabale', label: 'Kabale' },
        { id: 'kasese', label: 'Kasese' },
        { id: 'hoima', label: 'Hoima' },
        { id: 'kabarole', label: 'Kabarole (Fort Portal)' },
    ],
    // Kenya (sub-counties)
    ke_nairobi: [
        { id: 'dagoretti', label: 'Dagoretti' },
        { id: 'embakasi', label: 'Embakasi' },
        { id: 'kasarani', label: 'Kasarani' },
        { id: 'kibra', label: 'Kibra' },
        { id: 'westlands', label: 'Westlands' },
    ],
    ke_mombasa: [
        { id: 'changamwe', label: 'Changamwe' },
        { id: 'jomvu', label: 'Jomvu' },
        { id: 'kisauni', label: 'Kisauni' },
        { id: 'likoni', label: 'Likoni' },
        { id: 'mvita', label: 'Mvita' },
        { id: 'nyali', label: 'Nyali' },
    ],
    ke_kisumu: [
        { id: 'kisumu_central', label: 'Kisumu Central' },
        { id: 'kisumu_east', label: 'Kisumu East' },
        { id: 'kisumu_west', label: 'Kisumu West' },
        { id: 'muhoroni', label: 'Muhoroni' },
        { id: 'nyando', label: 'Nyando' },
        { id: 'seme', label: 'Seme' },
    ],
    ke_nakuru: [
        { id: 'nakuru_town_east', label: 'Nakuru Town East' },
        { id: 'nakuru_town_west', label: 'Nakuru Town West' },
        { id: 'naivasha', label: 'Naivasha' },
        { id: 'njoro', label: 'Njoro' },
        { id: 'gilgil', label: 'Gilgil' },
        { id: 'molo', label: 'Molo' },
    ],
    ke_kiambu: [
        { id: 'thika_town', label: 'Thika Town' },
        { id: 'ruiru', label: 'Ruiru' },
        { id: 'juja', label: 'Juja' },
        { id: 'kikuyu', label: 'Kikuyu' },
        { id: 'limuru', label: 'Limuru' },
        { id: 'kiambu_town', label: 'Kiambu Town' },
    ],
    ke_uasin_gishu: [
        { id: 'ainabkoi', label: 'Ainabkoi' },
        { id: 'kapseret', label: 'Kapseret' },
        { id: 'kesses', label: 'Kesses' },
        { id: 'moiben', label: 'Moiben' },
        { id: 'soy', label: 'Soy' },
        { id: 'turbo', label: 'Turbo' },
    ],
    // Tanzania
    tz_dar_es_salaam: [
        { id: 'kinondoni', label: 'Kinondoni' },
        { id: 'ilala', label: 'Ilala' },
        { id: 'temeke', label: 'Temeke' },
        { id: 'ubungo', label: 'Ubungo' },
        { id: 'kigamboni', label: 'Kigamboni' },
    ],
    tz_arusha: [
        { id: 'arusha_city', label: 'Arusha City' },
        { id: 'arusha_rural', label: 'Arusha Rural' },
        { id: 'karatu', label: 'Karatu' },
        { id: 'longido', label: 'Longido' },
        { id: 'meru', label: 'Meru' },
        { id: 'monduli', label: 'Monduli' },
    ],
    tz_dodoma: [
        { id: 'dodoma_city', label: 'Dodoma City' },
        { id: 'bahi', label: 'Bahi' },
        { id: 'chamwino', label: 'Chamwino' },
        { id: 'chemba', label: 'Chemba' },
        { id: 'kondoa', label: 'Kondoa' },
        { id: 'mpwapwa', label: 'Mpwapwa' },
    ],
    tz_mwanza: [
        { id: 'ilemela', label: 'Ilemela' },
        { id: 'nyamagana', label: 'Nyamagana' },
        { id: 'magu', label: 'Magu' },
        { id: 'misungwi', label: 'Misungwi' },
        { id: 'sengerema', label: 'Sengerema' },
        { id: 'ukerewe', label: 'Ukerewe' },
    ],
    tz_kilimanjaro: [
        { id: 'moshi_municipal', label: 'Moshi Municipal' },
        { id: 'moshi_rural', label: 'Moshi Rural' },
        { id: 'hai', label: 'Hai' },
        { id: 'rombo', label: 'Rombo' },
        { id: 'same', label: 'Same' },
        { id: 'siha', label: 'Siha' },
        { id: 'mwanga', label: 'Mwanga' },
    ],
    // Rwanda (complete district lists)
    rw_kigali: [
        { id: 'nyarugenge', label: 'Nyarugenge' },
        { id: 'gasabo', label: 'Gasabo' },
        { id: 'kicukiro', label: 'Kicukiro' },
    ],
    rw_eastern: [
        { id: 'bugesera', label: 'Bugesera' },
        { id: 'gatsibo', label: 'Gatsibo' },
        { id: 'kayonza', label: 'Kayonza' },
        { id: 'kirehe', label: 'Kirehe' },
        { id: 'ngoma', label: 'Ngoma' },
        { id: 'nyagatare', label: 'Nyagatare' },
        { id: 'rwamagana', label: 'Rwamagana' },
    ],
    rw_northern: [
        { id: 'burera', label: 'Burera' },
        { id: 'gakenke', label: 'Gakenke' },
        { id: 'gicumbi', label: 'Gicumbi' },
        { id: 'musanze', label: 'Musanze' },
        { id: 'rulindo', label: 'Rulindo' },
    ],
    rw_southern: [
        { id: 'gisagara', label: 'Gisagara' },
        { id: 'huye', label: 'Huye' },
        { id: 'kamonyi', label: 'Kamonyi' },
        { id: 'muhanga', label: 'Muhanga' },
        { id: 'nyamagabe', label: 'Nyamagabe' },
        { id: 'nyanza', label: 'Nyanza' },
        { id: 'nyaruguru', label: 'Nyaruguru' },
        { id: 'ruhango', label: 'Ruhango' },
    ],
    rw_western: [
        { id: 'karongi', label: 'Karongi' },
        { id: 'ngororero', label: 'Ngororero' },
        { id: 'nyabihu', label: 'Nyabihu' },
        { id: 'nyamasheke', label: 'Nyamasheke' },
        { id: 'rubavu', label: 'Rubavu' },
        { id: 'rusizi', label: 'Rusizi' },
        { id: 'rutsiro', label: 'Rutsiro' },
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

export const SOIL_TYPES = [
    { id: 'sandy', label: 'Sandy' },
    { id: 'clay', label: 'Clay' },
    { id: 'loamy', label: 'Loamy' },
    { id: 'silty', label: 'Silty' },
    { id: 'peaty', label: 'Peaty' },
    { id: 'chalky', label: 'Chalky' },
];
