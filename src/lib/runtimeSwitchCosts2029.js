// Measured 2026-10-14: each function switched OFF in turn, real anonymous requests on a mobile-sized load (no throttling),
// removed requests diffed against two baseline loads. n = requests, kb = response size, ms = summed server time (upstream), not wall time.
// Page-open totals now: home 64 req / 402KB, world 58 / 371KB, code 9 / 177KB. Number-page functions are not measured (the page is locked).
// Shape: { [switchKey]: { home|world|code: { n, kb, ms } } }
export const RUNTIME_SWITCH_COSTS_2029 = Object.freeze({
  "fx_now_feed": {
    "home": {
      "n": 3,
      "kb": 69,
      "ms": 65
    },
    "world": {
      "n": 3,
      "kb": 83,
      "ms": 24
    },
    "code": {
      "n": 4,
      "kb": 113,
      "ms": 22
    }
  },
  "fx_analytics": {
    "home": {
      "n": 2,
      "kb": 0,
      "ms": 39
    },
    "world": {
      "n": 5,
      "kb": 13,
      "ms": 46
    },
    "code": {
      "n": 3,
      "kb": 0,
      "ms": 16
    }
  },
  "fx_tier_signals": {
    "home": {
      "n": 4,
      "kb": 26,
      "ms": 81
    },
    "world": {
      "n": 9,
      "kb": 51,
      "ms": 99
    }
  },
  "fx_home_videos": {
    "home": {
      "n": 1,
      "kb": 41,
      "ms": 133
    }
  },
  "fx_home_gateways": {
    "home": {
      "n": 5,
      "kb": 80,
      "ms": 102
    }
  },
  "fx_home_pulse": {
    "home": {
      "n": 7,
      "kb": 1,
      "ms": 244
    }
  },
  "fx_home_temporal": {
    "home": {
      "n": 7,
      "kb": 20,
      "ms": 80
    }
  },
  "fx_home_world_preview": {
    "home": {
      "n": 6,
      "kb": 47,
      "ms": 69
    }
  },
  "fx_world_discovery": {
    "world": {
      "n": 4,
      "kb": 71,
      "ms": 27
    }
  },
  "fx_els_gallery": {
    "code": {
      "n": 2,
      "kb": 64,
      "ms": 10
    }
  },
  "fx_home_convergences": {
    "home": {
      "n": 5,
      "kb": 36,
      "ms": 90
    }
  }
});
