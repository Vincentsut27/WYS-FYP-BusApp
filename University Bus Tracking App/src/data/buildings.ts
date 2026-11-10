import type { CampusBuilding } from "../types/transit";
import type { Locale } from "../i18n/messages";

export function formatBuildingName(
  building: Pick<CampusBuilding, "name" | "nameZh" | "abbr">,
  locale: Locale = "en",
) {
  const name = locale === "zh-Hant" ? building.nameZh : building.name;
  return `${name} (${building.abbr})`;
}

export const CAMPUS_BUILDINGS: CampusBuilding[] = [
  { id: "cheng-yu-tung", name: "Cheng Yu Tung Building", nameZh: "鄭裕彤樓", abbr: "CYT", lat: 22.412291785439766, lng: 114.21046582241785 },
  { id: "yasumoto-iap", name: "Yasumoto International Academic Park", nameZh: "康本國際學術園", abbr: "YIA", lat: 22.416410297237793, lng: 114.21103510892452 },
  { id: "wu-ho-man-yuen", name: "Wu Ho Man Yuen Building", nameZh: "伍何曼原樓", abbr: "WMY", lat: 22.416769333159518, lng: 114.21188170282649 },
  { id: "esther-lee", name: "Esther Lee Building", nameZh: "利黃瑤璧樓", abbr: "ELB", lat: 22.414071872475585, lng: 114.20902479118207 },
  { id: "ho-tim", name: "Ho Tim Building", nameZh: "何添樓", abbr: "HTB", lat: 22.415507016347302, lng: 114.20799904421249 },
  { id: "wong-foo-yuan", name: "Wong Foo Yuan Building", nameZh: "王福元樓", abbr: "FYB", lat: 22.41508727242716, lng: 114.20743794983348 },
  { id: "sino", name: "Sino Building", nameZh: "信和樓", abbr: "SB", lat: 22.415855152294668, lng: 114.20713583776002 },
  { id: "chung-chi-theology", name: "Chung Chi College Theology Building", nameZh: "崇基學院神學樓", abbr: "CCT", lat: 22.41734175378623, lng: 114.20669806049771 },
  { id: "lee-shau-kee-architecture", name: "Lee Shau Kee Architecture Building", nameZh: "李兆基建築學大樓", abbr: "ARC", lat: 22.416348197291008, lng: 114.21177236844449 },
  { id: "chen-kou-bun", name: "Chen Kou Bun Building", nameZh: "陳國本樓", abbr: "CKB", lat: 22.41548228907249, lng: 114.20718229543112 },
  { id: "yc-liang", name: "Y.C. Liang Hall", nameZh: "梁銶琚堂", abbr: "LHC", lat: 22.420239665424297, lng: 114.20688186049772 },
  { id: "fung-king-hey", name: "Fung King Hey Building", nameZh: "馮景禧樓", abbr: "KHB", lat: 22.41967436607066, lng: 114.20323665125356 },
  { id: "leung-kau-kui", name: "Leung Kau Kui Building", nameZh: "梁銶琚樓", abbr: "KKB", lat: 22.42000384050957, lng: 114.2028930972801 },
  { id: "lee-shau-kee", name: "Lee Shau Kee Building", nameZh: "李兆基樓", abbr: "LSK", lat: 22.419830647994004, lng: 114.2039459242668 },
  { id: "li-dak-sum", name: "Li Dak Sum Building", nameZh: "李達三樓", abbr: "LDS", lat: 22.419535984148602, lng: 114.20411383166218 },
  { id: "science-centre", name: "University Science Centre", nameZh: "科學館", abbr: "SC", lat: 22.419486336856462, lng: 114.20796703276638 },
  { id: "lady-shaw", name: "Lady Shaw Building", nameZh: "邵逸夫夫人樓", abbr: "LSB", lat: 22.419172638431327, lng: 114.20691308193791 },
  { id: "mong-man-wai", name: "Mong Man Wai Building", nameZh: "蒙民偉樓", abbr: "MMW", lat: 22.420273497712536, lng: 114.20922516659573 },
  { id: "william-mong-engineering", name: "William M.W. Mong Engineering Building", nameZh: "蒙民偉工程學大樓", abbr: "ERB", lat: 22.418424293508565, lng: 114.20794978008902 },
  { id: "ho-sin-hang-engineering", name: "Ho Sin-Hang Engineering Building", nameZh: "何善衡工程學大樓", abbr: "SHB", lat: 22.418162502085913, lng: 114.20729478193778 },
  { id: "choh-ming-li-medical", name: "Choh-Ming Li Basic Medical Sciences Building", nameZh: "李卓敏基本醫學大樓", abbr: "BMS", lat: 22.419614091553427, lng: 114.2093189795377 },
  { id: "sui-loong-pao", name: "Sui-Loong Pao Building", nameZh: "兆龍樓", abbr: "SLP", lat: 22.41985731955389, lng: 114.20575003776011 },
  { id: "humanities", name: "Humanities Building", nameZh: "人文館", abbr: "NAH", lat: 22.421909170027362, lng: 114.20832184515561 },
  { id: "cheng-ming", name: "Cheng Ming Building", nameZh: "誠明館", abbr: "NAA", lat: 22.421417557380263, lng: 114.20854178138661 },
  { id: "tc-cheng", name: "T.C. Cheng Building", nameZh: "鄭棟材樓", abbr: "UCC", lat: 22.421445952968718, lng: 114.20449048193798 },
  { id: "tsang-shiu-tim", name: "Tsang Shiu Tim Building", nameZh: "曾肇添樓", abbr: "UCA", lat: 22.42071333622945, lng: 114.20484867399114 },
  { id: "wen-lan-tang", name: "Wen Lan Tang", nameZh: "文瀾堂", abbr: "WLS", lat: 22.423360461855758, lng: 114.20173979728021 },
];
