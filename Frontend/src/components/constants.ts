// Root Cause Categories for incident diagnosis
export const ROOT_CAUSE_CATEGORIES = {
  network: {
    id: "network",
    label_th: "อุปกรณ์เครือข่าย",
    label_en: "Network Equipment",
    items: [
      { value: "router", label_th: "Router", label_en: "Router" },
      { value: "switch", label_th: "Switch", label_en: "Switch" },
      { value: "firewall", label_th: "Firewall", label_en: "Firewall" },
      { value: "load_balancer", label_th: "Load Balancer", label_en: "Load Balancer" },
      { value: "gateway", label_th: "Gateway", label_en: "Gateway" },
      { value: "vpn", label_th: "VPN Gateway", label_en: "VPN Gateway" },
      { value: "wifi", label_th: "WiFi Access Point", label_en: "WiFi Access Point" },
    ],
  },
  server: {
    id: "server",
    label_th: "เซิร์ฟเวอร์",
    label_en: "Server",
    items: [
      { value: "physical_server", label_th: "Physical Server", label_en: "Physical Server" },
      { value: "virtual_machine", label_th: "Virtual Machine", label_en: "Virtual Machine" },
      { value: "container", label_th: "Container", label_en: "Container" },
      { value: "bare_metal", label_th: "Bare Metal", label_en: "Bare Metal" },
    ],
  },
  application: {
    id: "application",
    label_th: "แอปพลิเคชัน",
    label_en: "Application",
    items: [
      { value: "web_server", label_th: "Web Server", label_en: "Web Server" },
      { value: "database", label_th: "Database", label_en: "Database" },
      { value: "api_service", label_th: "API Service", label_en: "API Service" },
      { value: "middleware", label_th: "Middleware", label_en: "Middleware" },
      { value: "message_queue", label_th: "Message Queue", label_en: "Message Queue" },
    ],
  },
  storage: {
    id: "storage",
    label_th: "ที่เก็บข้อมูล",
    label_en: "Storage",
    items: [
      { value: "storage_array", label_th: "Storage Array", label_en: "Storage Array" },
      { value: "san", label_th: "SAN", label_en: "SAN" },
      { value: "nas", label_th: "NAS", label_en: "NAS" },
      { value: "disk", label_th: "Disk/Drive", label_en: "Disk/Drive" },
    ],
  },
  power: {
    id: "power",
    label_th: "ระบบไฟฟ้า",
    label_en: "Power System",
    items: [
      { value: "ups", label_th: "UPS", label_en: "UPS" },
      { value: "power_supply", label_th: "Power Supply", label_en: "Power Supply" },
      { value: "generator", label_th: "Generator", label_en: "Generator" },
      { value: "pdu", label_th: "PDU", label_en: "PDU" },
    ],
  },
  cooling: {
    id: "cooling",
    label_th: "ระบบระบายความร้อน",
    label_en: "Cooling System",
    items: [
      { value: "air_conditioner", label_th: "Air Conditioner", label_en: "Air Conditioner" },
      { value: "cooling_system", label_th: "Cooling System", label_en: "Cooling System" },
    ],
  },
  other: {
    id: "other",
    label_th: "อื่นๆ",
    label_en: "Other",
    items: [
      { value: "configuration", label_th: "Configuration Issue", label_en: "Configuration Issue" },
      { value: "user_error", label_th: "User Error", label_en: "User Error" },
      { value: "software_bug", label_th: "Software Bug", label_en: "Software Bug" },
      { value: "security", label_th: "Security Issue", label_en: "Security Issue" },
      { value: "unknown", label_th: "Unknown", label_en: "Unknown" },
    ],
  },
};

// Flatten function to get all items with their category
export const getAllRootCauseOptions = () => {
  const all: Array<{
    value: string;
    label_th: string;
    label_en: string;
    category: string;
  }> = [];

  Object.values(ROOT_CAUSE_CATEGORIES).forEach((category) => {
    category.items.forEach((item) => {
      all.push({
        ...item,
        category: category.id,
      });
    });
  });

  return all;
};

// Get label for a root cause value
export const getRootCauseLabel = (
  value: string,
  language: "th" | "en"
): string => {
  const langKey = language === "th" ? "label_th" : "label_en";

  // Handle custom prefixed values like "unknown: custom text" or "other: custom text"
  if (value.includes(": ")) {
    const [prefix, customText] = value.split(": ", 2);
    for (const category of Object.values(ROOT_CAUSE_CATEGORIES)) {
      const item = category.items.find((i) => i.value === prefix);
      if (item) {
        return `${item[langKey]} (${customText})`;
      }
    }
  }

  // Standard lookup
  for (const category of Object.values(ROOT_CAUSE_CATEGORIES)) {
    const item = category.items.find((i) => i.value === value);
    if (item) {
      return item[langKey];
    }
  }

  return value; // fallback to the value itself
};

// Get the category code from a root cause value (strips custom text)
export const getRootCauseCategoryCode = (value: string): string => {
  if (value.includes(": ")) {
    return value.split(": ", 1)[0];
  }
  return value;
};

// Keyword patterns for categorizing freeform root cause text
const CATEGORY_KEYWORD_PATTERNS: Array<{ re: RegExp; category: string }> = [
  {
    re: /switch|swit[a-z]*\s*err|router|firewall|fiber|wi.?fi|access.?point|\bap\b|vpn|gateway|network|lan|wan|link|cable|ethernet|\bnic\b|vlan|ชั้นเครือข่าย|สวิตช์|ไฟเบอร์|เราเตอร์/i,
    category: "network",
  },
  {
    re: /server|เซิร์ฟเวอร์|เครื่องแฮง|เครื่องค้าง|เครื่องดับ|virtual.?machine|\bvm\b|container|bare.?metal/i,
    category: "server",
  },
  {
    re: /database|\bdb\b|\bapi\b|web.?server|middleware|application|\bapp\b|service|queue|snmp|protocol|process|daemon/i,
    category: "application",
  },
  {
    re: /disk|storage|\bsan\b|\bnas\b|drive|\bhdd\b|\bssd\b|array|ฮาร์ดดิสก์/i,
    category: "storage",
  },
  {
    re: /power|ไฟ|ปลั๊ก|\bplug\b|\bups\b|\bpdu\b|electric|generator|battery|ไฟฟ้า/i,
    category: "power",
  },
  {
    re: /cool|temperature|heat|ความร้อน|อุณหภูมิ|\bac\b|air.?condition/i,
    category: "cooling",
  },
];

// Map a root cause value to its parent category id (network/server/application/...)
export const getRootCauseParentCategory = (value: string): string => {
  const code = value.includes(": ") ? value.split(": ", 1)[0] : value;

  // 1. Exact match against category items
  for (const category of Object.values(ROOT_CAUSE_CATEGORIES)) {
    if (category.items.some((item) => item.value === code)) {
      return category.id;
    }
  }

  // 2. Check if the stripped code is a category id itself (e.g. "other", "network")
  if (code in ROOT_CAUSE_CATEGORIES) {
    return code;
  }

  // 3. Keyword-based fallback for freeform text (covers Thai + English typos)
  for (const { re, category } of CATEGORY_KEYWORD_PATTERNS) {
    if (re.test(value)) {
      return category;
    }
  }

  return "other";
};

// Get display label for a category id
export const getCategoryLabel = (
  categoryId: string,
  language: "th" | "en",
): string => {
  const category =
    ROOT_CAUSE_CATEGORIES[categoryId as keyof typeof ROOT_CAUSE_CATEGORIES];
  if (!category) return categoryId;
  return language === "th" ? category.label_th : category.label_en;
};
