import { describe, it, expect } from "vitest";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
} from "./permissions";

describe("hasPermission", () => {
  describe("admin role", () => {
    it("has all permissions", () => {
      expect(hasPermission("admin", "members:read")).toBe(true);
      expect(hasPermission("admin", "members:write")).toBe(true);
      expect(hasPermission("admin", "members:delete")).toBe(true);
      expect(hasPermission("admin", "settings:company")).toBe(true);
      expect(hasPermission("admin", "audit:read")).toBe(true);
      expect(hasPermission("admin", "workflows:policies")).toBe(true);
    });
  });

  describe("manager role", () => {
    it("has member management permissions", () => {
      expect(hasPermission("manager", "members:read")).toBe(true);
      expect(hasPermission("manager", "members:write")).toBe(true);
      expect(hasPermission("manager", "members:invite")).toBe(true);
    });

    it("cannot delete members", () => {
      expect(hasPermission("manager", "members:delete")).toBe(false);
    });

    it("cannot access company settings or roles settings", () => {
      expect(hasPermission("manager", "settings:company")).toBe(false);
      expect(hasPermission("manager", "settings:roles")).toBe(false);
    });

    it("has full attendance access", () => {
      expect(hasPermission("manager", "attendance:read_all")).toBe(true);
      expect(hasPermission("manager", "attendance:modify")).toBe(true);
      expect(hasPermission("manager", "attendance:reports")).toBe(true);
    });

    it("has leave approval and policy", () => {
      expect(hasPermission("manager", "leave:approve")).toBe(true);
      expect(hasPermission("manager", "leave:policy")).toBe(true);
    });

    it("has contract management", () => {
      expect(hasPermission("manager", "contracts:templates")).toBe(true);
      expect(hasPermission("manager", "contracts:send")).toBe(true);
      expect(hasPermission("manager", "contracts:seals")).toBe(true);
    });

    it("has workflow read_all and approve but not forms or policies", () => {
      expect(hasPermission("manager", "workflows:read_all")).toBe(true);
      expect(hasPermission("manager", "workflows:approve")).toBe(true);
      expect(hasPermission("manager", "workflows:forms")).toBe(false);
      expect(hasPermission("manager", "workflows:policies")).toBe(false);
    });

    it("has settings:work_policy and settings:leave_policy", () => {
      expect(hasPermission("manager", "settings:work_policy")).toBe(true);
      expect(hasPermission("manager", "settings:leave_policy")).toBe(true);
    });
  });

  describe("employee role", () => {
    it("can read members and departments", () => {
      expect(hasPermission("employee", "members:read")).toBe(true);
      expect(hasPermission("employee", "departments:read")).toBe(true);
    });

    it("can only read own attendance", () => {
      expect(hasPermission("employee", "attendance:read_own")).toBe(true);
      expect(hasPermission("employee", "attendance:read_team")).toBe(false);
      expect(hasPermission("employee", "attendance:read_all")).toBe(false);
    });

    it("can write own attendance (check-in/out)", () => {
      expect(hasPermission("employee", "attendance:write_own")).toBe(true);
    });

    it("cannot modify attendance", () => {
      expect(hasPermission("employee", "attendance:modify")).toBe(false);
    });

    it("can apply for leave but not approve", () => {
      expect(hasPermission("employee", "leave:apply")).toBe(true);
      expect(hasPermission("employee", "leave:approve")).toBe(false);
    });

    it("can sign contracts but not manage templates", () => {
      expect(hasPermission("employee", "contracts:sign")).toBe(true);
      expect(hasPermission("employee", "contracts:templates")).toBe(false);
      expect(hasPermission("employee", "contracts:send")).toBe(false);
    });

    it("can submit workflows but not approve", () => {
      expect(hasPermission("employee", "workflows:submit")).toBe(true);
      expect(hasPermission("employee", "workflows:approve")).toBe(false);
    });

    it("cannot access settings", () => {
      expect(hasPermission("employee", "settings:company")).toBe(false);
      expect(hasPermission("employee", "settings:roles")).toBe(false);
    });

    it("cannot read audit logs", () => {
      expect(hasPermission("employee", "audit:read")).toBe(false);
    });
  });
});

describe("hasAnyPermission", () => {
  it("returns true if role has at least one permission", () => {
    expect(
      hasAnyPermission("employee", ["members:write", "members:read"])
    ).toBe(true);
  });

  it("returns false if role has none of the permissions", () => {
    expect(
      hasAnyPermission("employee", ["members:write", "members:delete"])
    ).toBe(false);
  });

  it("returns false for empty permission list", () => {
    expect(hasAnyPermission("admin", [])).toBe(false);
  });
});

describe("hasAllPermissions", () => {
  it("returns true if role has all permissions", () => {
    expect(
      hasAllPermissions("admin", ["members:read", "members:write", "members:delete"])
    ).toBe(true);
  });

  it("returns false if role is missing one permission", () => {
    expect(
      hasAllPermissions("employee", ["members:read", "members:write"])
    ).toBe(false);
  });

  it("returns true for empty permission list", () => {
    expect(hasAllPermissions("employee", [])).toBe(true);
  });
});

describe("getRolePermissions", () => {
  it("returns non-empty array for all roles", () => {
    expect(getRolePermissions("admin").length).toBeGreaterThan(0);
    expect(getRolePermissions("manager").length).toBeGreaterThan(0);
    expect(getRolePermissions("employee").length).toBeGreaterThan(0);
  });

  it("admin has more permissions than manager", () => {
    expect(getRolePermissions("admin").length).toBeGreaterThan(
      getRolePermissions("manager").length
    );
  });

  it("manager has more permissions than employee", () => {
    expect(getRolePermissions("manager").length).toBeGreaterThan(
      getRolePermissions("employee").length
    );
  });
});
