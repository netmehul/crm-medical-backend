const PLAN_LIMITS = {
  free: {
    patients:             50,
    appointmentsPerMonth: 30,
    seats:                2,
    reportUploads:        false,
    billing:              false,
    inventory:            false,
    mrManagement:         false,
    referralsPerMonth:    5,
    labCommunication:     false,
  },
  pro: {
    patients:             Infinity,
    appointmentsPerMonth: Infinity,
    seats:                5,
    reportUploads:        true,
    billing:              true,
    inventory:            true,
    mrManagement:         true,
    referralsPerMonth:    Infinity,
    labCommunication:     true,
  },
};

const ROLES = {
  ORG_ADMIN:    'org_admin',
  RECEPTIONIST: 'receptionist',
};

const PLANS = {
  FREE: 'free',
  PRO:  'pro',
};

const TIERS = {
  PLATFORM: 'platform',
  APP:      'app',
};

module.exports = { PLAN_LIMITS, ROLES, PLANS, TIERS };
