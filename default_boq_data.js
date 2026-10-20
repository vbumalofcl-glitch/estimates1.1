/**
 * Master Bill of Quantity (BOQ) Workbook Reference Data & Multiplier Engine
 * Single Source of Truth for Sports Club & Recreation Facility (PRJ-2026-001)
 * Auto-generated & synced with boq_schedule module.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FCL_BOQ_WORKBOOK = factory();
    root.DEFAULT_SPORTS_CLUB_BOQ_DATA = root.FCL_BOQ_WORKBOOK.DEFAULT_SPORTS_CLUB_BOQ_DATA;
  }
})(typeof self !== 'undefined' ? self : this, function () {

  function roundUpNearestOne(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.ceil(Math.round(n * 10000) / 10000);
  }

  function numberOrZero(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function applyBOQQtyMultiplier(baseQty, percent) {
    const bQty = numberOrZero(baseQty);
    const p = numberOrZero(percent);
    if (p === 0 || bQty === 0) return bQty;
    const rawQty = bQty * (1 + (p / 100));
    const roundedUpQty = roundUpNearestOne(rawQty);
    if (roundedUpQty > 7) {
      return roundedUpQty;
    }
    return bQty;
  }

  const DEFAULT_BOQ_MULTIPLIERS = {
    qty: 2,
    material: 5,
    le: 5,
    profit: 15,
    overhead: 10,
    contingency: 5,
    tax: 0
  };

  const DEFAULT_SPORTS_CLUB_BOQ_DATA = [
  {
    "type": "category",
    "code": "01.00.00.00",
    "title": "PRELIMINARY FOR CIVIL WORKS",
    "specification": "",
    "qty": 0,
    "unit": "",
    "materialUnitCost": 0,
    "laborUnitCost": 0,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "01.00.01.00",
    "title": "Project Management and Coordination",
    "specification": "Site management and supervision (technical team)",
    "qty": 1,
    "unit": "lot",
    "materialUnitCost": 35260,
    "laborUnitCost": 243333,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "01.00.02.00",
    "title": "Facility Services Coordination",
    "specification": "Service vehicle/ transportation",
    "qty": 1,
    "unit": "lot",
    "materialUnitCost": 0,
    "laborUnitCost": 270371,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "01.00.03.00",
    "title": "Construction Progress Reporting",
    "specification": "Schedules/ reports",
    "qty": 1,
    "unit": "lot",
    "materialUnitCost": 25185,
    "laborUnitCost": 27037,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "01.00.04.00",
    "title": "Health and Safety provisions",
    "specification": "Site supervision and safety equipments/ provisions",
    "qty": 1,
    "unit": "lot",
    "materialUnitCost": 0,
    "laborUnitCost": 27037,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "01.00.05.00",
    "title": "Site Security ",
    "specification": "Security personnel",
    "qty": 1,
    "unit": "lot",
    "materialUnitCost": 0,
    "laborUnitCost": 162222,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "01.00.06.00",
    "title": "Building Permit, By Owner (Not included in Work) (Not included in Work)",
    "specification": "Building Permit, By Owner To Be Assisted By The Gen Con",
    "qty": 1,
    "unit": "lot",
    "materialUnitCost": 0,
    "laborUnitCost": 0,
    "condition": "Not included in Work",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "01.00.07.00",
    "title": "DENR Permit, By Owner (Not included in Work) (Not included in Work)",
    "specification": "DENR Permit, by owner",
    "qty": 1,
    "unit": "lot",
    "materialUnitCost": 0,
    "laborUnitCost": 0,
    "condition": "Not included in Work",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "01.00.08.00",
    "title": "Quality Control",
    "specification": "Testing Laboratory Services",
    "qty": 1,
    "unit": "lot",
    "materialUnitCost": 35260,
    "laborUnitCost": 135185,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "01.00.09.00",
    "title": "Temporary Utilities",
    "specification": "Temporary Electricity, by owner",
    "qty": 1,
    "unit": "lot",
    "materialUnitCost": 0,
    "laborUnitCost": 0,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "01.00.10.00",
    "title": "Temporary Utilities",
    "specification": "Temporary Water, by owner",
    "qty": 1,
    "unit": "lot",
    "materialUnitCost": 0,
    "laborUnitCost": 0,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "01.00.11.00",
    "title": "Field Offices and Sheds",
    "specification": "Construction Office",
    "qty": 1,
    "unit": "lot",
    "materialUnitCost": 50371,
    "laborUnitCost": 54074,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "01.00.12.00",
    "title": "Field Offices and Sheds",
    "specification": "Barracks",
    "qty": 1,
    "unit": "lot",
    "materialUnitCost": 50371,
    "laborUnitCost": 54074,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "01.00.13.00",
    "title": "Sanitary Facilities",
    "specification": "Temporary septic tank etc",
    "qty": 1,
    "unit": "lot",
    "materialUnitCost": 25185,
    "laborUnitCost": 27037,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "01.00.14.00",
    "title": "Temporary Barriers and Enclosures",
    "specification": "Temporary Fencing",
    "qty": 1,
    "unit": "lot",
    "materialUnitCost": 22667,
    "laborUnitCost": 24333,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "01.00.15.00",
    "title": "Construction Waste Management ",
    "specification": "Disposal of construction waste",
    "qty": 1,
    "unit": "lot",
    "materialUnitCost": 50371,
    "laborUnitCost": 89611,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "01.00.16.00",
    "title": "Closeout Submittals",
    "specification": "As-built drawings ",
    "qty": 1,
    "unit": "lot",
    "materialUnitCost": 0,
    "laborUnitCost": 47193,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "category",
    "code": "02.00.00.00",
    "title": "Earth Works & Sub Structures",
    "specification": "",
    "qty": 0,
    "unit": "",
    "materialUnitCost": 0,
    "laborUnitCost": 0,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subcategory",
    "code": "02.01.00.00",
    "title": "RETAINING WALL",
    "specification": "",
    "qty": 0,
    "unit": "",
    "materialUnitCost": 0,
    "laborUnitCost": 0,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.01.01.00",
    "title": "Foundation Excavation",
    "specification": "RW footing excavation",
    "qty": 152,
    "unit": "cu.m",
    "materialUnitCost": 0,
    "laborUnitCost": 390,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.01.02.00",
    "title": "Earth Disposal",
    "specification": "Hauling And Disposal (foundation)",
    "qty": 259,
    "unit": "cu.m",
    "materialUnitCost": 85,
    "laborUnitCost": 462,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.01.03.00",
    "title": "RC Wall Concrete     ",
    "specification": "4000 psi",
    "qty": 204,
    "unit": "cu.m",
    "materialUnitCost": 7858,
    "laborUnitCost": 2163,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.01.04.00",
    "title": "Reinforcing Bar",
    "specification": "Grade 60",
    "qty": 14571,
    "unit": "kgs",
    "materialUnitCost": 56,
    "laborUnitCost": 28,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.01.05.00",
    "title": "Reinforcing Bar",
    "specification": "Grade 40",
    "qty": 3142,
    "unit": "kgs",
    "materialUnitCost": 55,
    "laborUnitCost": 28,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.01.06.00",
    "title": "G.I. Tie Wire",
    "specification": "G16 G.I Tie wire",
    "qty": 457,
    "unit": "kgs",
    "materialUnitCost": 101,
    "laborUnitCost": 48,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.01.07.00",
    "title": "Form Works     ",
    "specification": "Phenolic boards, bracing supports, shoring supports",
    "qty": 719,
    "unit": "sq.m",
    "materialUnitCost": 445,
    "laborUnitCost": 444,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.01.08.00",
    "title": "Riprap Near Stair",
    "specification": "Boulders",
    "qty": 1,
    "unit": "Lot",
    "materialUnitCost": 73333,
    "laborUnitCost": 78133,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.01.09.00",
    "title": "Sheetpile Protection",
    "specification": "Slope Protection ",
    "qty": 1,
    "unit": "Lot",
    "materialUnitCost": 88888,
    "laborUnitCost": 74074,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.01.10.00",
    "title": "100mmØ PVC Pipe",
    "specification": "Retaining Wall Drain Pipe, Perforated",
    "qty": 35,
    "unit": "pcs",
    "materialUnitCost": 824,
    "laborUnitCost": 409,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.01.11.00",
    "title": "100mmØ PVC End Cap",
    "specification": "Retaining Wall Drain Pipe",
    "qty": 146,
    "unit": "pcs",
    "materialUnitCost": 67,
    "laborUnitCost": 31,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.01.12.00",
    "title": "Filter Drain Geotextile 2m x 50m",
    "specification": "Retaining Wall Drain Pipe Filter",
    "qty": 2,
    "unit": "roll",
    "materialUnitCost": 6222,
    "laborUnitCost": 2962,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.01.13.00",
    "title": "3/4\" Gravel",
    "specification": "Retaining Wall Drain Pipe Filter Gravel And Foundation Base Coarse",
    "qty": 14,
    "unit": "cu.m",
    "materialUnitCost": 1555,
    "laborUnitCost": 814,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subcategory",
    "code": "02.02.00.00",
    "title": "Bored pile works",
    "specification": "",
    "qty": 0,
    "unit": "",
    "materialUnitCost": 0,
    "laborUnitCost": 0,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.02.01.00",
    "title": "Earth Excavation",
    "specification": "Bored Pile Drilling and Excavation - D400mmØ-hole, 9000mm-deep w/ equipment",
    "qty": 643,
    "unit": "lm",
    "materialUnitCost": 605,
    "laborUnitCost": 2488,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.02.02.00",
    "title": "Earth Disposal",
    "specification": "Hauling and Disposal of wet soil on sacks",
    "qty": 242,
    "unit": "cu.m",
    "materialUnitCost": 605,
    "laborUnitCost": 1406,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.02.03.00",
    "title": "FDN-GF - Concrete works",
    "specification": "Piles - 4,000psi; D400mmØ x ±9000mm",
    "qty": 101,
    "unit": "cu.m",
    "materialUnitCost": 7858,
    "laborUnitCost": 2163,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.02.04.00",
    "title": "FDN-GF - Rebar works",
    "specification": "Piles - Gr.60 Ø16mm Main Vertical Bars",
    "qty": 13631,
    "unit": "kgs",
    "materialUnitCost": 56,
    "laborUnitCost": 28,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.02.05.00",
    "title": "FDN-GF - Rebar works",
    "specification": "Piles - Gr.60 Ø10mm Spiral Ties @ 100mm",
    "qty": 5401,
    "unit": "kgs",
    "materialUnitCost": 56,
    "laborUnitCost": 28,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.02.06.00",
    "title": "FDN-GF - Rebar works",
    "specification": "Piles - G.I. Tie Wire",
    "qty": 572,
    "unit": "kgs",
    "materialUnitCost": 102,
    "laborUnitCost": 48,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.02.07.00",
    "title": "Material Hauling works ",
    "specification": "Gravel, sand, cement etc.",
    "qty": 1,
    "unit": "lot",
    "materialUnitCost": 66667,
    "laborUnitCost": 194666,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subcategory",
    "code": "02.03.00.00",
    "title": "Foundation Excavation",
    "specification": "",
    "qty": 0,
    "unit": "",
    "materialUnitCost": 0,
    "laborUnitCost": 0,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.03.01.00",
    "title": "Earth Excavation",
    "specification": "Structural Excavation ",
    "qty": 420,
    "unit": "cu.m",
    "materialUnitCost": 0,
    "laborUnitCost": 390,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.03.02.00",
    "title": "Earth Disposal",
    "specification": "Hauling and Disposal ",
    "qty": 1860,
    "unit": "cu.m",
    "materialUnitCost": 85,
    "laborUnitCost": 462,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.03.03.00",
    "title": "Backfilling and Compaction",
    "specification": "Excavated Foundation  Compacted backfill in 0.30 m lifts",
    "qty": 816,
    "unit": "sq.m",
    "materialUnitCost": 0,
    "laborUnitCost": 217,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.03.04.00",
    "title": "Gravel Bedding",
    "specification": "Foundation and Slab-on-Fill - 3/4\" Gravel, 50mm-thick",
    "qty": 66,
    "unit": "cu.m",
    "materialUnitCost": 2015,
    "laborUnitCost": 2163,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subcategory",
    "code": "02.04.00.00",
    "title": "Earth Excavation/Grading (Rear)",
    "specification": "",
    "qty": 0,
    "unit": "",
    "materialUnitCost": 0,
    "laborUnitCost": 0,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.04.01.00",
    "title": "Earth Excavation",
    "specification": "Elevated Earth Excavation",
    "qty": 960,
    "unit": "Cu.m",
    "materialUnitCost": 0,
    "laborUnitCost": 390,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.04.02.00",
    "title": "Earth Disposal and debris disposal",
    "specification": "Hauling and Disposal ",
    "qty": 1560,
    "unit": "Cu.m",
    "materialUnitCost": 0,
    "laborUnitCost": 462,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "02.04.03.00",
    "title": "Demolition of Existing House",
    "specification": "Demolition and jackhammer",
    "qty": 1,
    "unit": "lot",
    "materialUnitCost": 0,
    "laborUnitCost": 248888,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "category",
    "code": "03.00.00.00",
    "title": "STRUCTURAL WORKS",
    "specification": "",
    "qty": 0,
    "unit": "",
    "materialUnitCost": 0,
    "laborUnitCost": 0,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subcategory",
    "code": "03.01.00.00",
    "title": "CONCRETE WORKS",
    "specification": "",
    "qty": 0,
    "unit": "",
    "materialUnitCost": 0,
    "laborUnitCost": 0,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.01.01.00",
    "title": "FDN-GF - Concrete works",
    "specification": "Pile Caps (Type A) - 4,000psi; Chamfered Equilateral Triangular Shape; 2630mm-sides x 800mm-depth",
    "qty": 41,
    "unit": "cu.m",
    "materialUnitCost": 7858,
    "laborUnitCost": 2704,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.01.02.00",
    "title": "FDN-GF - Concrete works",
    "specification": "Pile Caps (Type B) - 4,000psi; Chamfered Equilateral Triangular Shape; 2630mm-sides x 500mm-depth",
    "qty": 13,
    "unit": "cu.m",
    "materialUnitCost": 7858,
    "laborUnitCost": 2704,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.01.03.00",
    "title": "FDN-GF - Concrete works",
    "specification": "Concrete Pedestal - 4,000psi; 500mm x 500mm",
    "qty": 5,
    "unit": "cu.m",
    "materialUnitCost": 7858,
    "laborUnitCost": 2704,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.01.04.00",
    "title": "Steel Structures (bolts, Plates, I Beams)  (By other Contractor) (By other Contractor)",
    "specification": "Errection, Welding Works, Setting Of Bolts And All Metal Works  Such As Stairs, Purlins Etc.",
    "qty": 0,
    "unit": "",
    "materialUnitCost": 0,
    "laborUnitCost": 0,
    "condition": "By other Contractor",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.01.05.00",
    "title": "GF-2F - Concrete works",
    "specification": "Slab-on-fill - 3,500psi; 150mm-thick",
    "qty": 222,
    "unit": "cu.m",
    "materialUnitCost": 7858,
    "laborUnitCost": 2704,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.01.06.00",
    "title": "2F-3F - Concrete works",
    "specification": "Slab-on-Steel Deck - 4,000psi; 150mm-thk",
    "qty": 180,
    "unit": "cu.m",
    "materialUnitCost": 7858,
    "laborUnitCost": 2704,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.01.07.00",
    "title": "3F-RF - Concrete works",
    "specification": "Slab-on-Steel Deck - 4,000psi; 150mm-thk",
    "qty": 37,
    "unit": "cu.m",
    "materialUnitCost": 7858,
    "laborUnitCost": 2704,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subcategory",
    "code": "03.02.00.00",
    "title": "REINFORCEMENT WORKS",
    "specification": "",
    "qty": 0,
    "unit": "",
    "materialUnitCost": 0,
    "laborUnitCost": 0,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.02.01.00",
    "title": "FDN-GF - Rebar works",
    "specification": "Pile Caps (Type A) - Gr.60 Ø16mm Top & Bot. B.W.",
    "qty": 4222,
    "unit": "kgs",
    "materialUnitCost": 56,
    "laborUnitCost": 28,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.02.02.00",
    "title": "FDN-GF - Rebar works",
    "specification": "Pile Caps (Type A) - G.I. Tie Wire",
    "qty": 234,
    "unit": "kgs",
    "materialUnitCost": 101,
    "laborUnitCost": 48,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.02.03.00",
    "title": "FDN-GF - Rebar works",
    "specification": "Pile Caps (Type B) - Gr.60 Ø16mm Top & Bot. B.W.",
    "qty": 1607,
    "unit": "kgs",
    "materialUnitCost": 56,
    "laborUnitCost": 28,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.02.04.00",
    "title": "FDN-GF - Rebar works",
    "specification": "Pile Caps (Type B) - G.I. Tie Wire",
    "qty": 90,
    "unit": "kgs",
    "materialUnitCost": 101,
    "laborUnitCost": 48,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.02.05.00",
    "title": "GF-2F - Rebar works",
    "specification": "Concrete Pedestal - Gr.60 Ø20mm Main Vertical Bars",
    "qty": 1166,
    "unit": "kgs",
    "materialUnitCost": 56,
    "laborUnitCost": 28,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.02.06.00",
    "title": "GF-2F - Rebar works",
    "specification": "Concrete Pedestal - Gr.40 Ø10mm Lat. Ties",
    "qty": 729,
    "unit": "kgs",
    "materialUnitCost": 55,
    "laborUnitCost": 28,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.02.07.00",
    "title": "GF-2F - Rebar works",
    "specification": "Concrete Pedestal - G.I. Tie Wire",
    "qty": 105,
    "unit": "kgs",
    "materialUnitCost": 101,
    "laborUnitCost": 48,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.02.08.00",
    "title": "GF-2F - Rebar works",
    "specification": "Slab-on-fill - Gr.40 Ø10mm @ 200mm B.W.",
    "qty": 9822,
    "unit": "kgs",
    "materialUnitCost": 55,
    "laborUnitCost": 28,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.02.09.00",
    "title": "GF-2F - Rebar works",
    "specification": "Slab-on-fill - G.I. Tie Wire",
    "qty": 541,
    "unit": "kgs",
    "materialUnitCost": 101,
    "laborUnitCost": 48,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.02.10.00",
    "title": "2F-3F - Rebar works",
    "specification": "Slab-on-Steel Deck - Gr.40 Ø10mm @ 200mm B.W. Top & Bottom",
    "qty": 16845,
    "unit": "kgs",
    "materialUnitCost": 55,
    "laborUnitCost": 28,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.02.11.00",
    "title": "2F-3F - Rebar works",
    "specification": "Slab-on-Steel Deck - G.I. Tie Wire",
    "qty": 928,
    "unit": "kgs",
    "materialUnitCost": 101,
    "laborUnitCost": 49,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.02.12.00",
    "title": "3F-RF - Rebar works",
    "specification": "Slab-on-Steel Deck - Gr.40 Ø10mm @ 200mm B.W. Top & Bottom",
    "qty": 3443,
    "unit": "kgs",
    "materialUnitCost": 55,
    "laborUnitCost": 28,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.02.13.00",
    "title": "3F-RF - Rebar works",
    "specification": "Slab-on-Steel Deck - G.I. Tie Wire",
    "qty": 191,
    "unit": "kgs",
    "materialUnitCost": 101,
    "laborUnitCost": 48,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subcategory",
    "code": "03.03.00.00",
    "title": "FORMS AND SHORING WORKS",
    "specification": "",
    "qty": 0,
    "unit": "",
    "materialUnitCost": 0,
    "laborUnitCost": 0,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.03.01.00",
    "title": "FDN-GF - Form works",
    "specification": "Pile Caps (Type A) - Phenolic boards, bracing supports, shoring supports",
    "qty": 8,
    "unit": "sq.m",
    "materialUnitCost": 504,
    "laborUnitCost": 541,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.03.02.00",
    "title": "FDN-GF - Form works",
    "specification": "Pile Caps (Type B) - Phenolic boards, bracing supports, shoring supports",
    "qty": 5,
    "unit": "sq.m",
    "materialUnitCost": 504,
    "laborUnitCost": 541,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.03.03.00",
    "title": "FDN-GF - Form works",
    "specification": "Concrete Pedestal - Phenolic boards, bracing supports, shoring supports",
    "qty": 32,
    "unit": "sq.m",
    "materialUnitCost": 504,
    "laborUnitCost": 541,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.03.04.00",
    "title": "GF-2F - Form works",
    "specification": "Slab-on-fill - Phenolic boards, blockout forms, bracing supports",
    "qty": 1634,
    "unit": "sq.m",
    "materialUnitCost": 51,
    "laborUnitCost": 28,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.03.05.00",
    "title": "2F-3F - Form works",
    "specification": "Slab-on-Steel Deck - Shoring Supports, Bracing Supports",
    "qty": 1397,
    "unit": "sq.m",
    "materialUnitCost": 252,
    "laborUnitCost": 271,
    "condition": "CPM",
    "collapsed": false
  },
  {
    "type": "subsubcategory",
    "code": "03.03.06.00",
    "title": "3F-RF - Form works",
    "specification": "Slab-on-Steel Deck - Shoring Supports, Bracing Supports",
    "qty": 261,
    "unit": "sq.m",
    "materialUnitCost": 252,
    "laborUnitCost": 271,
    "condition": "CPM",
    "collapsed": false
  }
];

  function computeBOQItemWorkbookValues(row, customMultipliers) {
    if (!row) return null;
    const multipliers = Object.assign({}, DEFAULT_BOQ_MULTIPLIERS, customMultipliers || {});
    const baseQty = numberOrZero(row.qty);
    const directQty = baseQty;
    const directMaterialUnitCost = numberOrZero(row.materialUnitCost);
    const directLEUnitCost = numberOrZero(row.laborUnitCost !== undefined ? row.laborUnitCost : (row.leUnitCost || 0));
    const directTotalMaterialCost = directQty * directMaterialUnitCost;
    const directTotalLEC = directQty * directLEUnitCost;
    const directGrandTotalCost = roundUpNearestOne(directTotalMaterialCost + directTotalLEC);

    const qty = applyBOQQtyMultiplier(directQty, multipliers.qty);
    const markupPercent = numberOrZero(multipliers.profit) + numberOrZero(multipliers.overhead) + numberOrZero(multipliers.contingency) + numberOrZero(multipliers.tax);
    const totalMaterialMarkupPercent = numberOrZero(multipliers.material) + markupPercent;
    const totalLEMarkupPercent = numberOrZero(multipliers.le) + markupPercent;
    const materialMarkupFactor = 1 + (totalMaterialMarkupPercent / 100);
    const leMarkupFactor = 1 + (totalLEMarkupPercent / 100);

    const materialUnitCost = roundUpNearestOne(directMaterialUnitCost * materialMarkupFactor);
    const leUnitCost = roundUpNearestOne(directLEUnitCost * leMarkupFactor);
    const totalMaterialCost = qty * materialUnitCost;
    const totalLEC = qty * leUnitCost;
    const grandTotalCost = roundUpNearestOne(totalMaterialCost + totalLEC);

    // Formula specified: unit rate = materialUnitCost + leUnitCost (or (totalMaterialCost + totalLEC) / qty)
    const unitRate = materialUnitCost + leUnitCost;

    return {
      baseQty,
      directQty,
      directMaterialUnitCost,
      directLEUnitCost,
      directTotalMaterialCost,
      directTotalLEC,
      directGrandTotalCost,
      qty,
      materialUnitCost,
      leUnitCost,
      totalMaterialCost,
      totalLEC,
      grandTotalCost,
      unitRate
    };
  }

  function getSportsClubWorkbookItems(customMultipliers) {
    let currentCat = '01.00.00.00 PRELIMINARY FOR CIVIL WORKS';
    return DEFAULT_SPORTS_CLUB_BOQ_DATA.map((r, idx) => {
      if (r.type === 'category') {
        currentCat = (r.code ? (r.code + ' ') : '') + (r.title || '');
      }
      const isHeader = r.type === 'category' || r.type === 'subcategory';
      const comp = !isHeader ? computeBOQItemWorkbookValues(r, customMultipliers) : null;
      const qty = comp ? comp.qty : (parseFloat(r.qty) || 0);
      const matCost = comp ? comp.materialUnitCost : 0;
      const leCost = comp ? comp.leUnitCost : 0;
      const totalCost = comp ? comp.grandTotalCost : 0;
      const unitRate = comp ? comp.unitRate : 0;
      const progress = parseFloat(r.percentDone !== undefined ? r.percentDone : (r.ganttProgress || 0)) || 0;
      const earnedValue = comp ? Math.round(comp.grandTotalCost * (progress / 100)) : 0;

      let divCode = '01';
      let divName = '01.00.00.00 PRELIMINARY FOR CIVIL WORKS';
      if (r.code && r.code.startsWith('02')) {
        divCode = '02';
        divName = '02.00.00.00 Earth Works & Sub Structures';
      } else if (r.code && r.code.startsWith('03')) {
        divCode = '03';
        divName = '03.00.00.00 STRUCTURAL WORKS';
      }

      return {
        id: r.id || ('boq_' + (idx + 1)),
        code: r.code || ((idx + 1) + '.00'),
        title: r.title || ('Scope Item ' + (idx + 1)),
        specification: r.specification || '',
        category: currentCat,
        divisionCode: divCode,
        divisionName: divName,
        type: r.type || 'subsubcategory',
        qty: qty,
        unit: r.unit || (isHeader ? '' : 'lot'),
        materialUnitCost: matCost,
        leUnitCost: leCost,
        laborUnitCost: leCost,
        unitCost: unitRate,
        grandTotalCost: totalCost,
        allocatedBudget: totalCost,
        percentDone: progress,
        earnedValue: earnedValue,
        isCritical: Boolean(r.isCritical || r.condition === 'CPM'),
        condition: r.condition || 'CPM',
        isChild: r.type !== 'category' && r.type !== 'subcategory',
        isParent: r.type === 'category' || r.type === 'subcategory',
        directMaterialUnitCost: comp ? comp.directMaterialUnitCost : 0,
        directLEUnitCost: comp ? comp.directLEUnitCost : 0,
        directTotalMaterialCost: comp ? comp.directTotalMaterialCost : 0,
        directTotalLEC: comp ? comp.directTotalLEC : 0,
        directGrandTotalCost: comp ? comp.directGrandTotalCost : 0,
        boqMaterialUnitCost: matCost,
        boqLaborUnitCost: leCost,
        boqUnitCost: unitRate,
        boqGrandTotalCost: totalCost
      };
    });
  }

  function syncProjectBOQWithWorkbook(proj, customMultipliers) {
    if (!proj) return;
    if (!proj.boq) {
      proj.boq = {
        projectName: proj.name,
        projectCode: proj.code,
        items: []
      };
    }
    // Retain existing percentDone and condition/critical flags if user updated them
    const existingMap = new Map();
    if (proj.boq && Array.isArray(proj.boq.items)) {
      proj.boq.items.forEach(it => {
        if (it.code) {
          existingMap.set(it.code, {
            percentDone: it.percentDone !== undefined ? it.percentDone : 0,
            condition: it.condition,
            isCritical: it.isCritical
          });
        }
      });
    }

    const items = getSportsClubWorkbookItems(customMultipliers);
    if (existingMap.size > 0) {
      items.forEach(it => {
        if (it.code && existingMap.has(it.code)) {
          const ex = existingMap.get(it.code);
          if (ex.percentDone !== undefined) {
            it.percentDone = ex.percentDone;
            it.earnedValue = Math.round((it.grandTotalCost || 0) * (it.percentDone / 100));
          }
          if (ex.condition !== undefined) it.condition = ex.condition;
          if (ex.isCritical !== undefined) it.isCritical = ex.isCritical;
        }
      });
    }
    proj.boq.items = items;
    proj.boq.boqData = JSON.parse(JSON.stringify(DEFAULT_SPORTS_CLUB_BOQ_DATA));

    let grandTotal = 0;
    let totalEarned = 0;
    items.forEach(it => {
      if (!it.isParent) {
        grandTotal += it.grandTotalCost;
        totalEarned += it.earnedValue;
      }
    });

    if (grandTotal > 0) {
      proj.totalBudget = grandTotal;
      proj.actualProgress = parseFloat(((totalEarned / grandTotal) * 100).toFixed(1));
      items.forEach(it => {
        it.weight = parseFloat(((it.grandTotalCost / grandTotal) * 100).toFixed(2));
      });
    }

    return items;
  }

  return {
    DEFAULT_SPORTS_CLUB_BOQ_DATA,
    DEFAULT_BOQ_MULTIPLIERS,
    roundUpNearestOne,
    numberOrZero,
    applyBOQQtyMultiplier,
    computeBOQItemWorkbookValues,
    getSportsClubWorkbookItems,
    syncProjectBOQWithWorkbook
  };
});
