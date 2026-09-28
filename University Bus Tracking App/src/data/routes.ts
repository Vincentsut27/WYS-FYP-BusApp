import type { Route, Stop } from "../types/transit";

function makeStop(id: string, name: string, lat: number, lng: number): Stop {
  return { id, name, shortName: name, lat, lng };
}

export const STOPS: Record<string, Stop> = {
  stationPiazza: makeStop("stationPiazza", "Station Piazza", 22.41402418241919, 114.20951365384028),
  postgraduateHall1: makeStop("postgraduateHall1", "Postgraduate Hall 1", 22.420263, 114.212156),
  sports: makeStop("sports", "Univ. Sports Centre", 22.417786, 114.210515),
  shawHall: makeStop("shawHall", "Sir Run Run Shaw Hall", 22.419865390456728, 114.20697616419724),
  fungKingHey: makeStop("fungKingHey", "Fung King Hey Bldg.", 22.420004165692188, 114.20314134034673),
  unitedUp: makeStop("unitedUp", "United College (Upward)", 22.42033254674031, 114.20540209166288),
  newAsia: makeStop("newAsia", "New Asia College", 22.421349, 114.207530),
  unitedDown: makeStop("unitedDown", "United College (Downward)", 22.42033254674031, 114.20540209166288),
  admin: makeStop("admin", "Univ. Admin. Bldg.", 22.418812277340415, 114.2053521300643),
  shHo: makeStop("shHo", "S.H. Ho College", 22.417999, 114.209951),
  universityStation: makeStop("universityStation", "Univ. Station", 22.414591596662277, 114.2103213737358),
  stationPiazzaNonTeaching: makeStop("stationPiazzaNonTeaching", "Station Piazza (non-teaching days)", 22.41402418241919, 114.20951365384028),
  residencesDown: makeStop("residencesDown", "Wu Yee Sun College (Downward)", 22.42118818776006, 114.2034603496885),
  residencesUp: makeStop("residencesUp", "Wu Yee Sun College (Upward)", 22.42118818776006, 114.2034603496885),
  chanChunHa: makeStop("chanChunHa", "Chan Chun Ha Hostel", 22.42201994564561, 114.20494713239741),
  ucStaff: makeStop("ucStaff", "U.C. Staff Residence", 22.423007, 114.205779),
  cwChuDown: makeStop("cwChuDown", "C.W. Chu College (Downward)", 22.425662, 114.206056),
  cwChuUp: makeStop("cwChuUp", "CW Chu College (Upward)", 22.425662, 114.206056),
  shawUp: makeStop("shawUp", "Shaw College (Upward)", 22.422482793334858, 114.20129809371062),
  shawDown: makeStop("shawDown", "Shaw College (Downward)", 22.422482793334858, 114.20129809371062),
  yiap: makeStop("yiap", "Y.I.A.P.", 22.415976075794102, 114.21082288564051),
  chungChiTeaching: makeStop("chungChiTeaching", "Chung Chi Teaching Bldg.", 22.416110051980585, 114.20836398267592),
  chungChiNonTeaching: makeStop("chungChiNonTeaching", "Chung Chi Teaching Bldg. (non-teaching days)", 22.416110051980585, 114.20836398267592),
  circuitEastUp: makeStop("circuitEastUp", "Campus Circuit East (Upward)", 22.42081397563455, 114.21269586733412),
  circuitNorth: makeStop("circuitNorth", "Campus Circuit North", 22.425648654353616, 114.20674541151153),
  circuitEastDown: makeStop("circuitEastDown", "Campus Circuit East (Downward)", 22.42081397563455, 114.21269586733412),
  scienceCentre: makeStop("scienceCentre", "Science Centre", 22.419861083772084, 114.20719745848922),
  newAsiaCircle: makeStop("newAsiaCircle", "New Asia Circle", 22.421072776114638, 114.20765936415471),
  wuYeeSunUp: makeStop("wuYeeSunUp", "Wu Yee Sun College (Upward)", 22.42118818776006, 114.2034603496885),
  wuYeeSunDown: makeStop("wuYeeSunDown", "Wu Yee Sun College (Downward)", 22.42118818776006, 114.2034603496885),
  area39: makeStop("area39", "Area 39 (Upward)", 22.427561, 114.204514),
  area39Down: makeStop("area39Down", "Area 39 (Downward)", 22.427561, 114.204514),
  postgraduateHall: makeStop("postgraduateHall", "Postgraduate Hall 1", 22.4162, 114.2090),
  universityResidence15: makeStop("universityResidence15", "University Residence No. 15", 22.423765, 114.206629),
  universityStationTeaching: makeStop("universityStationTeaching", "Univ. Station (teaching days only)", 22.414591596662277, 114.2103213737358),
  universityMtr: makeStop("universityMtr", "University Station", 22.414591596662277, 114.2103213737358),
  universitySports: makeStop("universitySports", "University Sports Centre", 22.417786, 114.210515),
  residences34Up: makeStop("residences34Up", "Wu Yee Sun College (Upward)", 22.42118818776006, 114.2034603496885),
  residences34Down: makeStop("residences34Down", "Wu Yee Sun College (Downward)", 22.42118818776006, 114.2034603496885),
};

export const ROUTES: Route[] = [
  {
    id: "1", label: "1", description: "Main Campus", color: "#DB2777",
    operatingDays: "Mon – Sat (Suspended on Sunday & Public Holidays)", serviceHours: "07:40 – 18:55",
    frequency: "Every 10, 25, 40, 55 minutes", stopIds: ["universityStation", "sports", "shawHall", "admin", "shHo", "universityStation"],
  },
  {
    id: "2", label: "2", description: "NA / UC", color: "#0F766E",
    operatingDays: "Mon – Sat (except Public Holidays)", serviceHours: "07:45 – 18:45",
    frequency: "Every 15, 45 minutes", notes: "Buses departing from 31 to 00 minutes stop at Sir Run Run Shaw Hall.",
    stopIds: ["stationPiazza", "sports", "shawHall", "fungKingHey", "unitedUp", "newAsia", "unitedDown", "admin", "shHo", "universityStation"],
  },
  {
    id: "2S", label: "2S", description: "NA / UC (Special)", color: "#0284C7",
    operatingDays: "Mon – Sat (except Public Holidays)", serviceHours: "08:00 – 18:30", frequency: "Every 00, 30 minutes",
    stopIds: ["stationPiazza", "postgraduateHall1", "sports", "shawHall", "fungKingHey", "unitedUp", "newAsia", "unitedDown", "admin", "shHo", "postgraduateHall1", "universityStation"],
  },
  {
    id: "3", label: "3", description: "Shaw College", color: "#DC2626",
    operatingDays: "Mon – Sat (except Public Holidays)", serviceHours: "09:00 – 18:40", frequency: "Every 00, 20, 40 minutes",
    stopIds: ["yiap", "sports", "scienceCentre", "fungKingHey", "wuYeeSunUp", "shawUp", "cwChuDown", "universityResidence15", "ucStaff", "chanChunHa", "shawDown", "wuYeeSunDown", "admin", "shHo", "stationPiazza"],
  },
  {
    id: "4", label: "4", description: "Circuit Road", color: "#B45309",
    operatingDays: "Mon – Sat (except Public Holidays)", serviceHours: "07:30 – 18:50", frequency: "Every 10, 30, 50 minutes",
    stopIds: ["yiap", "circuitEastUp", "cwChuUp", "area39", "cwChuDown", "universityResidence15", "ucStaff", "chanChunHa", "shawDown", "wuYeeSunDown", "newAsia", "unitedDown", "admin", "shHo", "universityStation"],
  },
  {
    id: "5", label: "5", description: "Upward", color: "#7C3AED",
    operatingDays: "Mon – Fri (Teaching days only); Sat (Teaching days only)", serviceHours: "Mon–Fri 09:18 – 17:26; Sat 09:18 – 13:26", frequency: "Every 18, 22, 26 minutes",
    stopIds: ["chungChiTeaching", "sports", "shawHall", "fungKingHey", "unitedUp", "newAsia", "wuYeeSunUp", "shawUp", "cwChuDown"],
  },
  {
    id: "6A", label: "6A", description: "Downward – CWC", color: "#059669",
    operatingDays: "Mon – Fri (Teaching days only); Sat (Teaching days only)", serviceHours: "Mon–Fri 09:10 – 17:10; Sat 09:10 – 13:10", frequency: "Every 10 minutes",
    stopIds: ["cwChuDown", "ucStaff", "chanChunHa", "wuYeeSunDown", "newAsia", "unitedDown", "admin", "shHo", "stationPiazza", "chungChiTeaching"],
  },
  {
    id: "6B", label: "6B", description: "Downward – NA / UC", color: "#D97706",
    operatingDays: "Mon – Fri (Teaching days only)", serviceHours: "12:20 – 17:20", frequency: "Every 20 minutes",
    stopIds: ["newAsia", "unitedDown", "admin", "shHo", "stationPiazza", "chungChiTeaching"],
  },
  {
    id: "7", label: "7", description: "Downward – Shaw", color: "#DC2626",
    operatingDays: "Mon – Fri (Teaching days only); Sat (Teaching days only)", serviceHours: "Mon–Fri 08:18 – 17:18; Sat 08:18 – 13:18", frequency: "Every 00, 18 minutes",
    stopIds: ["shawDown", "wuYeeSunDown", "newAsia", "unitedDown", "admin", "shHo", "stationPiazza", "chungChiTeaching"],
  },
  {
    id: "8", label: "8", description: "Western Campus", color: "#B45309",
    operatingDays: "Mon – Sat (except Public Holidays)", serviceHours: "07:35 – 18:35", frequency: "Every 15, 35, 55 minutes",
    notes: "On non-teaching days, buses stop at Station Piazza and Chung Chi Teaching Bldg. instead of Univ. Station.",
    stopIds: ["yiap", "circuitEastUp", "cwChuUp", "area39", "cwChuDown", "ucStaff", "chanChunHa", "shawDown", "wuYeeSunDown", "admin", "scienceCentre", "newAsiaCircle", "unitedDown", "wuYeeSunUp", "shawUp", "area39Down", "circuitNorth", "circuitEastDown", "universityStationTeaching", "stationPiazzaNonTeaching", "chungChiNonTeaching"],
  },
  {
    id: "N", label: "N", description: "Night Service", color: "#1E293B",
    operatingDays: "Mon – Sat (except Public Holidays)", serviceHours: "19:00 – 23:30", frequency: "Every 00, 15, 30, 45 minutes",
    notes: "Buses departing at 00 minutes stop at Postgraduate Hall 1.",
    stopIds: ["universityStation", "postgraduateHall1", "sports", "shawHall", "newAsiaCircle", "unitedDown", "wuYeeSunUp", "shawUp", "area39", "cwChuDown", "universityResidence15", "ucStaff", "chanChunHa", "shawDown", "wuYeeSunDown", "newAsia", "unitedDown", "admin", "shHo", "postgraduateHall1", "universityStation"],
  },
  {
    id: "H", label: "H", description: "Holiday Route", color: "#4D7C0F",
    operatingDays: "Sun & Public Holidays", serviceHours: "08:20 – 23:20", frequency: "Every 00, 20, 40 minutes",
    stopIds: ["universityStation", "postgraduateHall1", "sports", "shawHall", "newAsiaCircle", "unitedDown", "wuYeeSunUp", "shawUp", "area39", "cwChuDown", "universityResidence15", "ucStaff", "chanChunHa", "shawDown", "wuYeeSunDown", "newAsia", "unitedDown", "admin", "shHo", "postgraduateHall1", "universityStation"],
  },
];