// Real photographs, bundled offline. Stable IDs preserve existing account selections.
export const AVATARS = [
  {
    "id": "ourquran-avatar:gold-crescent",
    "name": "Sacred Kaaba",
    "file": "gold-crescent.jpg",
    "title": "File:The Kaaba during Hajj - edited.jpg",
    "author": "Adli Wahid\n\nMinor modifications made by Basile Morin, from the original version.",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:The_Kaaba_during_Hajj_-_edited.jpg"
  },
  {
    "id": "ourquran-avatar:emerald-mosque",
    "name": "Madinah Green",
    "file": "emerald-mosque.jpg",
    "title": "File:Green dome, Masjid e Nabawi, Medina, KSA.jpg",
    "author": "Syed Wali Peeran",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Green_dome,_Masjid_e_Nabawi,_Medina,_KSA.jpg"
  },
  {
    "id": "ourquran-avatar:midnight-kaaba",
    "name": "Jerusalem Gold",
    "file": "midnight-kaaba.jpg",
    "title": "File:Jerusalem-2013(2)-Temple Mount-Dome of the Rock (SE exposure).jpg",
    "author": "Godot13",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Jerusalem-2013(2)-Temple_Mount-Dome_of_the_Rock_(SE_exposure).jpg"
  },
  {
    "id": "ourquran-avatar:sapphire-star",
    "name": "Abu Dhabi Ivory",
    "file": "sapphire-star.jpg",
    "title": "File:Abu Dhabi Masque inside.jpg",
    "author": "Dubaideena",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Abu_Dhabi_Masque_inside.jpg"
  },
  {
    "id": "ourquran-avatar:amber-lantern",
    "name": "Casablanca Sun",
    "file": "amber-lantern.jpg",
    "title": "File:Sunshine on mosque Hassan II in Casablanca, Morocco - Flickr - Milamber's portfolio.jpg",
    "author": "Milamber's portfolio",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Sunshine_on_mosque_Hassan_II_in_Casablanca,_Morocco_-_Flickr_-_Milamber%27s_portfolio.jpg"
  },
  {
    "id": "ourquran-avatar:ivory-mihrab",
    "name": "Istanbul Twilight",
    "file": "ivory-mihrab.jpg",
    "title": "File:Blue Mosque Courtyard Dusk Wikimedia Commons.jpg",
    "author": "Benh LIEU SONG (Flickr)",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Blue_Mosque_Courtyard_Dusk_Wikimedia_Commons.jpg"
  },
  {
    "id": "ourquran-avatar:jade-palm",
    "name": "Shiraz Rose",
    "file": "jade-palm.jpg",
    "title": "File:Nasir-al molk -1.jpg",
    "author": "Ayyoubsabawiki",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Nasir-al_molk_-1.jpg"
  },
  {
    "id": "ourquran-avatar:rose-rosette",
    "name": "Muscat Marble",
    "file": "rose-rosette.jpg",
    "title": "File:Sultan Qaboos Grand Mosque (1).jpg",
    "author": "Mostafameraji",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Sultan_Qaboos_Grand_Mosque_(1).jpg"
  },
  {
    "id": "ourquran-avatar:silver-dome",
    "name": "Brunei Reflection",
    "file": "silver-dome.jpg",
    "title": "File:Sultan Omar Ali Saifuddin Mosque 02.jpg",
    "author": "sam garza from Los Angeles, USA",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Sultan_Omar_Ali_Saifuddin_Mosque_02.jpg"
  },
  {
    "id": "ourquran-avatar:teal-quran",
    "name": "Andalusian Mosaic",
    "file": "teal-quran.jpg",
    "title": "File:Tassellatura alhambra.jpg",
    "author": "gruban",
    "license": "CC BY-SA 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Tassellatura_alhambra.jpg"
  }
] as const;
export function getAvatar(value?: string) { return AVATARS.find(a => a.id === value) ?? AVATARS[0]; }
