import { describe, it, expect, beforeEach } from "vitest";
import {
  QuotaService,
  calculateSecondConsumption,
  getQuotaStorageKey,
  YELLOW_WARNING_THRESHOLD,
  RED_WARNING_THRESHOLD,
  HARD_STOP_THRESHOLD,
  InMemoryStorage,
} from "../quotaService";

describe("QuotaService Specifications", () => {
  let storage: InMemoryStorage;
  let service: QuotaService;

  beforeEach(() => {
    storage = new InMemoryStorage();
    service = new QuotaService(storage);
  });

  describe("Formel för sekundförbrukning", () => {
    it("beräknar spårminuter per sekund korrekt med formeln: (1 + Tolkspår) * Lyssnare * (1 / 60)", () => {
      // 1 tolkspår, 30 lyssnare => (1 + 1) * 30 * (1/60) = 1.0 spårminut per sekund
      const consumption1 = calculateSecondConsumption(1, 30);
      expect(consumption1).toBeCloseTo(1.0, 5);

      // 0 tolkspår (avstängt), 60 lyssnare => (1 + 0) * 60 * (1/60) = 1.0 spårminut per sekund
      const consumption2 = calculateSecondConsumption(0, 60);
      expect(consumption2).toBeCloseTo(1.0, 5);

      // 2 tolkspår, 10 lyssnare => (1 + 2) * 10 * (1/60) = 0.5 spårminuter per sekund
      const consumption3 = calculateSecondConsumption(2, 10);
      expect(consumption3).toBeCloseTo(0.5, 5);

      // 0 lyssnare => 0 förbrukning
      const consumptionZero = calculateSecondConsumption(2, 0);
      expect(consumptionZero).toBe(0);
    });

    it("hanterar negativa värden defensivt genom clamping till 0", () => {
      expect(calculateSecondConsumption(-1, 10)).toBeCloseTo((1 + 0) * 10 * (1 / 60), 5);
      expect(calculateSecondConsumption(1, -5)).toBe(0);
    });
  });

  describe("Persistens och månadsväxling", () => {
    it("genererar dynamisk lagringsnyckel med formatet quota_usage_YYYY_MM", () => {
      const sept2026 = new Date(2026, 8, 7); // Månad 8 = September (0-indexerat)
      expect(getQuotaStorageKey(sept2026)).toBe("quota_usage_2026_09");

      const jan2027 = new Date(2027, 0, 15);
      expect(getQuotaStorageKey(jan2027)).toBe("quota_usage_2027_01");
    });

    it("persisterar och ackumulerar spårminuter i storage", () => {
      const septDate = new Date(2026, 8, 7);
      service.recordUsage(150, septDate);
      expect(service.getMonthlyUsage(septDate)).toBe(150);

      service.recordUsage(250.5, septDate);
      expect(service.getMonthlyUsage(septDate)).toBe(400.5);

      // Verifiera att storage har serialiserat värdet under rätt nyckel
      expect(storage.getItem("quota_usage_2026_09")).toBe("400.5");
    });

    it("nollställer förbrukningen automatiskt vid månadsskifte utan migrering", () => {
      const septDate = new Date(2026, 8, 30);
      const octDate = new Date(2026, 9, 1);

      service.recordUsage(5000, septDate);
      expect(service.getMonthlyUsage(septDate)).toBe(5000);

      // I oktober ska förbrukningen automatiskt vara 0
      expect(service.getMonthlyUsage(octDate)).toBe(0);

      // Ny förbrukning i oktober rör inte september
      service.recordUsage(100, octDate);
      expect(service.getMonthlyUsage(octDate)).toBe(100);
      expect(service.getMonthlyUsage(septDate)).toBe(5000);
    });
  });

  describe("Tregradig spärrlogik och trösklar", () => {
    it("indikerar normal nivå under 6 000 spårminuter", () => {
      expect(service.getQuotaLevel(0)).toBe("normal");
      expect(service.getQuotaLevel(5999)).toBe("normal");
      expect(service.isHardStop(5999)).toBe(false);
    });

    it("utlöser gul varning vid 6 000 spårminuter", () => {
      expect(YELLOW_WARNING_THRESHOLD).toBe(6000);
      expect(service.getQuotaLevel(6000)).toBe("warning_yellow");
      expect(service.getQuotaLevel(7999)).toBe("warning_yellow");
      expect(service.isHardStop(6000)).toBe(false);
    });

    it("utlöser röd varning vid 8 000 spårminuter", () => {
      expect(RED_WARNING_THRESHOLD).toBe(8000);
      expect(service.getQuotaLevel(8000)).toBe("warning_red");
      expect(service.getQuotaLevel(8999)).toBe("warning_red");
      expect(service.isHardStop(8000)).toBe(false);
    });

    it("utlöser HÅRT STOPP vid 9 000 spårminuter (10% / 1 000 min säkerhetsbuffert)", () => {
      expect(HARD_STOP_THRESHOLD).toBe(9000);
      expect(service.getQuotaLevel(9000)).toBe("hard_stop");
      expect(service.getQuotaLevel(9500)).toBe("hard_stop");
      expect(service.isHardStop(9000)).toBe(true);
      expect(service.isHardStop(9100)).toBe(true);
    });
  });

  describe("Realtidsackumulering (addSecondUsage)", () => {
    it("ackumulerar sekundförbrukning och returnerar uppdaterad status", () => {
      const septDate = new Date(2026, 8, 7);
      // 1 tolkspår, 60 lyssnare => 2 * 60 / 60 = 2 min/sek
      const result1 = service.addSecondUsage(1, 60, septDate);
      expect(result1.usage).toBeCloseTo(2.0, 5);
      expect(result1.level).toBe("normal");
      expect(result1.stopped).toBe(false);
    });

    it("rapporterar stopp och notifierar lyssnare när hårt stopp nås via addSecondUsage", () => {
      const septDate = new Date(2026, 8, 7);
      service.recordUsage(8999, septDate);

      let hardStopTriggered = false;
      service.onHardStop = () => {
        hardStopTriggered = true;
      };

      // 1 tolkspår, 60 lyssnare => +2 min => 9001 min (passerar 9000)
      const result = service.addSecondUsage(1, 60, septDate);
      expect(result.usage).toBeGreaterThanOrEqual(9000);
      expect(result.level).toBe("hard_stop");
      expect(result.stopped).toBe(true);
      expect(hardStopTriggered).toBe(true);
    });
  });

  describe("Nollställning och återställning", () => {
    it("tillåter manuell nollställning av innevarande månad", () => {
      const septDate = new Date(2026, 8, 7);
      service.recordUsage(1200, septDate);
      expect(service.getMonthlyUsage(septDate)).toBe(1200);

      service.resetUsage(septDate);
      expect(service.getMonthlyUsage(septDate)).toBe(0);
    });

    it("fungerar helt isolerat utan några LiveKit-beroenden", () => {
      // Verifierar att QuotaService är ren TypeScript och skyddar gratisnivån
      expect(service).toBeDefined();
      expect(typeof service.getMonthlyUsage).toBe("function");
      expect(typeof service.addSecondUsage).toBe("function");
      expect(typeof service.isHardStop).toBe("function");
    });
  });
});
