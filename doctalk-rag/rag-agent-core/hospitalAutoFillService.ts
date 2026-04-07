/**
 * Hospital Auto-Fill Service
 *
 * Fetches hospital information from public APIs (HIRA, Kakao) and
 * populates hospitalSettings for organizations linked to a facility code.
 *
 * Think of it like an address auto-complete: you type a postal code and
 * the system fills in the city, street, and coordinates automatically.
 */

// ── Department code → name mapping (HIRA 진료과코드) ──────────────────────
const DEPARTMENT_CODE_MAP: Record<string, string> = {
  "01": "내과",
  "02": "신경과",
  "03": "정신건강의학과",
  "04": "소아청소년과",
  "05": "정신건강의학과",
  "06": "정형외과",
  "07": "신경외과",
  "08": "피부과",
  "09": "비뇨의학과",
  "10": "안과",
  "11": "이비인후과",
  "12": "정형외과",
  "13": "신경외과",
  "14": "흉부외과",
  "15": "성형외과",
  "16": "마취통증의학과",
  "17": "산부인과",
  "18": "영상의학과",
  "19": "진단검사의학과",
  "20": "신경과",
  "21": "재활의학과",
  "22": "핵의학과",
  "23": "가정의학과",
  "24": "응급의학과",
  "25": "직업환경의학과",
  "26": "응급의학과",
  "49": "치과",
  "50": "구강악안면외과",
  "51": "치과보철과",
  "52": "치과교정과",
  "53": "소아치과",
  "54": "치주과",
  "55": "치과보존과",
  "56": "구강내과",
  "57": "영상치의학과",
  "58": "구강병리과",
  "59": "예방치과",
  "80": "한의원",
  "81": "한방병원",
};

// ── Hospital type code → name mapping (HIRA 종별코드) ──────────────────────
const HOSPITAL_TYPE_MAP: Record<string, string> = {
  "01": "상급종합병원",
  "11": "종합병원",
  "21": "병원",
  "28": "요양병원",
  "29": "정신병원",
  "31": "의원",
  "41": "치과병원",
  "42": "치과의원",
  "51": "한방병원",
  "52": "한의원",
  "61": "조산원",
  "71": "보건소",
  "72": "보건지소",
  "73": "보건진료소",
  "74": "보건의료원",
  "75": "보건지소",
  "81": "약국",
  "91": "기타",
  "92": "기타",
};

export interface HospitalAutoFillResult {
  facilityCode: string;
  hospitalName: string;
  address: string;
  phone: string;
  departments: string[];
  hospitalType: string;
  latitude: string | null;
  longitude: string | null;
  openDate: string | null;
  source: "HIRA" | "MANUAL";
}

// ── In-memory cache (24h TTL) ──────────────────────────────────────────────
interface CacheEntry {
  result: HospitalAutoFillResult | null;
  timestamp: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCachedResult(facilityCode: string): HospitalAutoFillResult | null | undefined {
  const entry = cache.get(facilityCode);
  if (!entry) return undefined; // cache miss
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(facilityCode);
    return undefined; // expired
  }
  return entry.result; // could be null (= HIRA returned no data)
}

function setCachedResult(facilityCode: string, result: HospitalAutoFillResult | null): void {
  cache.set(facilityCode, { result, timestamp: Date.now() });
}

// ── HIRA API ───────────────────────────────────────────────────────────────

interface HiraItem {
  yadmNm?: string;     // 병원명
  addr?: string;       // 주소
  telno?: string;      // 전화번호
  dgsbjtCd?: string;   // 진료과 코드 (콤마 구분)
  clCd?: string;       // 종별코드
  clCdNm?: string;     // 종별명
  sidoCd?: string;
  sgguCd?: string;
  emdongNm?: string;
  postNo?: string;
  hospUrl?: string;
  estbDd?: string;     // 개설일자 (YYYYMMDD)
  XPos?: number;       // 경도
  YPos?: number;       // 위도
}

async function fetchFromHira(facilityCode: string): Promise<HiraItem | null> {
  const apiKey = process.env.HIRA_API_KEY;
  if (!apiKey) {
    console.warn("[HospitalAutoFill] HIRA_API_KEY not configured — skipping HIRA lookup");
    return null;
  }

  const url = new URL("https://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList");
  url.searchParams.set("ServiceKey", apiKey);
  url.searchParams.set("ykiho", facilityCode);
  url.searchParams.set("numOfRows", "1");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("_type", "json");

  try {
    console.log(`[HospitalAutoFill] HIRA request: facilityCode=${facilityCode}`);
    const response = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) });

    if (!response.ok) {
      console.error(`[HospitalAutoFill] HIRA HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const items = data?.response?.body?.items?.item;
    if (!items) {
      console.log(`[HospitalAutoFill] HIRA returned no items for facilityCode=${facilityCode}`);
      return null;
    }

    // items can be a single object or an array
    const item: HiraItem = Array.isArray(items) ? items[0] : items;
    console.log(`[HospitalAutoFill] HIRA found: ${item.yadmNm} (${item.addr})`);
    return item;
  } catch (error: any) {
    console.error(`[HospitalAutoFill] HIRA fetch error for ${facilityCode}:`, error.message);
    return null;
  }
}

// ── Kakao Geocoding API ────────────────────────────────────────────────────

interface GeocodingResult {
  latitude: string;
  longitude: string;
}

async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    console.warn("[HospitalAutoFill] KAKAO_REST_API_KEY not configured — skipping geocoding");
    return null;
  }

  const url = new URL("https://dapi.kakao.com/v2/local/search/address");
  url.searchParams.set("query", address);

  try {
    console.log(`[HospitalAutoFill] Kakao geocode request: "${address}"`);
    const response = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      console.error(`[HospitalAutoFill] Kakao HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const doc = data?.documents?.[0];
    if (!doc) {
      console.log(`[HospitalAutoFill] Kakao returned no results for "${address}"`);
      return null;
    }

    return {
      longitude: doc.x,
      latitude: doc.y,
    };
  } catch (error: any) {
    console.error(`[HospitalAutoFill] Kakao geocode error for "${address}":`, error.message);
    return null;
  }
}

// ── Parse HIRA department codes ────────────────────────────────────────────

function parseDepartments(dgsbjtCd: string | undefined): string[] {
  if (!dgsbjtCd) return [];
  // HIRA returns comma-separated department codes
  return dgsbjtCd
    .split(",")
    .map((code) => code.trim())
    .map((code) => DEPARTMENT_CODE_MAP[code] || `진료과(${code})`)
    .filter((v, i, arr) => arr.indexOf(v) === i); // deduplicate
}

// ── Main auto-fill function ────────────────────────────────────────────────

export async function autoFillHospitalInfo(
  facilityCode: string
): Promise<HospitalAutoFillResult | null> {
  if (!facilityCode || facilityCode.trim().length === 0) {
    return null;
  }

  const trimmed = facilityCode.trim();

  // Check cache first
  const cached = getCachedResult(trimmed);
  if (cached !== undefined) {
    console.log(`[HospitalAutoFill] Cache ${cached ? "hit" : "hit (null)"} for ${trimmed}`);
    return cached;
  }

  // Fetch from HIRA
  const hiraItem = await fetchFromHira(trimmed);
  if (!hiraItem || !hiraItem.yadmNm) {
    setCachedResult(trimmed, null);
    return null;
  }

  // Parse HIRA data
  const departments = parseDepartments(hiraItem.dgsbjtCd);
  const hospitalType =
    HOSPITAL_TYPE_MAP[hiraItem.clCd || ""] ||
    hiraItem.clCdNm ||
    "의원";
  const address = hiraItem.addr || "";

  // Coordinates — HIRA provides XPos/YPos directly (no Kakao API needed)
  let latitude: string | null = null;
  let longitude: string | null = null;
  if (hiraItem.YPos && hiraItem.XPos) {
    latitude = String(hiraItem.YPos);
    longitude = String(hiraItem.XPos);
  } else if (address) {
    // Fallback to Kakao geocoding if HIRA coords missing
    const geo = await geocodeAddress(address);
    if (geo) {
      latitude = geo.latitude;
      longitude = geo.longitude;
    }
  }

  // Format open date
  let openDate: string | null = null;
  if (hiraItem.estbDd) {
    const raw = hiraItem.estbDd;
    if (raw.length === 8) {
      openDate = `${raw.substring(0, 4)}-${raw.substring(4, 6)}-${raw.substring(6, 8)}`;
    } else {
      openDate = raw;
    }
  }

  const result: HospitalAutoFillResult = {
    facilityCode: trimmed,
    hospitalName: hiraItem.yadmNm || "",
    address,
    phone: hiraItem.telno || "",
    departments,
    hospitalType,
    latitude,
    longitude,
    openDate,
    source: "HIRA",
  };

  setCachedResult(trimmed, result);
  return result;
}

// ── Batch auto-fill with rate limiting ─────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function batchAutoFillHospitals(
  facilityCodes: string[]
): Promise<Map<string, HospitalAutoFillResult>> {
  const results = new Map<string, HospitalAutoFillResult>();
  const uniqueCodes = Array.from(new Set(facilityCodes.map((c) => c.trim()).filter(Boolean)));

  // Process with concurrency limit of 5, 100ms delay between requests
  const concurrency = 5;
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueCodes.length; i += concurrency) {
    chunks.push(uniqueCodes.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (code) => {
      const result = await autoFillHospitalInfo(code);
      if (result) {
        results.set(code, result);
      }
    });
    await Promise.all(promises);
    // Rate limit: 100ms delay between batches
    await delay(100);
  }

  return results;
}

// ── Apply auto-fill result to hospitalSettings ─────────────────────────────

export async function applyAutoFillToOrg(
  orgId: string,
  result: HospitalAutoFillResult
): Promise<{ fieldsUpdated: string[] }> {
  const { db } = await import("../db");
  const { hospitalSettings } = await import("@shared/schema");
  const { eq } = await import("drizzle-orm");

  // Get existing settings
  const [existing] = await db
    .select()
    .from(hospitalSettings)
    .where(eq(hospitalSettings.orgId, orgId))
    .limit(1);

  const updates: Record<string, any> = {};
  const fieldsUpdated: string[] = [];

  // Only fill empty fields — never overwrite manual edits
  if (!existing?.hospitalName && result.hospitalName) {
    updates.hospitalName = result.hospitalName;
    fieldsUpdated.push("hospitalName");
  }
  if (!existing?.address && result.address) {
    updates.address = result.address;
    fieldsUpdated.push("address");
  }
  if (!existing?.phone && result.phone) {
    updates.phone = result.phone;
    fieldsUpdated.push("phone");
  }
  if (!existing?.hospitalType && result.hospitalType) {
    updates.hospitalType = result.hospitalType;
    fieldsUpdated.push("hospitalType");
  }
  if ((!existing?.department || existing.department.length === 0) && result.departments.length > 0) {
    updates.department = result.departments;
    fieldsUpdated.push("department");
  }
  if (!existing?.facilityCode && result.facilityCode) {
    updates.facilityCode = result.facilityCode;
    fieldsUpdated.push("facilityCode");
  }
  if (!existing?.latitude && result.latitude) {
    updates.latitude = result.latitude;
    fieldsUpdated.push("latitude");
  }
  if (!existing?.longitude && result.longitude) {
    updates.longitude = result.longitude;
    fieldsUpdated.push("longitude");
  }
  if (!existing?.openDate && result.openDate) {
    updates.openDate = result.openDate;
    fieldsUpdated.push("openDate");
  }

  if (fieldsUpdated.length === 0) {
    console.log(`[HospitalAutoFill] No empty fields to fill for orgId=${orgId}`);
    return { fieldsUpdated: [] };
  }

  if (existing) {
    await db
      .update(hospitalSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(hospitalSettings.orgId, orgId));
  } else {
    await db.insert(hospitalSettings).values({
      orgId,
      ...updates,
    });
  }

  console.log(`[HospitalAutoFill] Updated orgId=${orgId}: ${fieldsUpdated.join(", ")}`);
  return { fieldsUpdated };
}

// ── Trigger auto-fill for an org by facilityCode (non-blocking) ────────────

export function triggerAutoFillInBackground(
  orgId: string,
  facilityCode: string
): void {
  setImmediate(async () => {
    try {
      const result = await autoFillHospitalInfo(facilityCode);
      if (result) {
        await applyAutoFillToOrg(orgId, result);
      }
    } catch (error: any) {
      console.error(
        `[HospitalAutoFill] Background auto-fill failed for orgId=${orgId}, facilityCode=${facilityCode}:`,
        error.message
      );
    }
  });
}
