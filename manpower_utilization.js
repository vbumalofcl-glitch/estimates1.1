/**
 * ============================================================================
 * FCLDC INTEGRATED PROJECT CONTROLS - MANPOWER UTILIZATION ENGINE
 * Complete Dynamic Interaction: Scheduled vs. Actual Manpower,
 * Task Table with Sub-Task & Sub-Sub-Task Hierarchy,
 * Adjustable Column Widths (Drag Left/Right via .mp-col-resizer),
 * Estimated Manpower & Matched BOQ Workbook Descriptions,
 * Right-Click Context Menu Task Breakdown,
 * Two-Tier Timeline (Month/Quarter & Week/Day),
 * O.T. (+25%) Calculation, Cumulative Cost per Date, and Fillable Excel Cells.
 * ============================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ManpowerUtilization = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Standard Construction Trade Classification & Default Wage Rates (PHP/day)
  const STANDARD_TRADES = [
    { name: 'General Foremen / In-Charge', rate: 1100, category: 'Supervision' },
    { name: 'Lead Carpenter & Formworker', rate: 850, category: 'Civil / Structural' },
    { name: 'Rebar Steelman & Cut/Bend', rate: 850, category: 'Civil / Structural' },
    { name: 'Mason & Concrete Finisher', rate: 800, category: 'Civil / Structural' },
    { name: 'Heavy Equipment Operator', rate: 950, category: 'Equipment' },
    { name: 'Electrician / MEPFS Tech', rate: 850, category: 'MEPFS' },
    { name: 'Plumber / Pipefitter', rate: 850, category: 'MEPFS' },
    { name: 'Welder / Steel Fabricator', rate: 900, category: 'Structural Steel' },
    { name: 'Painter & Finisher', rate: 750, category: 'Architectural' },
    { name: 'General Civil Laborer / Helper', rate: 610, category: 'Labor Force' }
  ];

  // Default Task Table Column Definitions with Adjustable Widths
  const DEFAULT_TASK_COLUMNS = [
    { id: 'num', name: '#', width: 36, minWidth: 28, align: 'center', title: 'Row Number' },
    { id: 'code', name: 'Item Code', width: 85, minWidth: 50, align: 'center', title: 'Item Code' },
    { id: 'description', name: 'Work Description', width: 270, minWidth: 140, align: 'left', title: 'Work Description (from BOQ Workbook)' },
    { id: 'estimatedManpower', name: 'Estimated Manpower', width: 105, minWidth: 60, align: 'center', title: 'Estimated Manpower (Total Crew / Man-Days)' },
    { id: 'manpower', name: 'No. of Manpower', width: 90, minWidth: 60, align: 'center', title: 'Active Scheduled Crew Force' },
    { id: 'ratePerDay', name: 'Rate/Day', width: 85, minWidth: 60, align: 'right', title: 'Daily Wage Rate (₱/day)' },
    { id: 'otHours', name: 'O.T. Hour', width: 75, minWidth: 50, align: 'center', title: 'Overtime Hours worked per day (Fillable)' },
    { id: 'ot', name: 'O.T.', width: 85, minWidth: 55, align: 'right', title: 'O.T. Pay = Rate/Day * O.T. Hour * 1.25/8' },
    { id: 'dailyTotal', name: 'Daily Total', width: 95, minWidth: 65, align: 'right', title: 'Daily Total Labor Cost' },
    { id: 'actions', name: 'Actions', width: 65, minWidth: 45, align: 'center', title: 'Task Actions' }
  ];

  // Master Gantt Chart & BOQ Schedule Baseline (79 Items matching Project Scope exactly)
  const PROJECT_GANTT_BOQ_BASELINE = [
  {
    "id": "mp_1",
    "type": "category",
    "code": "01.00.00.00",
    "description": "PRELIMINARY FOR CIVIL WORKS",
    "specification": "",
    "estimatedManpower": 0,
    "manpower": 0,
    "trade": "General Civil Laborer / Helper",
    "ratePerDay": 610,
    "hasOt": false,
    "startDate": "2026-03-01",
    "endDate": "2026-05-30",
    "duration": 91,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_2",
    "type": "subcategory",
    "code": "01.00.01.00",
    "description": "Project Management and Coordination",
    "specification": "Site management and supervision (technical team)",
    "estimatedManpower": 2,
    "manpower": 2,
    "trade": "General Foremen / In-Charge",
    "ratePerDay": 1100,
    "hasOt": false,
    "startDate": "2026-03-01",
    "endDate": "2026-05-30",
    "duration": 91,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_3",
    "type": "subcategory",
    "code": "01.00.02.00",
    "description": "Facility Services Coordination",
    "specification": "Service vehicle/ transportation",
    "estimatedManpower": 5,
    "manpower": 5,
    "trade": "General Civil Laborer / Helper",
    "ratePerDay": 610,
    "hasOt": false,
    "startDate": "2026-03-01",
    "endDate": "2026-05-30",
    "duration": 91,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_4",
    "type": "subcategory",
    "code": "01.00.03.00",
    "description": "Construction Progress Reporting",
    "specification": "Schedules/ reports",
    "estimatedManpower": 1,
    "manpower": 1,
    "trade": "General Foremen / In-Charge",
    "ratePerDay": 1100,
    "hasOt": false,
    "startDate": "2026-03-01",
    "endDate": "2026-05-30",
    "duration": 91,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_5",
    "type": "subcategory",
    "code": "01.00.04.00",
    "description": "Health and Safety provisions",
    "specification": "Site supervision and safety equipments/ provisions",
    "estimatedManpower": 1,
    "manpower": 1,
    "trade": "General Foremen / In-Charge",
    "ratePerDay": 1100,
    "hasOt": false,
    "startDate": "2026-03-01",
    "endDate": "2026-05-30",
    "duration": 91,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_6",
    "type": "subcategory",
    "code": "01.00.05.00",
    "description": "Site Security",
    "specification": "Security personnel",
    "estimatedManpower": 2,
    "manpower": 2,
    "trade": "General Foremen / In-Charge",
    "ratePerDay": 1100,
    "hasOt": false,
    "startDate": "2026-03-01",
    "endDate": "2026-05-30",
    "duration": 91,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_7",
    "type": "subcategory",
    "code": "01.00.06.00",
    "description": "Building Permit, By Owner (Not included in Work) (Not included in Work)",
    "specification": "Building Permit, By Owner To Be Assisted By The Gen Con",
    "estimatedManpower": 4,
    "manpower": 4,
    "trade": "General Civil Laborer / Helper",
    "ratePerDay": 610,
    "hasOt": false,
    "startDate": "2026-03-01",
    "endDate": "2026-05-30",
    "duration": 91,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_8",
    "type": "subcategory",
    "code": "01.00.07.00",
    "description": "DENR Permit, By Owner (Not included in Work) (Not included in Work)",
    "specification": "DENR Permit, by owner",
    "estimatedManpower": 4,
    "manpower": 4,
    "trade": "General Civil Laborer / Helper",
    "ratePerDay": 610,
    "hasOt": false,
    "startDate": "2026-03-01",
    "endDate": "2026-05-30",
    "duration": 91,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_9",
    "type": "subcategory",
    "code": "01.00.08.00",
    "description": "Quality Control",
    "specification": "Testing Laboratory Services",
    "estimatedManpower": 1,
    "manpower": 1,
    "trade": "General Foremen / In-Charge",
    "ratePerDay": 1100,
    "hasOt": false,
    "startDate": "2026-03-01",
    "endDate": "2026-05-30",
    "duration": 91,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_10",
    "type": "subcategory",
    "code": "01.00.09.00",
    "description": "Temporary Utilities",
    "specification": "Temporary Electricity, by owner",
    "estimatedManpower": 4,
    "manpower": 4,
    "trade": "Electrician / MEPFS Tech",
    "ratePerDay": 850,
    "hasOt": false,
    "startDate": "2026-03-01",
    "endDate": "2026-05-30",
    "duration": 91,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_11",
    "type": "subcategory",
    "code": "01.00.10.00",
    "description": "Temporary Utilities",
    "specification": "Temporary Water, by owner",
    "estimatedManpower": 4,
    "manpower": 4,
    "trade": "General Civil Laborer / Helper",
    "ratePerDay": 610,
    "hasOt": false,
    "startDate": "2026-03-01",
    "endDate": "2026-05-30",
    "duration": 91,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_12",
    "type": "subcategory",
    "code": "01.00.11.00",
    "description": "Field Offices and Sheds",
    "specification": "Construction Office",
    "estimatedManpower": 3,
    "manpower": 3,
    "trade": "Lead Carpenter & Formworker",
    "ratePerDay": 850,
    "hasOt": false,
    "startDate": "2026-03-01",
    "endDate": "2026-05-30",
    "duration": 91,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_13",
    "type": "subcategory",
    "code": "01.00.12.00",
    "description": "Field Offices and Sheds",
    "specification": "Barracks",
    "estimatedManpower": 3,
    "manpower": 3,
    "trade": "Lead Carpenter & Formworker",
    "ratePerDay": 850,
    "hasOt": false,
    "startDate": "2026-03-01",
    "endDate": "2026-05-30",
    "duration": 91,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_14",
    "type": "subcategory",
    "code": "01.00.13.00",
    "description": "Sanitary Facilities",
    "specification": "Temporary septic tank etc",
    "estimatedManpower": 2,
    "manpower": 2,
    "trade": "Plumber / Pipefitter",
    "ratePerDay": 850,
    "hasOt": false,
    "startDate": "2026-03-01",
    "endDate": "2026-05-30",
    "duration": 91,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_15",
    "type": "subcategory",
    "code": "01.00.14.00",
    "description": "Temporary Barriers and Enclosures",
    "specification": "Temporary Fencing",
    "estimatedManpower": 2,
    "manpower": 2,
    "trade": "Lead Carpenter & Formworker",
    "ratePerDay": 850,
    "hasOt": false,
    "startDate": "2026-03-01",
    "endDate": "2026-05-30",
    "duration": 91,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_16",
    "type": "subcategory",
    "code": "01.00.15.00",
    "description": "Construction Waste Management",
    "specification": "Disposal of construction waste",
    "estimatedManpower": 1,
    "manpower": 1,
    "trade": "General Foremen / In-Charge",
    "ratePerDay": 1100,
    "hasOt": false,
    "startDate": "2026-03-01",
    "endDate": "2026-05-30",
    "duration": 91,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_17",
    "type": "subcategory",
    "code": "01.00.16.00",
    "description": "Closeout Submittals",
    "specification": "As-built drawings",
    "estimatedManpower": 3,
    "manpower": 3,
    "trade": "General Foremen / In-Charge",
    "ratePerDay": 1100,
    "hasOt": false,
    "startDate": "2026-03-01",
    "endDate": "2026-05-30",
    "duration": 91,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_18",
    "type": "category",
    "code": "02.00.00.00",
    "description": "Earth Works & Sub Structures",
    "specification": "",
    "estimatedManpower": 0,
    "manpower": 0,
    "trade": "General Civil Laborer / Helper",
    "ratePerDay": 610,
    "hasOt": false,
    "startDate": "2026-03-06",
    "endDate": "2026-04-15",
    "duration": 41,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_19",
    "type": "subcategory",
    "code": "02.01.00.00",
    "description": "RETAINING WALL",
    "specification": "",
    "estimatedManpower": 4,
    "manpower": 4,
    "trade": "General Civil Laborer / Helper",
    "ratePerDay": 610,
    "hasOt": false,
    "startDate": "2026-03-06",
    "endDate": "2026-04-05",
    "duration": 31,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_20",
    "type": "subsubcategory",
    "code": "02.01.01.00",
    "description": "Foundation Excavation",
    "specification": "RW footing excavation",
    "estimatedManpower": 7,
    "manpower": 7,
    "trade": "Heavy Equipment Operator",
    "ratePerDay": 950,
    "hasOt": true,
    "startDate": "2026-03-06",
    "endDate": "2026-03-19",
    "duration": 14,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_21",
    "type": "subsubcategory",
    "code": "02.01.02.00",
    "description": "Earth Disposal",
    "specification": "Hauling And Disposal (foundation)",
    "estimatedManpower": 22,
    "manpower": 22,
    "trade": "General Civil Laborer / Helper",
    "ratePerDay": 610,
    "hasOt": false,
    "startDate": "2026-03-13",
    "endDate": "2026-03-25",
    "duration": 13,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_22",
    "type": "subsubcategory",
    "code": "02.01.03.00",
    "description": "RC Wall Concrete",
    "specification": "4000 psi",
    "estimatedManpower": 37,
    "manpower": 37,
    "trade": "Mason & Concrete Finisher",
    "ratePerDay": 800,
    "hasOt": true,
    "startDate": "2026-03-19",
    "endDate": "2026-03-29",
    "duration": 11,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_23",
    "type": "subsubcategory",
    "code": "02.01.04.00",
    "description": "Reinforcing Bar",
    "specification": "Grade 60",
    "estimatedManpower": 44,
    "manpower": 44,
    "trade": "Rebar Steelman & Cut/Bend",
    "ratePerDay": 850,
    "hasOt": false,
    "startDate": "2026-03-23",
    "endDate": "2026-04-05",
    "duration": 14,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_24",
    "type": "subsubcategory",
    "code": "02.01.05.00",
    "description": "Reinforcing Bar",
    "specification": "Grade 40",
    "estimatedManpower": 9,
    "manpower": 9,
    "trade": "Rebar Steelman & Cut/Bend",
    "ratePerDay": 850,
    "hasOt": false,
    "startDate": "2026-03-23",
    "endDate": "2026-04-05",
    "duration": 14,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_25",
    "type": "subsubcategory",
    "code": "02.01.06.00",
    "description": "G.I. Tie Wire",
    "specification": "G16 G.I Tie wire",
    "estimatedManpower": 2,
    "manpower": 2,
    "trade": "Rebar Steelman & Cut/Bend",
    "ratePerDay": 850,
    "hasOt": false,
    "startDate": "2026-03-23",
    "endDate": "2026-04-05",
    "duration": 14,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_26",
    "type": "subsubcategory",
    "code": "02.01.07.00",
    "description": "Form Works",
    "specification": "Phenolic boards, bracing supports, shoring supports",
    "estimatedManpower": 27,
    "manpower": 27,
    "trade": "Lead Carpenter & Formworker",
    "ratePerDay": 850,
    "hasOt": false,
    "startDate": "2026-03-23",
    "endDate": "2026-04-05",
    "duration": 14,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_27",
    "type": "subsubcategory",
    "code": "02.01.08.00",
    "description": "Riprap Near Stair",
    "specification": "Boulders",
    "estimatedManpower": 7,
    "manpower": 7,
    "trade": "Mason & Concrete Finisher",
    "ratePerDay": 800,
    "hasOt": false,
    "startDate": "2026-03-23",
    "endDate": "2026-04-05",
    "duration": 14,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_28",
    "type": "subsubcategory",
    "code": "02.01.09.00",
    "description": "Sheetpile Protection",
    "specification": "Slope Protection",
    "estimatedManpower": 7,
    "manpower": 7,
    "trade": "Heavy Equipment Operator",
    "ratePerDay": 950,
    "hasOt": false,
    "startDate": "2026-03-23",
    "endDate": "2026-04-05",
    "duration": 14,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_29",
    "type": "subsubcategory",
    "code": "02.01.10.00",
    "description": "100mmØ PVC Pipe",
    "specification": "Retaining Wall Drain Pipe, Perforated",
    "estimatedManpower": 1,
    "manpower": 1,
    "trade": "Plumber / Pipefitter",
    "ratePerDay": 850,
    "hasOt": false,
    "startDate": "2026-03-23",
    "endDate": "2026-04-05",
    "duration": 14,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_30",
    "type": "subsubcategory",
    "code": "02.01.11.00",
    "description": "100mmØ PVC End Cap",
    "specification": "Retaining Wall Drain Pipe",
    "estimatedManpower": 1,
    "manpower": 1,
    "trade": "Plumber / Pipefitter",
    "ratePerDay": 850,
    "hasOt": false,
    "startDate": "2026-03-23",
    "endDate": "2026-04-05",
    "duration": 14,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_31",
    "type": "subsubcategory",
    "code": "02.01.12.00",
    "description": "Filter Drain Geotextile 2m x 50m",
    "specification": "Retaining Wall Drain Pipe Filter",
    "estimatedManpower": 1,
    "manpower": 1,
    "trade": "Plumber / Pipefitter",
    "ratePerDay": 850,
    "hasOt": false,
    "startDate": "2026-03-23",
    "endDate": "2026-04-05",
    "duration": 14,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_32",
    "type": "subsubcategory",
    "code": "02.01.13.00",
    "description": "3/4\" Gravel",
    "specification": "Retaining Wall Drain Pipe Filter Gravel And Foundation Base Coarse",
    "estimatedManpower": 1,
    "manpower": 1,
    "trade": "Mason & Concrete Finisher",
    "ratePerDay": 800,
    "hasOt": false,
    "startDate": "2026-03-23",
    "endDate": "2026-04-05",
    "duration": 14,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_33",
    "type": "subcategory",
    "code": "02.02.00.00",
    "description": "Bored pile works",
    "specification": "",
    "estimatedManpower": 4,
    "manpower": 4,
    "trade": "Heavy Equipment Operator",
    "ratePerDay": 950,
    "hasOt": false,
    "startDate": "2026-03-09",
    "endDate": "2026-03-29",
    "duration": 21,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_34",
    "type": "subsubcategory",
    "code": "02.02.01.00",
    "description": "Earth Excavation",
    "specification": "Bored Pile Drilling and Excavation - D400mmØ-hole, 9000mm-deep w/ equipment",
    "estimatedManpower": 153,
    "manpower": 153,
    "trade": "Heavy Equipment Operator",
    "ratePerDay": 950,
    "hasOt": true,
    "startDate": "2026-03-09",
    "endDate": "2026-03-29",
    "duration": 21,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_35",
    "type": "subsubcategory",
    "code": "02.02.02.00",
    "description": "Earth Disposal",
    "specification": "Hauling and Disposal of wet soil on sacks",
    "estimatedManpower": 51,
    "manpower": 51,
    "trade": "General Civil Laborer / Helper",
    "ratePerDay": 610,
    "hasOt": false,
    "startDate": "2026-03-09",
    "endDate": "2026-03-29",
    "duration": 21,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_36",
    "type": "subsubcategory",
    "code": "02.02.03.00",
    "description": "FDN-GF - Concrete works",
    "specification": "Piles - 4,000psi; D400mmØ x ±9000mm",
    "estimatedManpower": 18,
    "manpower": 18,
    "trade": "Mason & Concrete Finisher",
    "ratePerDay": 800,
    "hasOt": true,
    "startDate": "2026-03-09",
    "endDate": "2026-03-29",
    "duration": 21,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_37",
    "type": "subsubcategory",
    "code": "02.02.04.00",
    "description": "FDN-GF - Rebar works",
    "specification": "Piles - Gr.60 Ø16mm Main Vertical Bars",
    "estimatedManpower": 35,
    "manpower": 35,
    "trade": "Rebar Steelman & Cut/Bend",
    "ratePerDay": 850,
    "hasOt": true,
    "startDate": "2026-03-09",
    "endDate": "2026-03-29",
    "duration": 21,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_38",
    "type": "subsubcategory",
    "code": "02.02.05.00",
    "description": "FDN-GF - Rebar works",
    "specification": "Piles - Gr.60 Ø10mm Spiral Ties @ 100mm",
    "estimatedManpower": 14,
    "manpower": 14,
    "trade": "Rebar Steelman & Cut/Bend",
    "ratePerDay": 850,
    "hasOt": true,
    "startDate": "2026-03-09",
    "endDate": "2026-03-29",
    "duration": 21,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_39",
    "type": "subsubcategory",
    "code": "02.02.06.00",
    "description": "FDN-GF - Rebar works",
    "specification": "Piles - G.I. Tie Wire",
    "estimatedManpower": 2,
    "manpower": 2,
    "trade": "Rebar Steelman & Cut/Bend",
    "ratePerDay": 850,
    "hasOt": true,
    "startDate": "2026-03-09",
    "endDate": "2026-03-29",
    "duration": 21,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_40",
    "type": "subsubcategory",
    "code": "02.02.07.00",
    "description": "Material Hauling works",
    "specification": "Gravel, sand, cement etc.",
    "estimatedManpower": 11,
    "manpower": 11,
    "trade": "Mason & Concrete Finisher",
    "ratePerDay": 800,
    "hasOt": false,
    "startDate": "2026-03-09",
    "endDate": "2026-03-29",
    "duration": 21,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_41",
    "type": "subcategory",
    "code": "02.03.00.00",
    "description": "Foundation Excavation",
    "specification": "",
    "estimatedManpower": 4,
    "manpower": 4,
    "trade": "Heavy Equipment Operator",
    "ratePerDay": 950,
    "hasOt": true,
    "startDate": "2026-03-11",
    "endDate": "2026-03-31",
    "duration": 21,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_42",
    "type": "subsubcategory",
    "code": "02.03.01.00",
    "description": "Earth Excavation",
    "specification": "Structural Excavation",
    "estimatedManpower": 12,
    "manpower": 12,
    "trade": "Heavy Equipment Operator",
    "ratePerDay": 950,
    "hasOt": true,
    "startDate": "2026-03-11",
    "endDate": "2026-03-31",
    "duration": 21,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_43",
    "type": "subsubcategory",
    "code": "02.03.02.00",
    "description": "Earth Disposal",
    "specification": "Hauling and Disposal",
    "estimatedManpower": 101,
    "manpower": 101,
    "trade": "General Civil Laborer / Helper",
    "ratePerDay": 610,
    "hasOt": false,
    "startDate": "2026-03-11",
    "endDate": "2026-03-31",
    "duration": 21,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_44",
    "type": "subsubcategory",
    "code": "02.03.03.00",
    "description": "Backfilling and Compaction",
    "specification": "Excavated Foundation  Compacted backfill in 0.30 m lifts",
    "estimatedManpower": 16,
    "manpower": 16,
    "trade": "Heavy Equipment Operator",
    "ratePerDay": 950,
    "hasOt": false,
    "startDate": "2026-03-11",
    "endDate": "2026-03-31",
    "duration": 21,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_45",
    "type": "subsubcategory",
    "code": "02.03.04.00",
    "description": "Gravel Bedding",
    "specification": "Foundation and Slab-on-Fill - 3/4\" Gravel, 50mm-thick",
    "estimatedManpower": 14,
    "manpower": 14,
    "trade": "Mason & Concrete Finisher",
    "ratePerDay": 800,
    "hasOt": false,
    "startDate": "2026-03-11",
    "endDate": "2026-03-31",
    "duration": 21,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_46",
    "type": "subcategory",
    "code": "02.04.00.00",
    "description": "Earth Excavation/Grading (Rear)",
    "specification": "",
    "estimatedManpower": 4,
    "manpower": 4,
    "trade": "Heavy Equipment Operator",
    "ratePerDay": 950,
    "hasOt": true,
    "startDate": "2026-03-21",
    "endDate": "2026-04-15",
    "duration": 26,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_47",
    "type": "subsubcategory",
    "code": "02.04.01.00",
    "description": "Earth Excavation",
    "specification": "Elevated Earth Excavation",
    "estimatedManpower": 28,
    "manpower": 28,
    "trade": "Heavy Equipment Operator",
    "ratePerDay": 950,
    "hasOt": true,
    "startDate": "2026-03-21",
    "endDate": "2026-04-15",
    "duration": 26,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_48",
    "type": "subsubcategory",
    "code": "02.04.02.00",
    "description": "Earth Disposal and debris disposal",
    "specification": "Hauling and Disposal",
    "estimatedManpower": 84,
    "manpower": 84,
    "trade": "General Civil Laborer / Helper",
    "ratePerDay": 610,
    "hasOt": false,
    "startDate": "2026-03-21",
    "endDate": "2026-04-15",
    "duration": 26,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_49",
    "type": "subsubcategory",
    "code": "02.04.03.00",
    "description": "Demolition of Existing House",
    "specification": "Demolition and jackhammer",
    "estimatedManpower": 24,
    "manpower": 24,
    "trade": "Heavy Equipment Operator",
    "ratePerDay": 950,
    "hasOt": false,
    "startDate": "2026-03-21",
    "endDate": "2026-04-15",
    "duration": 26,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_50",
    "type": "category",
    "code": "03.00.00.00",
    "description": "STRUCTURAL WORKS",
    "specification": "",
    "estimatedManpower": 0,
    "manpower": 0,
    "trade": "General Civil Laborer / Helper",
    "ratePerDay": 610,
    "hasOt": false,
    "startDate": "2026-03-21",
    "endDate": "2026-05-28",
    "duration": 69,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_51",
    "type": "subcategory",
    "code": "03.01.00.00",
    "description": "CONCRETE WORKS",
    "specification": "",
    "estimatedManpower": 4,
    "manpower": 4,
    "trade": "Mason & Concrete Finisher",
    "ratePerDay": 800,
    "hasOt": true,
    "startDate": "2026-03-26",
    "endDate": "2026-05-28",
    "duration": 64,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_52",
    "type": "subsubcategory",
    "code": "03.01.01.00",
    "description": "FDN-GF - Concrete works",
    "specification": "Pile Caps (Type A) - 4,000psi; Chamfered Equilateral Triangular Shape; 2630mm-sides x 800mm-depth",
    "estimatedManpower": 12,
    "manpower": 12,
    "trade": "Mason & Concrete Finisher",
    "ratePerDay": 800,
    "hasOt": true,
    "startDate": "2026-03-26",
    "endDate": "2026-04-15",
    "duration": 21,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_53",
    "type": "subsubcategory",
    "code": "03.01.02.00",
    "description": "FDN-GF - Concrete works",
    "specification": "Pile Caps (Type B) - 4,000psi; Chamfered Equilateral Triangular Shape; 2630mm-sides x 500mm-depth",
    "estimatedManpower": 4,
    "manpower": 4,
    "trade": "Mason & Concrete Finisher",
    "ratePerDay": 800,
    "hasOt": true,
    "startDate": "2026-03-26",
    "endDate": "2026-04-15",
    "duration": 21,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_54",
    "type": "subsubcategory",
    "code": "03.01.03.00",
    "description": "FDN-GF - Concrete works",
    "specification": "Concrete Pedestal - 4,000psi; 500mm x 500mm",
    "estimatedManpower": 2,
    "manpower": 2,
    "trade": "Mason & Concrete Finisher",
    "ratePerDay": 800,
    "hasOt": true,
    "startDate": "2026-03-26",
    "endDate": "2026-04-15",
    "duration": 21,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_55",
    "type": "subsubcategory",
    "code": "03.01.04.00",
    "description": "Steel Structures (bolts, Plates, I Beams)  (By other Contractor) (By other Contractor)",
    "specification": "Errection, Welding Works, Setting Of Bolts And All Metal Works  Such As Stairs, Purlins Etc.",
    "estimatedManpower": 2,
    "manpower": 2,
    "trade": "Welder / Steel Fabricator",
    "ratePerDay": 900,
    "hasOt": false,
    "startDate": "2026-04-10",
    "endDate": "2026-05-05",
    "duration": 26,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_56",
    "type": "subsubcategory",
    "code": "03.01.05.00",
    "description": "GF-2F - Concrete works",
    "specification": "Slab-on-fill - 3,500psi; 150mm-thick",
    "estimatedManpower": 47,
    "manpower": 47,
    "trade": "Mason & Concrete Finisher",
    "ratePerDay": 800,
    "hasOt": true,
    "startDate": "2026-04-15",
    "endDate": "2026-05-05",
    "duration": 21,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_57",
    "type": "subsubcategory",
    "code": "03.01.06.00",
    "description": "2F-3F - Concrete works",
    "specification": "Slab-on-Steel Deck - 4,000psi; 150mm-thk",
    "estimatedManpower": 34,
    "manpower": 34,
    "trade": "Mason & Concrete Finisher",
    "ratePerDay": 800,
    "hasOt": true,
    "startDate": "2026-04-30",
    "endDate": "2026-05-18",
    "duration": 19,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_58",
    "type": "subsubcategory",
    "code": "03.01.07.00",
    "description": "3F-RF - Concrete works",
    "specification": "Slab-on-Steel Deck - 4,000psi; 150mm-thk",
    "estimatedManpower": 9,
    "manpower": 9,
    "trade": "Mason & Concrete Finisher",
    "ratePerDay": 800,
    "hasOt": true,
    "startDate": "2026-05-12",
    "endDate": "2026-05-28",
    "duration": 17,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_59",
    "type": "subcategory",
    "code": "03.02.00.00",
    "description": "REINFORCEMENT WORKS",
    "specification": "",
    "estimatedManpower": 4,
    "manpower": 4,
    "trade": "Rebar Steelman & Cut/Bend",
    "ratePerDay": 850,
    "hasOt": false,
    "startDate": "2026-03-21",
    "endDate": "2026-05-25",
    "duration": 66,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_60",
    "type": "subsubcategory",
    "code": "03.02.01.00",
    "description": "FDN-GF - Rebar works",
    "specification": "Pile Caps (Type A) - Gr.60 Ø16mm Top & Bot. B.W.",
    "estimatedManpower": 10,
    "manpower": 10,
    "trade": "Rebar Steelman & Cut/Bend",
    "ratePerDay": 850,
    "hasOt": true,
    "startDate": "2026-03-21",
    "endDate": "2026-04-12",
    "duration": 23,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_61",
    "type": "subsubcategory",
    "code": "03.02.02.00",
    "description": "FDN-GF - Rebar works",
    "specification": "Pile Caps (Type A) - G.I. Tie Wire",
    "estimatedManpower": 1,
    "manpower": 1,
    "trade": "Rebar Steelman & Cut/Bend",
    "ratePerDay": 850,
    "hasOt": true,
    "startDate": "2026-03-21",
    "endDate": "2026-04-12",
    "duration": 23,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_62",
    "type": "subsubcategory",
    "code": "03.02.03.00",
    "description": "FDN-GF - Rebar works",
    "specification": "Pile Caps (Type B) - Gr.60 Ø16mm Top & Bot. B.W.",
    "estimatedManpower": 4,
    "manpower": 4,
    "trade": "Rebar Steelman & Cut/Bend",
    "ratePerDay": 850,
    "hasOt": true,
    "startDate": "2026-03-21",
    "endDate": "2026-04-12",
    "duration": 23,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_63",
    "type": "subsubcategory",
    "code": "03.02.04.00",
    "description": "FDN-GF - Rebar works",
    "specification": "Pile Caps (Type B) - G.I. Tie Wire",
    "estimatedManpower": 1,
    "manpower": 1,
    "trade": "Rebar Steelman & Cut/Bend",
    "ratePerDay": 850,
    "hasOt": true,
    "startDate": "2026-03-21",
    "endDate": "2026-04-12",
    "duration": 23,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_64",
    "type": "subsubcategory",
    "code": "03.02.05.00",
    "description": "GF-2F - Rebar works",
    "specification": "Concrete Pedestal - Gr.60 Ø20mm Main Vertical Bars",
    "estimatedManpower": 2,
    "manpower": 2,
    "trade": "Rebar Steelman & Cut/Bend",
    "ratePerDay": 850,
    "hasOt": true,
    "startDate": "2026-04-08",
    "endDate": "2026-04-30",
    "duration": 23,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_65",
    "type": "subsubcategory",
    "code": "03.02.06.00",
    "description": "GF-2F - Rebar works",
    "specification": "Concrete Pedestal - Gr.40 Ø10mm Lat. Ties",
    "estimatedManpower": 1,
    "manpower": 1,
    "trade": "Rebar Steelman & Cut/Bend",
    "ratePerDay": 850,
    "hasOt": true,
    "startDate": "2026-04-08",
    "endDate": "2026-04-30",
    "duration": 23,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_66",
    "type": "subsubcategory",
    "code": "03.02.07.00",
    "description": "GF-2F - Rebar works",
    "specification": "Concrete Pedestal - G.I. Tie Wire",
    "estimatedManpower": 1,
    "manpower": 1,
    "trade": "Rebar Steelman & Cut/Bend",
    "ratePerDay": 850,
    "hasOt": true,
    "startDate": "2026-04-08",
    "endDate": "2026-04-30",
    "duration": 23,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_67",
    "type": "subsubcategory",
    "code": "03.02.08.00",
    "description": "GF-2F - Rebar works",
    "specification": "Slab-on-fill - Gr.40 Ø10mm @ 200mm B.W.",
    "estimatedManpower": 19,
    "manpower": 19,
    "trade": "Rebar Steelman & Cut/Bend",
    "ratePerDay": 850,
    "hasOt": true,
    "startDate": "2026-04-08",
    "endDate": "2026-04-30",
    "duration": 23,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_68",
    "type": "subsubcategory",
    "code": "03.02.09.00",
    "description": "GF-2F - Rebar works",
    "specification": "Slab-on-fill - G.I. Tie Wire",
    "estimatedManpower": 2,
    "manpower": 2,
    "trade": "Rebar Steelman & Cut/Bend",
    "ratePerDay": 850,
    "hasOt": true,
    "startDate": "2026-04-08",
    "endDate": "2026-04-30",
    "duration": 23,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_69",
    "type": "subsubcategory",
    "code": "03.02.10.00",
    "description": "2F-3F - Rebar works",
    "specification": "Slab-on-Steel Deck - Gr.40 Ø10mm @ 200mm B.W. Top & Bottom",
    "estimatedManpower": 31,
    "manpower": 31,
    "trade": "Rebar Steelman & Cut/Bend",
    "ratePerDay": 850,
    "hasOt": true,
    "startDate": "2026-04-25",
    "endDate": "2026-05-14",
    "duration": 20,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_70",
    "type": "subsubcategory",
    "code": "03.02.11.00",
    "description": "2F-3F - Rebar works",
    "specification": "Slab-on-Steel Deck - G.I. Tie Wire",
    "estimatedManpower": 3,
    "manpower": 3,
    "trade": "Rebar Steelman & Cut/Bend",
    "ratePerDay": 850,
    "hasOt": true,
    "startDate": "2026-04-25",
    "endDate": "2026-05-14",
    "duration": 20,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_71",
    "type": "subsubcategory",
    "code": "03.02.12.00",
    "description": "3F-RF - Rebar works",
    "specification": "Slab-on-Steel Deck - Gr.40 Ø10mm @ 200mm B.W. Top & Bottom",
    "estimatedManpower": 7,
    "manpower": 7,
    "trade": "Rebar Steelman & Cut/Bend",
    "ratePerDay": 850,
    "hasOt": true,
    "startDate": "2026-05-08",
    "endDate": "2026-05-25",
    "duration": 18,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_72",
    "type": "subsubcategory",
    "code": "03.02.13.00",
    "description": "3F-RF - Rebar works",
    "specification": "Slab-on-Steel Deck - G.I. Tie Wire",
    "estimatedManpower": 1,
    "manpower": 1,
    "trade": "Rebar Steelman & Cut/Bend",
    "ratePerDay": 850,
    "hasOt": true,
    "startDate": "2026-05-08",
    "endDate": "2026-05-25",
    "duration": 18,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_73",
    "type": "subcategory",
    "code": "03.03.00.00",
    "description": "FORMS AND SHORING WORKS",
    "specification": "",
    "estimatedManpower": 4,
    "manpower": 4,
    "trade": "Lead Carpenter & Formworker",
    "ratePerDay": 850,
    "hasOt": false,
    "startDate": "2026-03-23",
    "endDate": "2026-05-26",
    "duration": 65,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_74",
    "type": "subsubcategory",
    "code": "03.03.01.00",
    "description": "FDN-GF - Form works",
    "specification": "Pile Caps (Type A) - Phenolic boards, bracing supports, shoring supports",
    "estimatedManpower": 1,
    "manpower": 1,
    "trade": "Lead Carpenter & Formworker",
    "ratePerDay": 850,
    "hasOt": false,
    "startDate": "2026-03-23",
    "endDate": "2026-04-14",
    "duration": 23,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_75",
    "type": "subsubcategory",
    "code": "03.03.02.00",
    "description": "FDN-GF - Form works",
    "specification": "Pile Caps (Type B) - Phenolic boards, bracing supports, shoring supports",
    "estimatedManpower": 1,
    "manpower": 1,
    "trade": "Lead Carpenter & Formworker",
    "ratePerDay": 850,
    "hasOt": false,
    "startDate": "2026-03-23",
    "endDate": "2026-04-14",
    "duration": 23,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_76",
    "type": "subsubcategory",
    "code": "03.03.03.00",
    "description": "FDN-GF - Form works",
    "specification": "Concrete Pedestal - Phenolic boards, bracing supports, shoring supports",
    "estimatedManpower": 1,
    "manpower": 1,
    "trade": "Lead Carpenter & Formworker",
    "ratePerDay": 850,
    "hasOt": false,
    "startDate": "2026-03-23",
    "endDate": "2026-04-14",
    "duration": 23,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_77",
    "type": "subsubcategory",
    "code": "03.03.04.00",
    "description": "GF-2F - Form works",
    "specification": "Slab-on-fill - Phenolic boards, blockout forms, bracing supports",
    "estimatedManpower": 3,
    "manpower": 3,
    "trade": "Lead Carpenter & Formworker",
    "ratePerDay": 850,
    "hasOt": false,
    "startDate": "2026-04-10",
    "endDate": "2026-05-02",
    "duration": 23,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_78",
    "type": "subsubcategory",
    "code": "03.03.05.00",
    "description": "2F-3F - Form works",
    "specification": "Slab-on-Steel Deck - Shoring Supports, Bracing Supports",
    "estimatedManpower": 22,
    "manpower": 22,
    "trade": "Lead Carpenter & Formworker",
    "ratePerDay": 850,
    "hasOt": false,
    "startDate": "2026-04-28",
    "endDate": "2026-05-16",
    "duration": 19,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  },
  {
    "id": "mp_79",
    "type": "subsubcategory",
    "code": "03.03.06.00",
    "description": "3F-RF - Form works",
    "specification": "Slab-on-Steel Deck - Shoring Supports, Bracing Supports",
    "estimatedManpower": 6,
    "manpower": 6,
    "trade": "Lead Carpenter & Formworker",
    "ratePerDay": 850,
    "hasOt": false,
    "startDate": "2026-05-10",
    "endDate": "2026-05-26",
    "duration": 17,
    "isCollapsed": false,
    "periodScheduled": {},
    "periodActual": {}
  }
];


  // Helper: Number format with commas
  function formatNumber(num, decimals = 2) {
    const val = parseFloat(num) || 0;
    return val.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function parseSafeDate(dStr, fallback = new Date()) {
    if (!dStr) return new Date(fallback);
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? new Date(fallback) : d;
  }

  function toDateInputStr(d) {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  class ManpowerManager {
    constructor() {
      this.currentProjectId = 'PRJ-2026-001';
      this.containerId = null;
      this.tasks = [];
      this.scale = 'weeks'; // 'days' | 'weeks' | 'months' | 'quarters'
      this.viewMode = 'cumulative'; // 'cumulative' | 'period' | 'headcount'
      this.tradeFilter = 'all';
      this.monthFilter = 'all'; // 'all' | 'YYYY-MM'
      this.projectStartDate = '2026-03-01';
      this.currentDate = toDateInputStr(new Date());
      this.chartVisible = true;
      this.leftPaneWidth = 820;
      this.taskColumns = this.loadColumnWidths();
      this.isDraggingSplitter = false;
      this.contextMenuTaskIdx = null;
      this.initDone = false;
    }

    /**
     * Load column widths from localStorage or fallback
     */
    loadColumnWidths() {
      try {
        const raw = localStorage.getItem(`cost_estimate_manpower_col_widths_${this.currentProjectId}`) ||
                    localStorage.getItem('cost_estimate_manpower_col_widths');
        if (raw) {
          const saved = JSON.parse(raw);
          if (Array.isArray(saved)) {
            return DEFAULT_TASK_COLUMNS.map(def => {
              const found = saved.find(s => s.id === def.id);
              return found && found.width ? { ...def, width: Math.max(def.minWidth, parseInt(found.width, 10)) } : { ...def };
            });
          }
        }
      } catch (e) {}
      return DEFAULT_TASK_COLUMNS.map(def => ({ ...def }));
    }

    /**
     * Save column widths to localStorage
     */
    saveColumnWidths() {
      try {
        localStorage.setItem(`cost_estimate_manpower_col_widths_${this.currentProjectId}`, JSON.stringify(this.taskColumns));
        localStorage.setItem('cost_estimate_manpower_col_widths', JSON.stringify(this.taskColumns));
      } catch (e) {}
    }

    /**
     * Detect and adapt the exact project timeline range from the Gantt Schedule Timeline Panel
     */
    getProjectGanttTimelineRange() {
      // 1. Direct function window.getGanttTimelineRange if exposed (from boq_schedule.js or index.html)
      if (typeof window !== 'undefined' && typeof window.getGanttTimelineRange === 'function') {
        try {
          const r = window.getGanttTimelineRange();
          if (r && r.startDate) {
            return {
              startDate: r.startDate,
              endDate: r.endDate || r.startDate,
              totalDays: r.totalDays,
              scale: r.scale || this.scale || 'weeks'
            };
          }
        } catch (e) {}
      }

      // 2. DOM elements in active page: #ganttProjectStartInput and #ganttProjectFinishDisplay
      let domStart = null;
      let domEnd = null;
      if (typeof document !== 'undefined') {
        const startEl = document.getElementById('ganttProjectStartInput');
        if (startEl && startEl.value) domStart = startEl.value;
        const finishEl = document.getElementById('ganttProjectFinishDisplay');
        if (finishEl && finishEl.textContent && finishEl.textContent.trim() !== '-') {
          const parsed = parseSafeDate(finishEl.textContent.trim(), null);
          if (parsed) domEnd = toDateInputStr(parsed);
        }
      }

      // 3. Live Gantt function from boq_schedule if available
      if (!domStart && typeof window !== 'undefined' && typeof window.getGanttProjectStartDate === 'function') {
        try {
          const gStart = window.getGanttProjectStartDate();
          if (gStart) domStart = gStart;
        } catch (e) {}
      }

      // 4. Live Gantt task time info from boq_schedule
      if (typeof window !== 'undefined' && typeof window.getGanttTaskTimeInfo === 'function' && Array.isArray(window.boqData) && window.boqData.length > 0) {
        let minStart = null;
        let maxEnd = null;
        window.boqData.forEach((row, i) => {
          try {
            const info = window.getGanttTaskTimeInfo(i);
            if (info) {
              if (info.startDate) {
                const s = parseSafeDate(info.startDate, null);
                if (s && (!minStart || s < minStart)) minStart = s;
              }
              if (info.endDate) {
                const e = parseSafeDate(info.endDate, null);
                if (e && (!maxEnd || e > maxEnd)) maxEnd = e;
              }
            }
          } catch (e) {}
        });
        if (minStart) {
          if (!domStart) domStart = toDateInputStr(minStart);
          if (!domEnd && maxEnd) domEnd = toDateInputStr(maxEnd);
        }
      }

      // 5. Stored Gantt start date in localStorage
      let storedStart = null;
      if (typeof localStorage !== 'undefined') {
        storedStart = localStorage.getItem('cost_estimate_gantt_start_v1');
      }

      // 6. Project catalog in index.html
      if (!domStart && typeof window !== 'undefined' && typeof window.getProject === 'function') {
        try {
          const p = window.getProject(this.currentProjectId);
          if (p) {
            if (p.timeline && p.timeline.settings && p.timeline.settings.projectStartDate) {
              domStart = p.timeline.settings.projectStartDate;
            } else if (p.startDate) {
              domStart = p.startDate;
            }
            if (p.timeline && Array.isArray(p.timeline.ganttTasks) && p.timeline.ganttTasks.length > 0) {
              let pMin = null;
              let pMax = null;
              p.timeline.ganttTasks.forEach(t => {
                if (t.startDate) {
                  const s = parseSafeDate(t.startDate, null);
                  if (s && (!pMin || s < pMin)) pMin = s;
                }
                if (t.endDate) {
                  const e = parseSafeDate(t.endDate, null);
                  if (e && (!pMax || e > pMax)) pMax = e;
                }
              });
              if (pMin && !domStart) domStart = toDateInputStr(pMin);
              if (pMax && !domEnd) domEnd = toDateInputStr(pMax);
            }
          }
        } catch (e) {}
      }

      const effectiveStart = domStart || storedStart || this.projectStartDate || '2026-10-01';
      let effectiveEnd = domEnd;
      if (!effectiveEnd) {
        const sDate = parseSafeDate(effectiveStart);
        const eDate = new Date(sDate);
        eDate.setDate(eDate.getDate() + 181);
        effectiveEnd = toDateInputStr(eDate);
      }

      return {
        startDate: effectiveStart,
        endDate: effectiveEnd,
        scale: typeof window !== 'undefined' && window.ganttScale ? window.ganttScale : this.scale
      };
    }

    /**
     * Retrieve the active project timeline start date from project Gantt Schedule
     */
    getProjectGanttStartDate() {
      const range = this.getProjectGanttTimelineRange();
      return range.startDate;
    }

    /**
     * Compute all unique months across the project timeline for the dropdown selection
     * Starts on projectStartDate and ends on projectEndDate / max task date
     */
    getAvailableMonths() {
      const ganttRange = this.getProjectGanttTimelineRange();
      const minDate = parseSafeDate(this.projectStartDate || ganttRange.startDate || '2026-10-01');
      let maxDate = ganttRange.endDate ? parseSafeDate(ganttRange.endDate) : null;

      if (Array.isArray(this.tasks)) {
        this.tasks.forEach(t => {
          if (t.endDate) {
            const e = parseSafeDate(t.endDate);
            if (!maxDate || e > maxDate) maxDate = e;
          }
        });
      }

      if (!maxDate || maxDate <= minDate) {
        maxDate = new Date(minDate);
        maxDate.setDate(maxDate.getDate() + 181);
      }

      const months = [];
      let cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      const last = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
      let mIndex = 1;

      while (cur <= last) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const val = `${y}-${m}`;
        const monthName = cur.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        months.push({
          value: val,
          label: `🗓️ ${monthName} (Month ${mIndex})`,
          year: y,
          monthIndex: cur.getMonth()
        });
        cur.setMonth(cur.getMonth() + 1);
        mIndex++;
      }
      return months;
    }

    /**
     * Automatically adapt and match Manpower Utilization dates and scope to Gantt Chart Schedule Timeline Panel
     */
    adaptAndSyncWithGanttTimeline(force = false) {
      const range = this.getProjectGanttTimelineRange();
      if (!range || !range.startDate) return;

      const previousStartDate = this.projectStartDate;
      const newStartDate = range.startDate;
      const newEndDate = range.endDate;
      const isStartDifferent = previousStartDate !== newStartDate;

      this.projectStartDate = newStartDate;
      this.projectEndDate = newEndDate;

      if (range.scale && ['days', 'weeks', 'months', 'quarters'].includes(range.scale)) {
        this.scale = range.scale;
      }

      let needsRephase = force || isStartDifferent;

      if (!Array.isArray(this.tasks) || this.tasks.length === 0) {
        this.tasks = this.getDefaultConstructionTemplate();
        needsRephase = false;
      } else {
        const earliestTaskStart = this.tasks.reduce((min, t) => {
          if (!t.startDate) return min;
          return !min || t.startDate < min ? t.startDate : min;
        }, null);
        if (earliestTaskStart && earliestTaskStart !== newStartDate) {
          needsRephase = true;
        }
      }

      // If live Gantt tasks exist in boqData
      if (typeof window !== 'undefined' && typeof window.getGanttTaskTimeInfo === 'function' && Array.isArray(window.boqData) && window.boqData.length > 0) {
        this.syncFromGantt(false);
      } else if (needsRephase && Array.isArray(this.tasks) && this.tasks.length > 0) {
        this.tasks.forEach((t, i) => {
          if (t.type !== 'trade') {
            const phased = this.getPhasedDates(t.code, i, this.projectStartDate);
            t.startDate = phased.start;
            t.endDate = phased.end;
            t.duration = phased.dur;
          }
        });
        this.rollupParentDates(this.tasks);
      }

      const months = this.getAvailableMonths();
      if (this.monthFilter !== 'all' && !months.some(m => m.value === this.monthFilter)) {
        this.monthFilter = 'all';
      }

      this.saveData();
      if (this.containerId && typeof document !== 'undefined' && document.getElementById(this.containerId)) {
        this.render();
      }
    }

    /**
     * Synchronize task dates live from Gantt schedule if getGanttTaskTimeInfo is active
     */
    syncLiveGanttTaskDates() {
      if (typeof window !== 'undefined' && typeof window.getGanttTaskTimeInfo === 'function' && Array.isArray(this.tasks)) {
        let changed = false;
        this.tasks.forEach((t, idx) => {
          try {
            let gInfo = window.getGanttTaskTimeInfo(idx);
            if (!gInfo && Array.isArray(window.boqData)) {
              const bIdx = window.boqData.findIndex(r => r.code === t.code || (r.title && r.title === t.description));
              if (bIdx >= 0) gInfo = window.getGanttTaskTimeInfo(bIdx);
            }
            if (gInfo) {
              const sStr = gInfo.startStr || (gInfo.startDate ? toDateInputStr(gInfo.startDate) : null);
              const eStr = gInfo.endDate ? toDateInputStr(gInfo.endDate) : null;
              if (sStr && t.startDate !== sStr) {
                t.startDate = sStr;
                changed = true;
              }
              if (gInfo.duration && t.duration !== gInfo.duration) {
                t.duration = gInfo.duration;
                changed = true;
              }
              if (eStr && t.endDate !== eStr) {
                t.endDate = eStr;
                changed = true;
              }
            }
          } catch (e) {}
        });
        if (changed) {
          this.rollupParentDates(this.tasks);
          this.saveData();
        }
      }
    }

    /**
     * Generate CPM-phased construction dates based on project start date and total horizon
     */
    getPhasedDates(code, idx, baseDate) {
      const baseStr = baseDate || this.projectStartDate || '2026-10-01';
      const base = parseSafeDate(baseStr);

      let totalDays = 182; // Default for 6-month horizon (Oct 1 to Mar 31)
      if (this.projectEndDate) {
        const eDate = parseSafeDate(this.projectEndDate);
        if (eDate > base) {
          totalDays = Math.round((eDate - base) / (1000 * 60 * 60 * 24)) + 1;
        }
      }

      const calcSpan = (startFraction, endFraction) => {
        const sOffset = Math.round(startFraction * (totalDays - 1));
        const eOffset = Math.max(sOffset + 1, Math.round(endFraction * (totalDays - 1)));
        const d1 = new Date(base);
        d1.setDate(d1.getDate() + sOffset);
        const d2 = new Date(base);
        d2.setDate(d2.getDate() + eOffset);
        return {
          start: toDateInputStr(d1),
          end: toDateInputStr(d2),
          dur: eOffset - sOffset + 1
        };
      };

      const c = String(code || '').trim();
      const parts = c.split('.');
      const p1 = parts[1] || '';
      const p2 = parts[2] || '';

      if (c.startsWith('01.00.')) {
        if (c === '01.00.00.00') return calcSpan(0, 1.0); // Preliminary runs across full project
        const num = parseInt(p1, 10);
        if (num >= 1 && num <= 5) return calcSpan(0, 1.0);
        if (num === 6 || num === 7) return calcSpan(0, 0.35);
        if (num === 8) return calcSpan(0.05, 0.90);
        if (num >= 9 && num <= 14) return calcSpan(0, 0.25);
        if (num === 15) return calcSpan(0.10, 0.95);
        if (num === 16) return calcSpan(0.80, 1.0);
        return calcSpan(0, 1.0);
      }

      if (c.startsWith('02.')) {
        if (c === '02.00.00.00') return calcSpan(0.03, 0.45);
        if (p1 === '01') {
          if (p2 === '00') return calcSpan(0.03, 0.35);
          const sub = parseInt(p2, 10);
          if (sub === 1) return calcSpan(0.03, 0.15);
          if (sub === 2) return calcSpan(0.08, 0.20);
          if (sub === 3) return calcSpan(0.12, 0.25);
          if (sub >= 4) return calcSpan(0.15, 0.35);
          return calcSpan(0.03, 0.35);
        }
        if (p1 === '02') return calcSpan(0.05, 0.25);
        if (p1 === '03') return calcSpan(0.08, 0.28);
        if (p1 === '04') return calcSpan(0.15, 0.45);
        return calcSpan(0.03, 0.45);
      }

      if (c.startsWith('03.')) {
        if (c === '03.00.00.00') return calcSpan(0.12, 1.0); // Structural works finishes at project completion
        if (p1 === '01') {
          // Concrete Works
          if (p2 === '00') return calcSpan(0.15, 0.95);
          const sub = parseInt(p2, 10);
          if (sub <= 3) return calcSpan(0.15, 0.35);
          if (sub === 4) return calcSpan(0.30, 0.55);
          if (sub === 5) return calcSpan(0.35, 0.60);
          if (sub === 6) return calcSpan(0.50, 0.75);
          if (sub >= 7) return calcSpan(0.65, 0.95);
          return calcSpan(0.15, 0.95);
        }
        if (p1 === '02') {
          // Reinforcement Works
          if (p2 === '00') return calcSpan(0.14, 0.90);
          const sub = parseInt(p2, 10);
          if (sub <= 4) return calcSpan(0.14, 0.38);
          if (sub <= 9) return calcSpan(0.32, 0.58);
          if (sub <= 11) return calcSpan(0.48, 0.72);
          if (sub >= 12) return calcSpan(0.62, 0.90);
          return calcSpan(0.14, 0.90);
        }
        if (p1 === '03') {
          // Form Works
          if (p2 === '00') return calcSpan(0.16, 0.92);
          const sub = parseInt(p2, 10);
          if (sub <= 3) return calcSpan(0.16, 0.40);
          if (sub === 4) return calcSpan(0.34, 0.60);
          if (sub === 5) return calcSpan(0.50, 0.74);
          if (sub >= 6) return calcSpan(0.64, 0.92);
          return calcSpan(0.16, 0.92);
        }
      }

      const offsetFrac = Math.min(0.7, (idx || 0) * 0.02);
      return calcSpan(offsetFrac, Math.min(1.0, offsetFrac + 0.25));
    }

    /**
     * Roll up summary category and subcategory dates to enclose all child tasks
     */
    rollupParentDates(tasks) {
      if (!Array.isArray(tasks)) return;
      for (let i = tasks.length - 1; i >= 0; i--) {
        const t = tasks[i];
        const pLvl = t.type === 'category' ? 1 : (t.type === 'subcategory' ? 2 : 3);
        if (pLvl < 3) {
          let minStart = null;
          let maxEnd = null;
          for (let j = i + 1; j < tasks.length; j++) {
            const c = tasks[j];
            const cLvl = c.type === 'category' ? 1 : (c.type === 'subcategory' ? 2 : 3);
            if (cLvl <= pLvl) break;
            if (c.startDate) {
              if (!minStart || c.startDate < minStart) minStart = c.startDate;
            }
            if (c.endDate) {
              if (!maxEnd || c.endDate > maxEnd) maxEnd = c.endDate;
            }
          }
          if (minStart && maxEnd) {
            t.startDate = minStart;
            t.endDate = maxEnd;
            const d1 = parseSafeDate(minStart);
            const d2 = parseSafeDate(maxEnd);
            t.duration = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
          }
        }
      }
    }

    /**
     * Mount and initialize the Manpower module into a target DOM container
     */
    async mount(containerId, projectId) {
      this.containerId = containerId;
      if (projectId) {
        this.currentProjectId = projectId;
        this.taskColumns = this.loadColumnWidths();
      }

      // Restore saved pane width if present
      try {
        const savedPaneW = localStorage.getItem('mp_left_pane_width');
        if (savedPaneW) this.leftPaneWidth = parseInt(savedPaneW, 10);
      } catch (e) {}

      // Load data from persistence or fallback
      await this.loadData();

      // Synchronize and adapt to Gantt Schedule Timeline Panel
      this.adaptAndSyncWithGanttTimeline(false);

      const container = document.getElementById(containerId);
      if (!container) return;

      // Render the complete layout
      this.render();

      // Setup window listeners once
      if (!this.initDone) {
        this.setupGlobalEvents();
        this.initDone = true;
      }
    }

    /**
     * Load project manpower tasks from storage
     */
    isStaleOrMismatched(tasks) {
      if (!Array.isArray(tasks) || tasks.length === 0) return true;
      const hasOldDummy = tasks.some(t => 
        t.code === '1.0' || 
        (t.description && t.description.toLowerCase().includes('general requirements & site mobilization')) ||
        (t.description && t.description.toLowerCase().includes('substructure & foundation works'))
      );
      if (hasOldDummy) return true;

      const hasPrelim = tasks.some(t => 
        t.code === '01.00.00.00' || 
        (t.description && t.description.toUpperCase().includes('PRELIMINARY FOR CIVIL WORKS'))
      );
      const hasEarth = tasks.some(t => 
        t.code === '02.00.00.00' || 
        (t.description && t.description.toUpperCase().includes('EARTH WORKS'))
      );
      const hasStruct = tasks.some(t => 
        t.code === '03.00.00.00' || 
        (t.description && t.description.toUpperCase().includes('STRUCTURAL WORKS'))
      );

      if (!hasPrelim || !hasEarth || !hasStruct) return true;
      return false;
    }

    /**
     * Load project manpower tasks from storage
     */
    async loadData() {
      let saved = null;
      if (window.FCLStorage && typeof window.FCLStorage.loadProjectSection === 'function') {
        saved = await window.FCLStorage.loadProjectSection(this.currentProjectId, 'manpower');
      }
      if (!saved) {
        try {
          const raw = localStorage.getItem(`cost_estimate_manpower_${this.currentProjectId}`);
          if (raw) saved = JSON.parse(raw);
        } catch (e) {}
      }

      // Always detect and adapt from Gantt Schedule Timeline Panel
      const ganttRange = this.getProjectGanttTimelineRange();
      this.projectStartDate = ganttRange.startDate;
      this.projectEndDate = ganttRange.endDate;

      // Validate saved tasks against project Gantt schedule structure
      const isStale = this.isStaleOrMismatched(saved?.tasks);

      if (saved && Array.isArray(saved.tasks) && saved.tasks.length > 0 && !isStale) {
        this.tasks = saved.tasks;
        if (saved.scale) this.scale = saved.scale;
        if (saved.viewMode) this.viewMode = saved.viewMode;
        if (saved.monthFilter) this.monthFilter = saved.monthFilter;

        // Auto-adapt if tasks start on a different date horizon than Gantt schedule
        const earliestTask = this.tasks.reduce((min, t) => {
          if (!t.startDate) return min;
          return !min || t.startDate < min ? t.startDate : min;
        }, null);

        if (earliestTask && earliestTask !== this.projectStartDate) {
          this.adaptAndSyncWithGanttTimeline(true);
          return;
        }

        // Live sync from Gantt chart activities if live Gantt engine is loaded
        this.syncLiveGanttTaskDates();
      } else {
        // Auto-seed by syncing from Gantt chart / BOQ or project baseline template
        this.syncFromGantt(true);
      }
    }

    /**
     * Save project manpower tasks to storage & cloud sync
     */
    async saveData() {
      const payload = {
        projectId: this.currentProjectId,
        tasks: this.tasks,
        scale: this.scale,
        viewMode: this.viewMode,
        monthFilter: this.monthFilter,
        projectStartDate: this.projectStartDate,
        updatedAt: new Date().toISOString()
      };

      try {
        localStorage.setItem(`cost_estimate_manpower_${this.currentProjectId}`, JSON.stringify(payload));
        if (window.FCLStorage && typeof window.FCLStorage.saveProjectSection === 'function') {
          await window.FCLStorage.saveProjectSection(this.currentProjectId, 'manpower', payload);
        }
        if (window.FCLFirebaseSync && typeof window.FCLFirebaseSync.queueSectionSync === 'function') {
          window.FCLFirebaseSync.queueSectionSync(this.currentProjectId, 'manpower', payload);
        }
      } catch (e) {
        console.warn('Error saving manpower data:', e);
      }
    }

    /**
     * Synchronize with Master Gantt Schedule and BOQ Scope Items
     * Matches exact Work Descriptions, Item Codes, and hierarchy from BOQ Workbook
     */
    syncFromGantt(shouldSave = true) {
      // Synchronize project start date from Gantt Schedule
      this.projectStartDate = this.getProjectGanttStartDate();
      let importedTasks = [];

      // 1. Check window.boqData (in-memory in active boq_schedule workbook)
      if (typeof window.boqData !== 'undefined' && Array.isArray(window.boqData) && window.boqData.length > 0) {
        importedTasks = this.convertBoqDataToManpower(window.boqData);
      }
      // 2. Check FCLStorage project-scoped BOQ
      else if (window.FCLStorage) {
        try {
          const savedBOQ = window.FCLStorage.readProjectSectionSync(this.currentProjectId, 'boq');
          if (savedBOQ && Array.isArray(savedBOQ.boqData) && savedBOQ.boqData.length > 0) {
            importedTasks = this.convertBoqDataToManpower(savedBOQ.boqData);
          } else if (savedBOQ && Array.isArray(savedBOQ.items) && savedBOQ.items.length > 0) {
            importedTasks = this.convertBoqItemsToManpower(savedBOQ.items);
          }
        } catch (e) {}
      }

      // 3. Check localStorage for project BOQ
      if (!importedTasks || importedTasks.length === 0) {
        try {
          const raw = localStorage.getItem(`cost_estimate_boq_${this.currentProjectId}`) ||
                      localStorage.getItem('cost_estimate_boq_v1');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.boqData) && parsed.boqData.length > 0) {
              importedTasks = this.convertBoqDataToManpower(parsed.boqData);
            }
          }
        } catch (e) {}
      }

      // 4. Check FCL_PROJECT_CATALOG_DATA
      if (!importedTasks || importedTasks.length === 0) {
        try {
          const catRaw = localStorage.getItem('FCL_PROJECT_CATALOG_DATA');
          if (catRaw) {
            const catalog = JSON.parse(catRaw);
            const p = Array.isArray(catalog) ? catalog.find(x => x.id === this.currentProjectId) : null;
            if (p && p.boq && Array.isArray(p.boq.boqData) && p.boq.boqData.length > 0) {
              importedTasks = this.convertBoqDataToManpower(p.boq.boqData);
            } else if (p && p.timeline && Array.isArray(p.timeline.ganttTasks) && p.timeline.ganttTasks.length > 0) {
              importedTasks = this.convertGanttTasksToManpower(p.timeline.ganttTasks);
            }
          }
        } catch (e) {}
      }

      // 5. Check DEFAULT_SPORTS_CLUB_BOQ_DATA
      if (!importedTasks || importedTasks.length === 0) {
        if (typeof window.DEFAULT_SPORTS_CLUB_BOQ_DATA !== 'undefined' && Array.isArray(window.DEFAULT_SPORTS_CLUB_BOQ_DATA)) {
          importedTasks = this.convertBoqDataToManpower(window.DEFAULT_SPORTS_CLUB_BOQ_DATA);
        }
      }

      // 6. If still empty, supply rich comprehensive construction baseline
      if (!importedTasks || importedTasks.length === 0) {
        importedTasks = this.getDefaultConstructionTemplate();
      }

      this.tasks = importedTasks;
      if (shouldSave) {
        this.saveData();
        this.render();
      }
    }

    /**
     * Map boqData to Manpower Hierarchy with Sub-Tasks and Sub-Sub-Tasks
     * Matches exact Work Descriptions, Item Codes, and computes Estimated Manpower
     */
    convertBoqDataToManpower(boqData) {
      const tasks = boqData.map((row, idx) => {
        const code = String(row.code || '').trim();
        let type = 'subsubcategory';
        if (code.endsWith('.00.00.00') || row.type === 'category') {
          type = 'category';
        } else if (code.startsWith('01.00.') && code !== '01.00.00.00') {
          type = 'subcategory';
        } else if (code.endsWith('.00.00') || row.type === 'subcategory') {
          type = 'subcategory';
        } else {
          type = 'subsubcategory';
        }

        // Match exact Work Description from the BOQ workbook
        const desc = (row.title || row.specification || row.description || `Scope Item ${idx + 1}`).trim();
        const tradeMatch = this.inferTradeFromText(desc + ' ' + (row.specification || ''));

        // Resolve dates: Live Gantt task time info -> row dates -> Phased timeline
        let sDate = null;
        let dur = null;
        let eDate = null;

        if (typeof window !== 'undefined' && typeof window.getGanttTaskTimeInfo === 'function') {
          try {
            const gInfo = window.getGanttTaskTimeInfo(idx);
            if (gInfo) {
              if (gInfo.startStr) sDate = gInfo.startStr;
              else if (gInfo.startDate) sDate = toDateInputStr(gInfo.startDate);
              if (gInfo.duration) dur = gInfo.duration;
              if (gInfo.endDate) eDate = toDateInputStr(gInfo.endDate);
            }
          } catch (e) {}
        }

        if (!sDate) sDate = row.ganttStartDate || row.startDate;
        if (!dur) dur = parseInt(row.ganttDuration || row.duration || row.days, 10);
        if (!eDate) eDate = row.ganttFinishDate || row.finishDate;

        if (!sDate) {
          const phased = this.getPhasedDates(code, idx);
          sDate = phased.start;
          dur = phased.dur;
          eDate = phased.end;
        }
        if (!dur || isNaN(dur)) dur = 15;
        if (!eDate) eDate = this.calculateEndDate(sDate, dur);

        // Compute Estimated Manpower based on BOQ Labor Cost, wage rate, and duration
        let estMp = 0;
        if (type !== 'category') {
          const qty = parseFloat(row.qty) || 0;
          const laborCost = parseFloat(row.laborUnitCost || row.laborCost) || 0;
          const totalLabor = qty * laborCost;
          if (totalLabor > 0 && tradeMatch.rate > 0) {
            const manDays = totalLabor / tradeMatch.rate;
            estMp = Math.max(1, Math.round(manDays / Math.max(1, dur)));
          } else {
            estMp = (type === 'subcategory') ? 4 : 2;
          }
        }

        const activeMp = estMp > 0 ? estMp : (type === 'category' ? 0 : 3);
        const isOtItem = (desc.toLowerCase().includes('concrete') || desc.toLowerCase().includes('rebar') || desc.toLowerCase().includes('excavat'));

        return {
          id: `mp_${idx + 1}`,
          type: type,
          code: code || `T-${(idx + 1) * 10}`,
          description: desc,
          specification: (row.specification || '').trim(),
          estimatedManpower: estMp,
          manpower: activeMp,
          trade: tradeMatch.name,
          ratePerDay: tradeMatch.rate,
          hasOt: isOtItem,
          startDate: sDate,
          endDate: eDate,
          duration: dur,
          isCollapsed: false,
          periodScheduled: {},
          periodActual: {}
        };
      });

      this.rollupParentDates(tasks);
      return tasks;
    }

    convertGanttTasksToManpower(ganttTasks) {
      const tasks = ganttTasks.map((t, idx) => {
        const desc = t.name || `Task ${idx + 1}`;
        const tradeMatch = this.inferTradeFromText(desc);
        const sDate = t.startDate || '2026-03-01';
        const dur = parseInt(t.duration || 20, 10) || 20;
        const eDate = t.endDate || this.calculateEndDate(sDate, dur);
        const isCat = (idx % 4 === 0);
        const estMp = isCat ? 0 : Math.floor(Math.random() * 6) + 4;

        return {
          id: `mp_${idx + 1}`,
          type: isCat ? 'category' : (idx % 2 === 0 ? 'subcategory' : 'subsubcategory'),
          code: t.code || `T-${100 + idx}`,
          description: desc,
          estimatedManpower: estMp,
          manpower: estMp,
          trade: tradeMatch.name,
          ratePerDay: tradeMatch.rate,
          hasOt: false,
          startDate: sDate,
          endDate: eDate,
          duration: dur,
          isCollapsed: false,
          periodScheduled: {},
          periodActual: {}
        };
      });

      this.rollupParentDates(tasks);
      return tasks;
    }

    convertBoqItemsToManpower(items) {
      return items.map((it, idx) => {
        const desc = it.description || it.workDescription || `Item ${idx + 1}`;
        const tradeMatch = this.inferTradeFromText(desc);
        const isCat = (idx === 0);
        const estMp = isCat ? 0 : 6;
        return {
          id: `mp_${idx + 1}`,
          type: it.type || (isCat ? 'category' : 'subsubcategory'),
          code: it.itemCode || it.code || `1.${idx + 1}`,
          description: desc,
          estimatedManpower: estMp,
          manpower: estMp,
          trade: tradeMatch.name,
          ratePerDay: tradeMatch.rate,
          hasOt: false,
          startDate: '2026-03-01',
          endDate: '2026-04-15',
          duration: 30,
          isCollapsed: false,
          periodScheduled: {},
          periodActual: {}
        };
      });
    }

    getDefaultConstructionTemplate() {
      const template = JSON.parse(JSON.stringify(PROJECT_GANTT_BOQ_BASELINE));
      const range = this.getProjectGanttTimelineRange();
      const baseStart = range.startDate || this.projectStartDate || '2026-10-01';
      template.forEach((t, i) => {
        const phased = this.getPhasedDates(t.code, i, baseStart);
        t.startDate = phased.start;
        t.endDate = phased.end;
        t.duration = phased.dur;
      });
      this.rollupParentDates(template);
      return template;
    }

    inferTradeFromText(text) {
      const lower = String(text || '').toLowerCase();
      if (lower.includes('foreman') || lower.includes('supervis') || lower.includes('in-charge') || lower.includes('admin') || lower.includes('mobiliz') || lower.includes('management')) {
        return STANDARD_TRADES[0];
      }
      if (lower.includes('form') || lower.includes('carpenter') || lower.includes('wood') || lower.includes('falsework') || lower.includes('shoring')) {
        return STANDARD_TRADES[1];
      }
      if (lower.includes('rebar') || lower.includes('steelman') || lower.includes('bar ') || lower.includes('deformed') || lower.includes('cut and bend') || lower.includes('reinforc')) {
        return STANDARD_TRADES[2];
      }
      if (lower.includes('concrete') || lower.includes('mason') || lower.includes('plaster') || lower.includes('chb') || lower.includes('pour') || lower.includes('finisher')) {
        return STANDARD_TRADES[3];
      }
      if (lower.includes('excavat') || lower.includes('operator') || lower.includes('equipment') || lower.includes('backhoe') || lower.includes('crane') || lower.includes('bored pile')) {
        return STANDARD_TRADES[4];
      }
      if (lower.includes('elect') || lower.includes('light') || lower.includes('wiring') || lower.includes('panel') || lower.includes('breaker') || lower.includes('conduit')) {
        return STANDARD_TRADES[5];
      }
      if (lower.includes('plumb') || lower.includes('pipe') || lower.includes('drain') || lower.includes('waterline') || lower.includes('sewer') || lower.includes('sanitary')) {
        return STANDARD_TRADES[6];
      }
      if (lower.includes('weld') || lower.includes('truss') || lower.includes('rafter') || lower.includes('structural steel') || lower.includes('metal')) {
        return STANDARD_TRADES[7];
      }
      if (lower.includes('paint') || lower.includes('coating') || lower.includes('varnish') || lower.includes('finish')) {
        return STANDARD_TRADES[8];
      }
      return STANDARD_TRADES[9];
    }

    calculateEndDate(startStr, durationDays) {
      const d = parseSafeDate(startStr);
      d.setDate(d.getDate() + Math.max(1, durationDays) - 1);
      return toDateInputStr(d);
    }

    /**
     * Compute Timeline Date Columns based on active Scale:
     * Tier 1: Month or Quarter
     * Tier 2: Week or Day
     * Exactly matches the Gantt Chart Schedule Timeline Panel without artificial date offset/buffer
     */
    computeTimelinePeriods() {
      const ganttRange = this.getProjectGanttTimelineRange();
      const timelineStart = parseSafeDate(this.projectStartDate || ganttRange.startDate || '2026-10-01');
      let timelineEnd = ganttRange.endDate ? parseSafeDate(ganttRange.endDate) : null;

      let maxTaskDate = null;
      if (Array.isArray(this.tasks)) {
        this.tasks.forEach(t => {
          if (t.endDate) {
            const e = parseSafeDate(t.endDate);
            if (!maxTaskDate || e > maxTaskDate) maxTaskDate = e;
          }
        });
      }

      if (!timelineEnd || (maxTaskDate && maxTaskDate > timelineEnd)) {
        timelineEnd = maxTaskDate || new Date(timelineStart.getTime() + 180 * 86400000);
      }
      if (timelineEnd <= timelineStart) {
        timelineEnd = new Date(timelineStart.getTime() + 180 * 86400000);
      }

      const totalDays = Math.max(1, Math.round((timelineEnd - timelineStart) / (1000 * 60 * 60 * 24)) + 1);

      const periods = [];
      const tier1Groups = [];

      // =========================================================================
      // SINGLE MONTH VIEW (when monthFilter is active and !== 'all')
      // =========================================================================
      if (this.monthFilter && this.monthFilter !== 'all') {
        const parts = this.monthFilter.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // 0-based
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month, daysInMonth);
        const monthName = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        if (this.scale === 'weeks') {
          let cur = new Date(monthStart);
          const dayOfWeek = cur.getDay();
          const diff = cur.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
          cur.setDate(diff);

          let wIdx = 1;
          while (cur <= monthEnd || (cur.getMonth() === month && cur.getFullYear() === year)) {
            const key = toDateInputStr(cur);
            const wLabel = `W${wIdx}`;
            const dateSub = `${cur.getMonth() + 1}/${cur.getDate()}`;

            periods.push({
              key: key,
              date: new Date(cur),
              tier2Label: wLabel,
              tier2Sub: dateSub,
              width: 58,
              days: 7
            });

            wIdx++;
            cur.setDate(cur.getDate() + 7);
            if (cur > monthEnd && cur.getMonth() !== month) break;
          }

          tier1Groups.push({ label: `${monthName} (${periods.length} Weeks)`, colSpan: periods.length });
        } else {
          // Default for month view: Day-by-Day (days 1 to daysInMonth)
          for (let d = 1; d <= daysInMonth; d++) {
            const cur = new Date(year, month, d);
            const dayNum = `${d}`;
            const dayName = cur.toLocaleDateString('en-US', { weekday: 'narrow' });
            const dayShort = cur.toLocaleDateString('en-US', { weekday: 'short' });
            const key = toDateInputStr(cur);

            periods.push({
              key: key,
              date: new Date(cur),
              tier2Label: dayNum,
              tier2Sub: dayName,
              fullDay: dayShort,
              width: 32,
              days: 1
            });
          }

          tier1Groups.push({ label: `${monthName} (${daysInMonth} Days)`, colSpan: daysInMonth });
        }

        return { periods, tier1Groups };
      }

      // =========================================================================
      // FULL HORIZON VIEW — MATCHES EXACT GANTT SCHEDULE TIMELINE PANEL
      // (Starts on timelineStart e.g. 2026-10-01, Ends on timelineEnd e.g. 2027-03-31)
      // =========================================================================
      if (this.scale === 'days') {
        let curMonth = '';
        let mCols = 0;

        for (let i = 0; i < totalDays; i++) {
          const cur = new Date(timelineStart);
          cur.setDate(timelineStart.getDate() + i);
          const mLabel = cur.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          const dayNum = cur.getDate();
          const dayName = cur.toLocaleDateString('en-US', { weekday: 'narrow' });
          const key = toDateInputStr(cur);

          if (mLabel !== curMonth) {
            if (curMonth !== '') {
              tier1Groups.push({ label: curMonth, colSpan: mCols });
            }
            curMonth = mLabel;
            mCols = 1;
          } else {
            mCols++;
          }

          periods.push({
            key: key,
            date: new Date(cur),
            tier2Label: `${dayNum}`,
            tier2Sub: dayName,
            width: 32,
            days: 1
          });
        }
        if (curMonth !== '') tier1Groups.push({ label: curMonth, colSpan: mCols });
      } 
      else if (this.scale === 'weeks') {
        const totalWeeks = Math.ceil(totalDays / 7);
        let curMonth = '';
        let mCols = 0;

        for (let w = 0; w < totalWeeks; w++) {
          const cur = new Date(timelineStart);
          cur.setDate(timelineStart.getDate() + w * 7);
          const mLabel = cur.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          const key = toDateInputStr(cur);
          const wLabel = `W${w + 1}`;
          const dateStr = `${cur.getMonth() + 1}/${cur.getDate()}`;

          if (mLabel !== curMonth) {
            if (curMonth !== '') {
              tier1Groups.push({ label: curMonth, colSpan: mCols });
            }
            curMonth = mLabel;
            mCols = 1;
          } else {
            mCols++;
          }

          periods.push({
            key: key,
            date: new Date(cur),
            tier2Label: wLabel,
            tier2Sub: dateStr,
            width: 58,
            days: 7
          });
        }
        if (curMonth !== '') tier1Groups.push({ label: curMonth, colSpan: mCols });
      } 
      else if (this.scale === 'months') {
        let curYear = '';
        let yCols = 0;
        let cMonth = new Date(timelineStart);
        cMonth.setDate(1);

        while (cMonth <= timelineEnd) {
          const yLabel = `${cMonth.getFullYear()}`;
          const mLabel = cMonth.toLocaleDateString('en-US', { month: 'short' });
          const key = `${cMonth.getFullYear()}-${String(cMonth.getMonth() + 1).padStart(2, '0')}`;

          if (yLabel !== curYear) {
            if (curYear !== '') {
              tier1Groups.push({ label: curYear, colSpan: yCols });
            }
            curYear = yLabel;
            yCols = 1;
          } else {
            yCols++;
          }

          periods.push({
            key: key,
            date: new Date(cMonth),
            tier2Label: mLabel,
            tier2Sub: `${cMonth.getFullYear()}`,
            width: 80,
            days: 30
          });

          cMonth.setMonth(cMonth.getMonth() + 1);
        }
        if (curYear !== '') tier1Groups.push({ label: curYear, colSpan: yCols });
      } 
      else if (this.scale === 'quarters') {
        let curYear = '';
        let yCols = 0;
        let tempQ = new Date(timelineStart);
        tempQ.setMonth(Math.floor(tempQ.getMonth() / 3) * 3, 1);

        while (tempQ <= timelineEnd) {
          const yLabel = `${tempQ.getFullYear()}`;
          const qNum = Math.floor(tempQ.getMonth() / 3) + 1;
          const qLabel = `Q${qNum}`;
          const key = `${tempQ.getFullYear()}-Q${qNum}`;

          if (yLabel !== curYear) {
            if (curYear !== '') {
              tier1Groups.push({ label: curYear, colSpan: yCols });
            }
            curYear = yLabel;
            yCols = 1;
          } else {
            yCols++;
          }

          periods.push({
            key: key,
            date: new Date(tempQ),
            tier2Label: qLabel,
            tier2Sub: yLabel,
            width: 100,
            days: 90
          });

          tempQ.setMonth(tempQ.getMonth() + 3);
        }
        if (curYear !== '') tier1Groups.push({ label: curYear, colSpan: yCols });
      }

      return { periods, tier1Groups };
    }

    /**
     * Compute task manpower and cumulative cost per date column
     */
    computeAggregations(periods) {
      // 1. Roll up child manpower & estimated manpower to parents
      let totalEstimatedHeadcount = 0;
      this.tasks.forEach((t, i) => {
        const isParent = this.hasChildTask(i);
        if (isParent) {
          const leaves = this.getLeafDescendants(i);
          let sumMp = 0;
          let sumEstMp = 0;
          leaves.forEach(lIdx => {
            sumMp += Number(this.tasks[lIdx].manpower) || 0;
            sumEstMp += Number(this.tasks[lIdx].estimatedManpower) || 0;
          });
          t.manpower = sumMp;
          t.estimatedManpower = sumEstMp;
        } else {
          totalEstimatedHeadcount += Number(t.estimatedManpower) || 0;
        }
      });

      // 2. Precompute active schedule presence for each task across periods
      const taskPeriodCosts = [];
      const scheduledTotals = new Array(periods.length).fill(0);
      const actualTotals = new Array(periods.length).fill(0);
      const periodicCosts = new Array(periods.length).fill(0);

      this.tasks.forEach((t, tIdx) => {
        const isParent = this.hasChildTask(tIdx);
        const rowCosts = [];
        const tStart = parseSafeDate(t.startDate);
        const tEnd = parseSafeDate(t.endDate);

        // Daily wage & OT rate calculation (+25%)
        const baseRate = parseFloat(t.ratePerDay) || 0;
        const otRate = baseRate * 1.25; // O.T. IS CALCULATED AS ADDITIONAL 25%
        const effectiveRate = t.hasOt ? otRate : baseRate;
        const mpCount = parseFloat(t.manpower) || 0;

        periods.forEach((p, pIdx) => {
          let pValScheduled = 0;
          let pValActual = 0;

          if (isParent) {
            // Parent rolls up child values
            const leaves = this.getLeafDescendants(tIdx);
            leaves.forEach(lIdx => {
              const lTask = this.tasks[lIdx];
              const lStart = parseSafeDate(lTask.startDate);
              const lEnd = parseSafeDate(lTask.endDate);
              const lRate = lTask.hasOt ? (lTask.ratePerDay * 1.25) : lTask.ratePerDay;
              const lMp = lTask.manpower || 0;

              if (lTask.periodScheduled && lTask.periodScheduled[p.key] !== undefined) {
                pValScheduled += parseFloat(lTask.periodScheduled[p.key]) || 0;
              } else if (p.date >= lStart && p.date <= lEnd) {
                pValScheduled += lMp;
              }

              if (lTask.periodActual && lTask.periodActual[p.key] !== undefined) {
                pValActual += parseFloat(lTask.periodActual[p.key]) || 0;
              }
            });
          } else {
            if (t.periodScheduled && t.periodScheduled[p.key] !== undefined) {
              pValScheduled = parseFloat(t.periodScheduled[p.key]) || 0;
            } else if (p.date >= tStart && p.date <= tEnd) {
              pValScheduled = mpCount;
            }

            if (t.periodActual && t.periodActual[p.key] !== undefined) {
              pValActual = parseFloat(t.periodActual[p.key]) || 0;
            }
          }

          // Compute periodic cost for this cell: Headcount * Rate/Day * Days
          const cellCost = pValScheduled * effectiveRate * (p.days || 1);
          rowCosts.push({
            scheduledMp: pValScheduled,
            actualMp: pValActual,
            cost: cellCost
          });

          // Accumulate bottom totals for leaf items only (to avoid double counting parents)
          if (!isParent) {
            scheduledTotals[pIdx] += pValScheduled;
            actualTotals[pIdx] += pValActual;
            periodicCosts[pIdx] += cellCost;
          }
        });

        taskPeriodCosts.push(rowCosts);
      });

      // 3. Compute running cumulative costs per date column
      const cumulativeCosts = [];
      let runningSum = 0;
      periodicCosts.forEach(c => {
        runningSum += c;
        cumulativeCosts.push(runningSum);
      });

      const totalLaborBudget = runningSum;

      // 4. Compute cumulative actual cost
      const cumulativeActualCosts = [];
      let runningActSum = 0;
      periods.forEach((p, pIdx) => {
        let periodActCost = 0;
        this.tasks.forEach((t, tIdx) => {
          if (!this.hasChildTask(tIdx)) {
            const actMp = taskPeriodCosts[tIdx][pIdx].actualMp;
            const baseRate = parseFloat(t.ratePerDay) || 0;
            const otH = parseFloat(t.otHours) || 0;
            const effectiveRate = baseRate + (baseRate * otH * 1.25 / 8);
            periodActCost += actMp * effectiveRate * (p.days || 1);
          }
        });
        runningActSum += periodActCost;
        cumulativeActualCosts.push(runningActSum);
      });

      return {
        taskPeriodCosts,
        scheduledTotals,
        actualTotals,
        periodicCosts,
        cumulativeCosts,
        cumulativeActualCosts,
        totalLaborBudget,
        totalEstimatedHeadcount
      };
    }

    
    getTaskLevel(task) {
      if (!task) return 4;
      const type = task.type || '';
      if (type === 'category') return 1;
      if (type === 'subcategory') return 2;
      if (type === 'subsubcategory') return 3;
      if (type === 'trade') return 4;
      return 3;
    }

    hasChildTask(index) {
      const cur = this.tasks[index];
      if (!cur || index >= this.tasks.length - 1) return false;
      const next = this.tasks[index + 1];
      const curLevel = this.getTaskLevel(cur);
      const nextLevel = this.getTaskLevel(next);
      return nextLevel > curLevel;
    }

    getParentIndex(index) {
      const cur = this.tasks[index];
      if (!cur) return -1;
      const curLevel = this.getTaskLevel(cur);
      for (let i = index - 1; i >= 0; i--) {
        const prev = this.tasks[i];
        if (this.getTaskLevel(prev) < curLevel) {
          return i;
        }
      }
      return -1;
    }

    isRowHidden(index) {
      let pIdx = this.getParentIndex(index);
      while (pIdx !== -1) {
        if (this.tasks[pIdx].isCollapsed) return true;
        pIdx = this.getParentIndex(pIdx);
      }
      return false;
    }

    toggleCollapse(index) {
      if (index < 0 || index >= this.tasks.length) return;
      this.tasks[index].isCollapsed = !this.tasks[index].isCollapsed;
      this.saveData();
      this.render();
    }

    addSkillTrade(taskIdx) {
      if (taskIdx < 0 || taskIdx >= this.tasks.length) return;
      const pTask = this.tasks[taskIdx];
      pTask.isCollapsed = false;

      const insertIdx = this.getSubtreeEndIndex(taskIdx);
      let childTradeCount = 0;
      for (let i = taskIdx + 1; i < insertIdx; i++) {
        if (this.tasks[i].type === 'trade') childTradeCount++;
      }

      const inferred = this.inferTradeFromText(pTask.description + ' ' + (pTask.specification || ''));
      const tradeObj = inferred || STANDARD_TRADES[3];

      const newTask = {
        id: `mp_trade_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        type: 'trade',
        code: `${pTask.code}.T${childTradeCount + 1}`,
        description: tradeObj.name,
        trade: tradeObj.name,
        estimatedManpower: Math.max(1, Math.round((pTask.estimatedManpower || 4) / 2)),
        manpower: Math.max(1, Math.round((pTask.manpower || 4) / 2)),
        ratePerDay: tradeObj.rate,
        otHours: 0,
        hasOt: false,
        startDate: pTask.startDate || '2026-03-01',
        endDate: pTask.endDate || '2026-03-31',
        duration: pTask.duration || 30,
        isCollapsed: false,
        periodScheduled: {},
        periodActual: {}
      };

      this.tasks.splice(insertIdx, 0, newTask);
      this.saveData();
      this.render();
    }

    updateTradeSkill(idx, newSkillName) {
      if (idx < 0 || idx >= this.tasks.length) return;
      const t = this.tasks[idx];
      const tr = STANDARD_TRADES.find(s => s.name === newSkillName);
      t.trade = newSkillName;
      t.description = newSkillName;
      if (tr) {
        t.ratePerDay = tr.rate;
      }
      this.saveData();
      this.render();
    }

    getLeafDescendants(index) {
      const leaves = [];
      const cur = this.tasks[index];
      if (!cur) return leaves;
      const curLevel = this.getTaskLevel(cur);

      for (let i = index + 1; i < this.tasks.length; i++) {
        const item = this.tasks[i];
        const itemLevel = this.getTaskLevel(item);
        if (itemLevel <= curLevel) break;
        if (!this.hasChildTask(i)) {
          leaves.push(i);
        }
      }
      return leaves;
    }


    getSubtreeEndIndex(parentIndex) {
      const pTask = this.tasks[parentIndex];
      if (!pTask) return parentIndex + 1;
      const pLevel = this.getTaskLevel(pTask);
      let endIdx = parentIndex + 1;
      while (endIdx < this.tasks.length) {
        const t = this.tasks[endIdx];
        const lvl = this.getTaskLevel(t);
        if (lvl <= pLevel) break;
        endIdx++;
      }
      return endIdx;
    }

    countDirectChildren(parentIndex, childType) {
      const pTask = this.tasks[parentIndex];
      if (!pTask) return 0;
      const pLevel = pTask.type === 'category' ? 1 : (pTask.type === 'subcategory' ? 2 : 3);
      let count = 0;
      for (let i = parentIndex + 1; i < this.tasks.length; i++) {
        const t = this.tasks[i];
        const lvl = t.type === 'category' ? 1 : (t.type === 'subcategory' ? 2 : 3);
        if (lvl <= pLevel) break;
        if (t.type === childType) count++;
      }
      return count;
    }

    /**
     * Main HTML Renderer
     */
    render() {
      const container = document.getElementById(this.containerId);
      if (!container) return;

      const { periods, tier1Groups } = this.computeTimelinePeriods();
      const aggregations = this.computeAggregations(periods);

      const totalScheduledHeadcount = aggregations.scheduledTotals.reduce((a, b) => a + b, 0);
      const totalActualHeadcount = aggregations.actualTotals.reduce((a, b) => a + b, 0);
      const totalBudget = aggregations.totalLaborBudget;
      const latestActualCost = aggregations.cumulativeActualCosts[aggregations.cumulativeActualCosts.length - 1] || 0;
      const varianceCost = totalBudget - latestActualCost;
      const varianceHeadcount = totalActualHeadcount - totalScheduledHeadcount;
      const utilizationRate = totalScheduledHeadcount > 0 ? ((totalActualHeadcount / totalScheduledHeadcount) * 100).toFixed(1) : '100.0';

      const availableMonths = this.getAvailableMonths();
      const isFilteredMonth = Boolean(this.monthFilter && this.monthFilter !== 'all');
      const filteredMonthObj = isFilteredMonth ? availableMonths.find(m => m.value === this.monthFilter) : null;
      const monthDisplayTitle = filteredMonthObj ? filteredMonthObj.label.replace('🗓️ ', '') : '';
      const displayPlannedCost = isFilteredMonth ? aggregations.periodicCosts.reduce((a, b) => a + b, 0) : totalBudget;
      const displayActualCost = isFilteredMonth ? (aggregations.cumulativeActualCosts[aggregations.cumulativeActualCosts.length - 1] || 0) : latestActualCost;
      const displayVarianceCost = displayPlannedCost - displayActualCost;

      const containerEl = document.getElementById(this.containerId);
      const availableRightPaneWidth = containerEl ? Math.max(700, containerEl.clientWidth - this.leftPaneWidth - 20) : 900;
      const rawTotalWidth = periods.reduce((sum, p) => sum + p.width, 0);
      const extraWidth = Math.max(0, availableRightPaneWidth - rawTotalWidth);
      if (extraWidth > 0 && periods.length > 0) {
        const extraPerCol = Math.floor(extraWidth / periods.length);
        periods.forEach(p => { p.width += extraPerCol; });
      }
      const totalTimelineWidth = periods.reduce((sum, p) => sum + p.width, 0);
      const totalTaskTableWidth = this.taskColumns.reduce((sum, c) => sum + c.width, 0);

      container.innerHTML = `
        <div class="mp-container">
          <!-- 1. Top Action Ribbon -->
          <div class="mp-ribbon">
            <div class="mp-ribbon-left">
              <span style="font-weight: 800; font-size: 13px; color: #1e3a8a; display: flex; align-items: center; gap: 6px;">
                👷 MANPOWER UTILIZATION
              </span>
              <button class="mp-btn mp-btn-primary" onclick="ManpowerUtilization.addTask('category')">➕ Add Category</button>
              <button class="mp-btn mp-btn-primary" style="background:#0284c7; border-color:#0284c7;" onclick="ManpowerUtilization.addTask('subcategory')">➕ Add Sub Task</button>
              <button class="mp-btn mp-btn-primary" style="background:#0369a1; border-color:#0369a1;" onclick="ManpowerUtilization.addTask('subsubcategory')">➕ Add Sub-Sub Task</button>
              <button class="mp-btn" onclick="ManpowerUtilization.adaptAndSyncWithGanttTimeline(true)" title="Auto-match timeline start/end dates and task scopes directly from Gantt Schedule">🔄 Sync with Gantt Schedule</button>
              <button class="mp-btn mp-btn-success" onclick="ManpowerUtilization.openLogActualModal()">📋 Log Actual Manpower</button>
            </div>
            
            <div class="mp-ribbon-right">
              <!-- Month Filter Dropdown Selection -->
              <span style="font-size: 11px; font-weight: 700; color: #1e40af;">Month View:</span>
              <div class="mp-btn-group" style="display: inline-flex; align-items: center; border: 1.5px solid #93c5fd; border-radius: 6px; padding: 1px 2px; background: #eff6ff;">
                <button class="mp-btn-tab" onclick="ManpowerUtilization.navigateMonth(-1)" title="Previous Month" style="padding: 0 6px; height: 24px; border: none; background: transparent; color: #1e40af; cursor: pointer; font-weight: 700;">◀</button>
                <select id="mpMonthFilter" class="mp-month-select" onchange="ManpowerUtilization.setMonthFilter(this.value)">
                  <option value="all" ${this.monthFilter === 'all' ? 'selected' : ''}>📅 All Months (Full Schedule)</option>
                  ${availableMonths.map(m => `
                    <option value="${m.value}" ${this.monthFilter === m.value ? 'selected' : ''}>${m.label}</option>
                  `).join('')}
                </select>
                <button class="mp-btn-tab" onclick="ManpowerUtilization.navigateMonth(1)" title="Next Month" style="padding: 0 6px; height: 24px; border: none; background: transparent; color: #1e40af; cursor: pointer; font-weight: 700;">▶</button>
              </div>

              <span style="font-size: 11px; font-weight: 700; color: #475569; margin-left: 4px;">Scale:</span>
              <div class="mp-btn-group">
                <button class="mp-btn-tab ${this.scale === 'days' ? 'active' : ''}" onclick="ManpowerUtilization.setScale('days')">Days</button>
                <button class="mp-btn-tab ${this.scale === 'weeks' ? 'active' : ''}" onclick="ManpowerUtilization.setScale('weeks')">Weeks</button>
                <button class="mp-btn-tab ${this.scale === 'months' ? 'active' : ''}" onclick="ManpowerUtilization.setScale('months')">Months</button>
                <button class="mp-btn-tab ${this.scale === 'quarters' ? 'active' : ''}" onclick="ManpowerUtilization.setScale('quarters')">Quarters</button>
              </div>

              <span style="font-size: 11px; font-weight: 700; color: #475569; margin-left: 4px;">View Mode:</span>
              <div class="mp-btn-group">
                <button class="mp-btn-tab ${this.viewMode === 'cumulative' ? 'active' : ''}" onclick="ManpowerUtilization.setViewMode('cumulative')" title="Show cumulative labor cost per date">Cumulative Cost (₱)</button>
                <button class="mp-btn-tab ${this.viewMode === 'period' ? 'active' : ''}" onclick="ManpowerUtilization.setViewMode('period')" title="Show period labor cost">Period Cost (₱)</button>
                <button class="mp-btn-tab ${this.viewMode === 'headcount' ? 'active' : ''}" onclick="ManpowerUtilization.setViewMode('headcount')" title="Show number of workers">Headcount (Workers)</button>
              </div>

              <button class="mp-btn" onclick="ManpowerUtilization.toggleChart()" title="Toggle Visual Analytics Chart">📊 ${this.chartVisible ? 'Hide Chart' : 'Show Chart'}</button>
              <button class="mp-btn mp-btn-success" onclick="ManpowerUtilization.exportToExcel()" title="Export complete Excel worksheet">📥 Export to Excel</button>
              <button class="mp-btn mp-btn-primary" onclick="ManpowerUtilization.saveData()" title="Save changes and sync with Cloud Firestore">💾 Save &amp; Sync</button>
            </div>
          </div>

          <!-- 2. KPI Executive Ribbon -->
          <div class="mp-kpi-ribbon">
            <div class="mp-kpi-card" style="border-left: 3px solid #64748b;">
              <span class="mp-kpi-title">Estimated Manpower</span>
              <div class="mp-kpi-value" style="color: #334155;">${aggregations.totalEstimatedHeadcount} <span style="font-size:12px; font-weight:600;">Workers</span></div>
              <span class="mp-kpi-sub">Total BOQ Planned Force</span>
            </div>
            <div class="mp-kpi-card" style="border-left: 3px solid #2563eb;">
              <span class="mp-kpi-title">Scheduled Manpower</span>
              <div class="mp-kpi-value" style="color: #1d4ed8;">${totalScheduledHeadcount} <span style="font-size:12px; font-weight:600;">Workers</span></div>
              <span class="mp-kpi-sub">Total Crew Force Planned</span>
            </div>
            <div class="mp-kpi-card" style="border-left: 3px solid #059669;">
              <span class="mp-kpi-title">Actual Manpower</span>
              <div class="mp-kpi-value" style="color: #047857;">${totalActualHeadcount} <span style="font-size:12px; font-weight:600;">Workers</span></div>
              <span class="mp-kpi-sub">Deployed On-Site</span>
            </div>
            <div class="mp-kpi-card" style="border-left: 3px solid ${varianceHeadcount >= 0 ? '#059669' : '#dc2626'};">
              <span class="mp-kpi-title">Force Variance</span>
              <div class="mp-kpi-value" style="color: ${varianceHeadcount >= 0 ? '#059669' : '#dc2626'};">
                ${varianceHeadcount >= 0 ? '+' : ''}${varianceHeadcount} <span style="font-size:12px; font-weight:600;">(${utilizationRate}%)</span>
              </div>
              <span class="mp-kpi-sub">Actual vs. Scheduled</span>
            </div>
            <div class="mp-kpi-card" style="border-left: 3px solid #0284c7;">
              <span class="mp-kpi-title">${isFilteredMonth ? 'Month Planned Budget' : 'Planned Labor Cost'}</span>
              <div class="mp-kpi-value" style="color: #0369a1;">₱ ${formatNumber(displayPlannedCost, 0)}</div>
              <span class="mp-kpi-sub">${isFilteredMonth ? monthDisplayTitle : 'Scheduled Baseline Budget'}</span>
            </div>
            <div class="mp-kpi-card" style="border-left: 3px solid #7c3aed;">
              <span class="mp-kpi-title">${isFilteredMonth ? 'Month Actual Incurred' : 'Actual Labor Cost'}</span>
              <div class="mp-kpi-value" style="color: #6d28d9;">₱ ${formatNumber(displayActualCost, 0)}</div>
              <span class="mp-kpi-sub">${isFilteredMonth ? monthDisplayTitle : 'Cumulative Cost Incurred'}</span>
            </div>
            <div class="mp-kpi-card" style="border-left: 3px solid ${displayVarianceCost >= 0 ? '#059669' : '#dc2626'};">
              <span class="mp-kpi-title">${isFilteredMonth ? 'Month Cost Variance' : 'Cost Deviation'}</span>
              <div class="mp-kpi-value" style="color: ${displayVarianceCost >= 0 ? '#059669' : '#dc2626'};">
                ${displayVarianceCost >= 0 ? '+' : ''}₱ ${formatNumber(displayVarianceCost, 0)}
              </div>
              <span class="mp-kpi-sub">${displayVarianceCost >= 0 ? 'Under Budget' : 'Cost Overrun'}</span>
            </div>
          </div>

          <!-- 3. Dynamic Interactive Comparison Chart (Scheduled vs. Actual & Cumulative S-Curve) -->
          ${this.chartVisible ? this.renderAnalyticsChart(periods, aggregations) : ''}

          <!-- 4. Split-Pane: Task Table (Left) + Splitter + Timeline Table with Two Tiers (Right) -->
          <div class="mp-split-wrap" id="mpSplitWrap">
            <!-- Left Task Table with Adjustable Column Widths (Drag Left/Right) -->
            <div class="mp-left-pane" id="mpLeftPane" style="width: ${this.leftPaneWidth}px;">
              <table class="mp-table mp-table-left" id="mpTaskTable" style="width: ${totalTaskTableWidth}px; table-layout: fixed;">
                <colgroup id="mpTaskTableColGroup">
                  ${this.taskColumns.map(c => `<col data-col-id="${c.id}" style="width: ${c.width}px;">`).join('')}
                </colgroup>
                <thead id="mpTaskTableHead">
                  <tr>
                    ${this.taskColumns.map((col, cIdx) => `
                      <th class="mp-th ${col.align === 'left' ? 'mp-th-left' : col.align === 'right' ? 'mp-th-right' : ''}" 
                          data-col-id="${col.id}" 
                          data-col-idx="${cIdx}"
                          style="width: ${col.width}px; min-width: ${col.width}px; max-width: ${col.width}px; position: relative;"
                          title="${escapeHtml(col.title || col.name)}">
                        <span class="mp-th-text" style="display: block; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(col.name)}</span>
                        <div class="mp-col-resizer" title="Drag left or right to resize column"></div>
                      </th>
                    `).join('')}
                  </tr>
                </thead>
                <tbody id="mpTaskTableBody">
                  ${this.renderTaskTableRows(aggregations)}
                </tbody>
                <tfoot>
                  <tr class="mp-summary-row">
                    <td class="mp-td" colspan="3" style="text-align: right; padding-right: 8px; font-weight: 800;">ESTIMATED / SCHEDULED FORCE:</td>
                    <td class="mp-td" style="text-align: center; font-weight: 800; color: #334155;" title="Total Estimated Force">${aggregations.totalEstimatedHeadcount}</td>
                    <td class="mp-td" style="text-align: center; font-weight: 800; color: #1d4ed8;" title="Total Scheduled Force">${totalScheduledHeadcount}</td>
                    <td class="mp-td" colspan="2" style="text-align: right; padding-right: 8px; font-weight: 800;">DAILY LABOR RUN RATE:</td>
                    <td class="mp-td" colspan="2" style="text-align: right; padding-right: 6px; font-weight: 800; color: #1d4ed8;">
                      ₱ ${formatNumber(this.calculateDailyTotalSum(), 0)}
                    </td>
                    <td class="mp-td"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Resizable Splitter Divider -->
            <div class="mp-splitter" id="mpSplitter" title="Drag horizontally to resize Task Table and Timeline panels">
              <div class="mp-splitter-handle"></div>
            </div>

            <!-- Right Timeline Grid Table with Two-Tier Headers -->
            <div class="mp-right-pane" id="mpRightPane">
              <div style="width: ${totalTimelineWidth}px;">
                <!-- Two-Tier Header -->
                <div class="mp-tl-header">
                  <!-- Tier 1: Month or Quarter -->
                  <div class="mp-tl-tier1-row">
                    ${tier1Groups.map(g => {
                      let gWidth = 0;
                      let idx = 0;
                      for (let i = 0; i < tier1Groups.length; i++) {
                        if (tier1Groups[i] === g) {
                          for (let c = 0; c < g.colSpan; c++) {
                            if (periods[idx + c]) gWidth += periods[idx + c].width;
                          }
                          break;
                        }
                        idx += tier1Groups[i].colSpan;
                      }
                      return `<div class="mp-tl-tier1-cell" style="width: ${gWidth}px;">${escapeHtml(g.label)}</div>`;
                    }).join('')}
                  </div>

                  <!-- Tier 2: Week or Day -->
                  <div class="mp-tl-tier2-row">
                    ${periods.map(p => {
                      const isToday = p.key === this.currentDate;
                      return `
                        <div class="mp-tl-tier2-cell ${isToday ? 'today' : ''}" style="width: ${p.width}px;" title="${escapeHtml(p.key)}">
                          <div>${escapeHtml(p.tier2Label)}</div>
                          <div style="font-size: 8px; opacity: 0.75;">${escapeHtml(p.tier2Sub)}</div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>

                <!-- Timeline Body Grid -->
                <div class="mp-tl-body">
                  ${this.renderTimelineBodyRows(periods, aggregations)}
                </div>

                <!-- Cumulative Cost per Date & Bottom Totals Table -->
                <div style="background: #f8fafc; border-top: 2px solid #cbd5e1; position: sticky; bottom: 0; z-index: 10;">
                  <!-- Row 1: Scheduled Manpower Force -->
                  <div class="mp-tl-row mp-summary-row" style="height: 28px;">
                    ${periods.map((p, idx) => `
                      <div class="mp-tl-col-cell" style="width: ${p.width}px; font-weight: 700; color: #1e40af;">
                        ${aggregations.scheduledTotals[idx]}
                      </div>
                    `).join('')}
                  </div>

                  <!-- Row 2: Actual Manpower Force -->
                  <div class="mp-tl-row mp-summary-row" style="height: 28px; background: #f0fdf4;">
                    ${periods.map((p, idx) => `
                      <div class="mp-tl-col-cell" style="width: ${p.width}px; font-weight: 700; color: #15803d;">
                        ${aggregations.actualTotals[idx]}
                      </div>
                    `).join('')}
                  </div>

                  <!-- Row 3: Periodic Cost (₱) -->
                  <div class="mp-tl-row mp-summary-row" style="height: 28px;">
                    ${periods.map((p, idx) => `
                      <div class="mp-tl-col-cell" style="width: ${p.width}px; font-weight: 700; color: #334155; font-size: 9.5px;">
                        ₱${formatNumber(aggregations.periodicCosts[idx], 0)}
                      </div>
                    `).join('')}
                  </div>

                  <!-- Row 4: CUMULATIVE COST PER DATE (₱) -->
                  <div class="mp-tl-row mp-cumul-cost-row" style="height: 32px;">
                    ${periods.map((p, idx) => `
                      <div class="mp-tl-col-cell" style="width: ${p.width}px;" title="Cumulative Cost up to ${p.key}">
                        <span class="mp-cumul-cell-val">₱${formatNumber(aggregations.cumulativeCosts[idx], 0)}</span>
                      </div>
                    `).join('')}
                  </div>

                  <!-- Row 5: Cumulative Planned % -->
                  <div class="mp-tl-row mp-summary-row" style="height: 24px; font-size: 9px; color: #0284c7;">
                    ${periods.map((p, idx) => {
                      const pct = totalBudget > 0 ? ((aggregations.cumulativeCosts[idx] / totalBudget) * 100).toFixed(1) : 0;
                      return `
                        <div class="mp-tl-col-cell" style="width: ${p.width}px; font-weight: 700;">
                          ${pct}%
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right-Click Task Context Menu for Task Breakdown -->
        <div id="mpContextMenu" class="mp-context-menu" style="display: none;"></div>

        <!-- Log Daily Actual Manpower Modal -->
        <div class="mp-modal-overlay" id="mpLogActualModal">
          <div class="mp-modal-box">
            <div class="mp-modal-header">
              <span style="font-weight: 700; font-size: 13px;">📋 Daily Force Account &amp; Actual Manpower Log</span>
              <button type="button" onclick="ManpowerUtilization.closeLogActualModal()" style="background:none; border:none; color:white; font-size:18px; cursor:pointer;">&times;</button>
            </div>
            <div class="mp-modal-body" id="mpLogModalContent">
              <!-- Populated dynamically -->
            </div>
            <div class="mp-modal-footer">
              <button class="mp-btn" type="button" onclick="ManpowerUtilization.closeLogActualModal()">Cancel</button>
              <button class="mp-btn mp-btn-success" type="button" onclick="ManpowerUtilization.saveLoggedActual()">💾 Save Actual Manpower</button>
            </div>
          </div>
        </div>
      `;

      // Setup Column Resizing
      this.initColumnResizing();

      // Setup Context Menu
      this.initContextMenu();

      // Setup splitter drag
      this.initSplitter();
      this.syncVerticalScroll();
    }

    /**
     * Render Left Task Table Rows with Estimated Manpower and Fillable Cells
     */
    renderTaskTableRows(aggregations) {
      return this.tasks.map((t, idx) => {
        const isCat = t.type === 'category';
        const isSub = t.type === 'subcategory';
        const isSubSub = t.type === 'subsubcategory';
        const isTrade = t.type === 'trade';
        const isParent = this.hasChildTask(idx);
        const isHidden = this.isRowHidden(idx);

        const rowClass = isCat ? 'mp-row-cat' : (isSub ? 'mp-row-sub' : (isTrade ? 'mp-row-trade' : 'mp-row-subsub'));
        const indentClass = isCat ? 'mp-desc-indent-0' : (isSub ? 'mp-desc-indent-1' : (isSubSub ? 'mp-desc-indent-2' : 'mp-desc-indent-3'));
        const badgeLabel = isCat ? 'CAT' : (isSub ? 'SUB' : (isTrade ? 'TRADE' : 'ITEM'));
        const badgeClass = isCat ? 'cat' : (isSub ? 'sub' : (isTrade ? 'trade' : 'subsub'));

        let displayEstMp = parseFloat(t.estimatedManpower) || 0;
        let displayMp = parseFloat(t.manpower) || 0;
        let displayDailyTotal = 0;

        if (isParent) {
          const leaves = this.getLeafDescendants(idx);
          displayEstMp = leaves.reduce((sum, lIdx) => sum + (parseFloat(this.tasks[lIdx].estimatedManpower) || 0), 0);
          displayMp = leaves.reduce((sum, lIdx) => sum + (parseFloat(this.tasks[lIdx].manpower) || 0), 0);
          displayDailyTotal = leaves.reduce((sum, lIdx) => {
            const lt = this.tasks[lIdx];
            const lRate = parseFloat(lt.ratePerDay) || 0;
            const lOtH = parseFloat(lt.otHours) || 0;
            const lOtPay = lRate * lOtH * 1.25 / 8;
            const lMp = parseFloat(lt.manpower) || 0;
            return sum + ((lRate + lOtPay) * lMp);
          }, 0);
        } else {
          const baseRate = parseFloat(t.ratePerDay) || 0;
          const otH = parseFloat(t.otHours) || 0;
          const otPayPerWorker = baseRate * otH * 1.25 / 8;
          displayDailyTotal = (baseRate + otPayPerWorker) * displayMp;
        }

        const baseRate = parseFloat(t.ratePerDay) || 0;
        const otHours = parseFloat(t.otHours) || 0;
        const otCostPerWorker = baseRate * otHours * 1.25 / 8;

        return `
          <tr class="mp-row ${rowClass}" data-task-idx="${idx}" style="${isHidden ? 'display: none;' : ''}">
            <!-- # -->
            <td class="mp-td mp-cell-center" style="font-weight: 700; color: #64748b;">
              ${idx + 1}
            </td>

            <!-- Item Code -->
            <td class="mp-td">
              <input type="text" class="mp-cell-input mp-cell-center" 
                value="${escapeHtml(t.code)}" 
                onchange="ManpowerUtilization.updateTaskField(${idx}, 'code', this.value)" 
                style="${isCat ? 'font-weight: 800; color: #1e40af;' : (isTrade ? 'font-size: 10px; color: #0284c7;' : '')}">
            </td>

            <!-- Work Description (with Collapse Toggle & Trade Dropdown) -->
            <td class="mp-td">
              <div class="mp-cell-desc ${indentClass}">
                ${isParent ? `
                  <button type="button" class="mp-collapse-toggle-btn" 
                    onclick="event.stopPropagation(); ManpowerUtilization.toggleCollapse(${idx})" 
                    title="${t.isCollapsed ? 'Click to Expand Branch' : 'Click to Collapse Branch'}">
                    ${t.isCollapsed ? '▶' : '▼'}
                  </button>
                ` : `
                  <span class="mp-collapse-placeholder"></span>
                `}
                <span class="mp-tree-badge ${badgeClass}">${badgeLabel}</span>

                ${isTrade ? `
                  <!-- Trade Dropdown Selection -->
                  <select class="mp-cell-input mp-trade-select" 
                    onchange="ManpowerUtilization.updateTradeSkill(${idx}, this.value)" 
                    style="font-weight: 700; color: #0f172a; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 2px 4px;">
                    ${STANDARD_TRADES.map(tr => `
                      <option value="${tr.name}" ${tr.name === t.trade ? 'selected' : ''}>${tr.name} (₱${tr.rate}/day)</option>
                    `).join('')}
                  </select>
                ` : `
                  <input type="text" class="mp-cell-input" 
                    value="${escapeHtml(t.description)}" 
                    title="${escapeHtml(t.description + (t.specification ? ' (' + t.specification + ')' : ''))}"
                    onchange="ManpowerUtilization.updateTaskField(${idx}, 'description', this.value)" 
                    style="${isCat ? 'font-weight: 700;' : ''}">
                `}
              </div>
            </td>

            <!-- Estimated Manpower -->
            <td class="mp-td">
              <input type="number" min="0" class="mp-cell-input mp-cell-center" 
                value="${displayEstMp}" 
                ${isParent ? 'readonly title="Aggregated estimated force from child tasks"' : ''}
                onchange="ManpowerUtilization.updateTaskField(${idx}, 'estimatedManpower', this.value)" 
                style="font-weight: 700; color: #334155;">
            </td>

            <!-- No. of Manpower -->
            <td class="mp-td">
              <input type="number" min="0" class="mp-cell-input mp-cell-center" 
                value="${displayMp}" 
                ${isParent ? 'readonly title="Aggregated active force from child tasks"' : ''}
                onchange="ManpowerUtilization.updateTaskField(${idx}, 'manpower', this.value)" 
                style="font-weight: 700; color: #1d4ed8;">
            </td>

            <!-- Rate / Day (Blank if Task Has Children) -->
            <td class="mp-td">
              ${isParent ? `
                <div class="mp-cell-center" style="color: #94a3b8; font-weight: 700;">-</div>
              ` : `
                <input type="number" min="0" step="50" class="mp-cell-input mp-cell-right" 
                  value="${baseRate}" 
                  onchange="ManpowerUtilization.updateTaskField(${idx}, 'ratePerDay', this.value)">
              `}
            </td>

            <!-- O.T. Hour (Fillable, Blank if Task Has Children) -->
            <td class="mp-td">
              ${isParent ? `
                <div class="mp-cell-center" style="color: #94a3b8; font-weight: 700;">-</div>
              ` : `
                <input type="number" min="0" step="0.5" class="mp-cell-input mp-cell-center" 
                  value="${otHours}" 
                  title="Overtime hours worked per day (Fillable)"
                  onchange="ManpowerUtilization.updateTaskField(${idx}, 'otHours', this.value)" 
                  style="font-weight: 700; color: #b45309; background: #fffbeb;">
              `}
            </td>

            <!-- O.T. Amount = Rate/Day * O.T. Hour * 1.25 / 8 (Blank if Task Has Children) -->
            <td class="mp-td mp-cell-right" style="padding-right: 6px;">
              ${isParent ? `
                <div class="mp-cell-center" style="color: #94a3b8; font-weight: 700;">-</div>
              ` : `
                <span style="font-weight: 700; color: #b45309; font-size: 10.5px;" 
                  title="Formula: ₱${baseRate} × ${otHours}h × 1.25 / 8 = ₱${formatNumber(otCostPerWorker, 2)} per worker">
                  ${otCostPerWorker > 0 ? `₱${formatNumber(otCostPerWorker, 0)}` : '₱0'}
                </span>
              `}
            </td>

            <!-- Daily Total (Rolled up for Parent, Calculated for Leaf) -->
            <td class="mp-td mp-cell-right" style="font-weight: 700; color: #0f172a; padding-right: 6px;">
              ₱${formatNumber(displayDailyTotal, 0)}
            </td>

            <!-- Actions -->
            <td class="mp-td">
              <div class="mp-action-btn-group">
                ${isCat ? `
                  <button type="button" class="mp-act-btn" onclick="ManpowerUtilization.breakdownTask(${idx}, 'subcategory')" title="Add Sub Task under this Category">+</button>
                ` : isSub ? `
                  <button type="button" class="mp-act-btn" onclick="ManpowerUtilization.breakdownTask(${idx}, 'subsubcategory')" title="Add Sub-Sub Task">+</button>
                ` : `
                  <button type="button" class="mp-act-btn" onclick="ManpowerUtilization.addSkillTrade(${idx})" title="Add Skill/Trade under this Task">👷</button>
                `}
                <button type="button" class="mp-act-btn danger" onclick="ManpowerUtilization.deleteTask(${idx})" title="Delete Task">&times;</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    /**
     * Render Timeline Body Rows
     */
    renderTimelineBodyRows(periods, aggregations) {
      return this.tasks.map((t, tIdx) => {
        const isCat = t.type === 'category';
        const isSub = t.type === 'subcategory';
        const isTrade = t.type === 'trade';
        const isParent = this.hasChildTask(tIdx);
        const isHidden = this.isRowHidden(tIdx);
        const rowCosts = aggregations.taskPeriodCosts[tIdx];

        return `
          <div class="mp-tl-row ${isCat ? 'mp-row-cat' : (isSub ? 'mp-row-sub' : (isTrade ? 'mp-row-trade' : 'mp-row-subsub'))}" 
            data-task-idx="${tIdx}" style="${isHidden ? 'display: none;' : ''}">
            ${periods.map((p, pIdx) => {
              const cellData = rowCosts[pIdx];
              let displayVal = '';

              if (this.viewMode === 'cumulative') {
                let cum = 0;
                for (let k = 0; k <= pIdx; k++) cum += rowCosts[k].cost;
                displayVal = cum > 0 ? `₱${formatNumber(cum, 0)}` : '';
              } else if (this.viewMode === 'period') {
                displayVal = cellData.cost > 0 ? `₱${formatNumber(cellData.cost, 0)}` : '';
              } else {
                displayVal = cellData.scheduledMp > 0 ? `${cellData.scheduledMp}` : '';
              }

              const hasActual = cellData.actualMp > 0;

              return `
                <div class="mp-tl-col-cell ${hasActual ? 'has-actual' : ''}" style="width: ${p.width}px;" 
                  title="${escapeHtml(t.description)} | Period ${p.key}: ${displayVal}">
                  ${isParent ? `
                    <span style="font-weight: 700; color: #1e40af; font-size: 10px;">${displayVal}</span>
                  ` : `
                    <input type="text" class="mp-cell-input mp-cell-center" 
                      value="${displayVal}" 
                      placeholder="-" 
                      onchange="ManpowerUtilization.updatePeriodDirectInput(${tIdx}, '${p.key}', this.value)" 
                      style="${hasActual ? 'color: #059669; font-weight: 700;' : ''}">
                  `}
                </div>
              `;
            }).join('')}
          </div>
        `;
      }).join('');
    }

    /**
     * Render Dynamic Interactive Comparison Chart (Scheduled vs. Actual Manpower & Cumulative S-Curve)
     */
    renderAnalyticsChart(periods, aggregations) {
      const maxScheduled = Math.max(...aggregations.scheduledTotals, 1);
      const maxActual = Math.max(...aggregations.actualTotals, 1);
      const maxHeadcount = Math.max(maxScheduled, maxActual, 10);
      const maxCost = Math.max(...aggregations.cumulativeCosts, 100000);

      const svgW = Math.max(periods.length * 40, 700);
      const svgH = 140;
      const padTop = 15;
      const padBottom = 25;
      const chartH = svgH - padTop - padBottom;
      const barSlotW = svgW / periods.length;
      const barW = Math.max(4, (barSlotW - 8) / 2);

      let barsHtml = '';
      let sCurvePoints = [];
      let actualSCurvePoints = [];

      periods.forEach((p, i) => {
        const schedVal = aggregations.scheduledTotals[i];
        const actVal = aggregations.actualTotals[i];

        const schedH = (schedVal / maxHeadcount) * chartH;
        const actH = (actVal / maxHeadcount) * chartH;

        const xCenter = i * barSlotW + barSlotW / 2;
        const xSched = xCenter - barW - 1;
        const xAct = xCenter + 1;

        const ySched = padTop + (chartH - schedH);
        const yAct = padTop + (chartH - actH);

        const dateKey = p.key;
        const cumCost = aggregations.cumulativeCosts[i];
        const periodCost = aggregations.periodicCosts[i];

        barsHtml += `
          <!-- Scheduled Bar -->
          <rect x="${xSched}" y="${ySched}" width="${barW}" height="${schedH}" rx="2" fill="#3b82f6" opacity="0.85"
            data-date="${dateKey}" data-sched="${schedVal}" data-act="${actVal}" data-cost="${periodCost}" data-cum="${cumCost}"
            onmouseover="ManpowerUtilization.showChartTooltip(event, this)" onmouseout="ManpowerUtilization.hideChartTooltip()" style="cursor: pointer;"/>
          
          <!-- Actual Bar -->
          <rect x="${xAct}" y="${yAct}" width="${barW}" height="${actH}" rx="2" fill="#10b981" opacity="0.9"
            data-date="${dateKey}" data-sched="${schedVal}" data-act="${actVal}" data-cost="${periodCost}" data-cum="${cumCost}"
            onmouseover="ManpowerUtilization.showChartTooltip(event, this)" onmouseout="ManpowerUtilization.hideChartTooltip()" style="cursor: pointer;"/>
        `;

        // Planned S-Curve point
        const cumPlanned = aggregations.cumulativeCosts[i];
        const ySCurve = padTop + chartH - (cumPlanned / maxCost) * chartH;
        sCurvePoints.push(`${xCenter},${ySCurve}`);

        // Actual S-Curve point
        const cumAct = aggregations.cumulativeActualCosts[i];
        const yActSCurve = padTop + chartH - (cumAct / maxCost) * chartH;
        actualSCurvePoints.push(`${xCenter},${yActSCurve}`);
      });

      const sCurvePathD = `M ${sCurvePoints.join(' L ')}`;
      const actSCurvePathD = `M ${actualSCurvePoints.join(' L ')}`;

      return `
        <div class="mp-chart-container" id="mpAnalyticsChart">
          <div class="mp-chart-header">
            <div class="mp-chart-title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" stroke-width="2.5"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
              <span>DYNAMIC INTERACTION: MANPOWER SCHEDULE VS. ACTUAL MANPOWER FORCE</span>
            </div>
            <div class="mp-chart-legend">
              <span style="display:flex; align-items:center; gap:4px;">
                <span class="mp-legend-dot" style="background:#3b82f6;"></span> Scheduled Force (Headcount)
              </span>
              <span style="display:flex; align-items:center; gap:4px;">
                <span class="mp-legend-dot" style="background:#10b981;"></span> Actual Force Deployed
              </span>
              <span style="display:flex; align-items:center; gap:4px;">
                <span style="width:14px; height:2px; background:#d97706; display:inline-block;"></span> Cumulative Planned Cost
              </span>
              <span style="display:flex; align-items:center; gap:4px;">
                <span style="width:14px; height:2px; background:#7c3aed; display:inline-block;"></span> Cumulative Actual Cost
              </span>
            </div>
          </div>

          <div class="mp-chart-svg-wrap" style="overflow-x: auto;">
            <svg class="mp-chart-svg" viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="none">
              <!-- Grid baseline -->
              <line x1="0" y1="${padTop + chartH}" x2="${svgW}" y2="${padTop + chartH}" stroke="#e2e8f0" stroke-width="1"/>
              <line x1="0" y1="${padTop + chartH / 2}" x2="${svgW}" y2="${padTop + chartH / 2}" stroke="#f1f5f9" stroke-dasharray="3,3" stroke-width="1"/>
              
              <!-- Bars -->
              ${barsHtml}

              <!-- Cumulative Planned S-Curve -->
              <path d="${sCurvePathD}" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>

              <!-- Cumulative Actual S-Curve -->
              <path d="${actSCurvePathD}" fill="none" stroke="#7c3aed" stroke-width="2" stroke-dasharray="4,3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>

            <!-- Floating interactive Tooltip -->
            <div class="mp-chart-tooltip" id="mpChartTooltip"></div>
          </div>
        </div>
      `;
    }

    calculateDailyTotalSum() {
      let sum = 0;
      this.tasks.forEach((t, i) => {
        if (!this.hasChildTask(i)) {
          const base = parseFloat(t.ratePerDay) || 0;
          const otH = parseFloat(t.otHours) || 0;
          const otPayPerWorker = (base * otH * 1.25 / 8);
          const mp = parseFloat(t.manpower) || 0;
          sum += (base + otPayPerWorker) * mp;
        }
      });
      return sum;
    }

    showChartTooltip(e, el) {
      const tooltip = document.getElementById('mpChartTooltip');
      if (!tooltip) return;

      const date = el.getAttribute('data-date');
      const sched = el.getAttribute('data-sched');
      const act = el.getAttribute('data-act');
      const cost = formatNumber(el.getAttribute('data-cost'), 0);
      const cum = formatNumber(el.getAttribute('data-cum'), 0);
      const diff = parseInt(act, 10) - parseInt(sched, 10);

      tooltip.innerHTML = `
        <div style="font-weight: 800; color: #93c5fd; border-bottom: 1px solid #334155; padding-bottom: 3px; margin-bottom: 4px;">
          📅 Date Period: ${date}
        </div>
        <div style="display:flex; justify-content:space-between; gap:12px;">
          <span>Scheduled Force:</span> <strong>${sched} Workers</strong>
        </div>
        <div style="display:flex; justify-content:space-between; gap:12px;">
          <span>Actual Deployed:</span> <strong style="color: #34d399;">${act} Workers</strong>
        </div>
        <div style="display:flex; justify-content:space-between; gap:12px;">
          <span>Variance Slippage:</span> <strong style="color: ${diff >= 0 ? '#34d399' : '#f87171'};">${diff >= 0 ? '+' : ''}${diff} Workers</strong>
        </div>
        <div style="display:flex; justify-content:space-between; gap:12px; margin-top: 4px; border-top: 1px solid #334155; padding-top: 3px;">
          <span>Period Labor Cost:</span> <strong>₱ ${cost}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; gap:12px;">
          <span>Cumulative Cost:</span> <strong style="color: #fbbf24;">₱ ${cum}</strong>
        </div>
      `;

      const rect = el.getBoundingClientRect();
      const parentRect = tooltip.parentElement.getBoundingClientRect();

      tooltip.style.left = `${Math.min(parentRect.width - 180, Math.max(10, rect.left - parentRect.left - 40))}px`;
      tooltip.style.top = `10px`;
      tooltip.style.display = 'block';
    }

    hideChartTooltip() {
      const tooltip = document.getElementById('mpChartTooltip');
      if (tooltip) tooltip.style.display = 'none';
    }

    /**
     * Column Width Dragging Engine (Matches Gantt Task Schedule exactly)
     */
    initColumnResizing() {
      const tableHead = document.getElementById('mpTaskTableHead');
      if (!tableHead || tableHead.dataset.resizeListenersAttached) return;
      tableHead.dataset.resizeListenersAttached = 'true';

      tableHead.addEventListener('mousedown', (e) => {
        const resizer = e.target.closest('.mp-col-resizer');
        if (!resizer) return;
        e.preventDefault();
        e.stopPropagation();

        const th = resizer.closest('th');
        const colId = th ? th.dataset.colId : null;
        if (!colId) return;

        const col = this.taskColumns.find(c => c.id === colId);
        if (!col) return;

        const colIdx = parseInt(th.dataset.colIdx, 10);
        const startX = e.clientX;
        const startWidth = col.width;
        const table = document.getElementById('mpTaskTable');
        const colGroup = document.getElementById('mpTaskTableColGroup');

        resizer.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (moveEvent) => {
          const deltaX = moveEvent.clientX - startX;
          const newWidth = Math.max(col.minWidth || 30, startWidth + deltaX);
          col.width = newWidth;

          th.style.width = newWidth + 'px';
          th.style.minWidth = newWidth + 'px';
          th.style.maxWidth = newWidth + 'px';

          if (colGroup && colGroup.children[colIdx]) {
            colGroup.children[colIdx].style.width = newWidth + 'px';
          }

          const totalW = this.taskColumns.reduce((sum, c) => sum + c.width, 0);
          if (table) table.style.width = totalW + 'px';
        };

        const onMouseUp = () => {
          resizer.classList.remove('resizing');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          this.saveColumnWidths();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    }

    /**
     * Right-Click Context Menu Engine for Task Breakdown
     */
    initContextMenu() {
      const tableBody = document.getElementById('mpTaskTableBody');
      if (!tableBody || tableBody.dataset.contextListenersAttached) return;
      tableBody.dataset.contextListenersAttached = 'true';

      tableBody.addEventListener('contextmenu', (e) => {
        const tr = e.target.closest('tr.mp-row');
        if (!tr) return;
        e.preventDefault();
        e.stopPropagation();
        const taskIdx = parseInt(tr.dataset.taskIdx, 10);
        if (!isNaN(taskIdx)) {
          this.showTaskContextMenu(e.clientX, e.clientY, taskIdx);
        }
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('#mpContextMenu')) {
          this.hideContextMenu();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.hideContextMenu();
        }
      });
    }

    showTaskContextMenu(clientX, clientY, taskIdx) {
      const menu = document.getElementById('mpContextMenu');
      if (!menu) return;
      const t = this.tasks[taskIdx];
      if (!t) return;

      const isCat = t.type === 'category';
      const isSub = t.type === 'subcategory';
      const typeLabel = isCat ? 'CATEGORY' : (isSub ? 'SUB TASK' : 'SUB-SUB TASK');

      menu.innerHTML = `
        <div class="mp-context-menu-header">
          ${typeLabel}: ${escapeHtml(t.code)}
        </div>
        <div class="mp-context-menu-item" onclick="ManpowerUtilization.contextMenuAction('addSub', ${taskIdx})">
          <span>➕</span> <strong>Add Sub Task</strong>
          <span style="margin-left:auto; font-size:10px; color:#94a3b8;">(Subcategory)</span>
        </div>
        <div class="mp-context-menu-item" onclick="ManpowerUtilization.contextMenuAction('addSubSub', ${taskIdx})">
          <span>➕</span> <strong>Add Sub-Sub Task</strong>
          <span style="margin-left:auto; font-size:10px; color:#94a3b8;">(Sub-Item)</span>
        </div>
        <div class="mp-context-menu-item" onclick="ManpowerUtilization.contextMenuAction('addSkillTrade', ${taskIdx})" style="background:#f0fdf4; color:#166534; font-weight:700;">
          <span>👷</span> <strong>Add Skill / Trade</strong>
          <span style="margin-left:auto; font-size:10px; color:#15803d;">(Trade Crew)</span>
        </div>
        <div class="mp-context-menu-item" onclick="ManpowerUtilization.contextMenuAction('addSibling', ${taskIdx})">
          <span>⬇️</span> Add Task Below
        </div>
        <div class="mp-context-menu-separator"></div>
        <div class="mp-context-menu-item" onclick="ManpowerUtilization.contextMenuAction('duplicate', ${taskIdx})">
          <span>📋</span> Duplicate Task
        </div>
        <div class="mp-context-menu-separator"></div>
        <div class="mp-context-menu-item danger" onclick="ManpowerUtilization.contextMenuAction('delete', ${taskIdx})">
          <span>🗑️</span> Delete Task
        </div>
      `;

      menu.style.display = 'block';
      const menuW = 230;
      const menuH = 190;
      const left = (clientX + menuW > window.innerWidth) ? (window.innerWidth - menuW - 10) : clientX;
      const top = (clientY + menuH > window.innerHeight) ? (clientY - menuH) : clientY;
      menu.style.left = `${Math.max(10, left)}px`;
      menu.style.top = `${Math.max(10, top)}px`;
    }

    hideContextMenu() {
      const menu = document.getElementById('mpContextMenu');
      if (menu) menu.style.display = 'none';
    }

    contextMenuAction(action, taskIdx) {
      this.hideContextMenu();
      if (taskIdx < 0 || taskIdx >= this.tasks.length) return;
      const t = this.tasks[taskIdx];

      if (action === 'addSub') {
        this.breakdownTask(taskIdx, 'subcategory');
      } else if (action === 'addSubSub') {
        this.breakdownTask(taskIdx, 'subsubcategory');
      } else if (action === 'addSkillTrade') {
        this.addSkillTrade(taskIdx);
      } else if (action === 'addSibling') {
        this.breakdownTask(taskIdx, t.type, true);
      } else if (action === 'duplicate') {
        this.duplicateTask(taskIdx);
      } else if (action === 'delete') {
        this.deleteTask(taskIdx);
      }
    }

    /**
     * Breakdown Task into Sub-Task or Sub-Sub-Task
     */
    breakdownTask(taskIdx, targetType, isSibling = false) {
      if (taskIdx < 0 || taskIdx >= this.tasks.length) return;
      const pTask = this.tasks[taskIdx];
      let insertIdx = taskIdx + 1;
      let newType = targetType;
      let newCode = '';

      if (isSibling) {
        insertIdx = this.getSubtreeEndIndex(taskIdx);
        newType = pTask.type;
        const parts = pTask.code.split('.');
        if (parts.length === 4 && parts.every(p => /^\d+$/.test(p))) {
          if (newType === 'category') {
            const num = parseInt(parts[0], 10) + 1;
            newCode = `${String(num).padStart(2, '0')}.00.00.00`;
          } else if (newType === 'subcategory') {
            if (parts[0] === '01') {
              const num = parseInt(parts[2], 10) + 1;
              newCode = `01.00.${String(num).padStart(2, '0')}.00`;
            } else {
              const num = parseInt(parts[1], 10) + 1;
              newCode = `${parts[0]}.${String(num).padStart(2, '0')}.00.00`;
            }
          } else {
            const num = parseInt(parts[2], 10) + 1;
            newCode = `${parts[0]}.${parts[1]}.${String(num).padStart(2, '0')}.00`;
          }
        } else {
          newCode = `${pTask.code}.1`;
        }
      } else {
        insertIdx = this.getSubtreeEndIndex(taskIdx);
        const parts = pTask.code.split('.');
        if (targetType === 'subcategory') {
          newType = 'subcategory';
          const childCount = this.countDirectChildren(taskIdx, 'subcategory');
          if (parts.length === 4 && parts.every(p => /^\d+$/.test(p))) {
            if (parts[0] === '01') {
              newCode = `01.00.${String(childCount + 1).padStart(2, '0')}.00`;
            } else {
              newCode = `${parts[0]}.${String(childCount + 1).padStart(2, '0')}.00.00`;
            }
          } else {
            newCode = `${pTask.code}.${childCount + 1}`;
          }
        } else {
          newType = 'subsubcategory';
          const childCount = this.countDirectChildren(taskIdx, 'subsubcategory');
          if (parts.length === 4 && parts.every(p => /^\d+$/.test(p))) {
            newCode = `${parts[0]}.${parts[1]}.${String(childCount + 1).padStart(2, '0')}.00`;
          } else {
            newCode = `${pTask.code}.${childCount + 1}`;
          }
        }
      }

      const defaultTitle = isSibling
        ? `New ${newType === 'category' ? 'Category' : (newType === 'subcategory' ? 'Sub Task' : 'Sub-Sub Task')} Item`
        : `Breakdown: Sub-Task for ${pTask.code} (${pTask.description.substring(0, 24)}...)`;

      const defaultEstMp = newType === 'category' ? 0 : Math.max(2, Math.round((pTask.estimatedManpower || 4) / 2));
      const defaultMp = defaultEstMp;

      const newTask = {
        id: `mp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        type: newType,
        code: newCode,
        description: defaultTitle,
        estimatedManpower: defaultEstMp,
        manpower: defaultMp,
        trade: pTask.trade || STANDARD_TRADES[1].name,
        ratePerDay: pTask.ratePerDay || STANDARD_TRADES[1].rate,
        hasOt: pTask.hasOt || false,
        startDate: pTask.startDate || '2026-03-01',
        endDate: pTask.endDate || '2026-03-31',
        duration: pTask.duration || 30,
        isCollapsed: false,
        periodScheduled: {},
        periodActual: {}
      };

      this.tasks.splice(insertIdx, 0, newTask);
      this.saveData();
      this.render();
    }

    duplicateTask(taskIdx) {
      if (taskIdx < 0 || taskIdx >= this.tasks.length) return;
      const t = this.tasks[taskIdx];
      const clone = JSON.parse(JSON.stringify(t));
      clone.id = `mp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      clone.code = `${t.code}-copy`;
      clone.description = `${t.description} (Copy)`;
      this.tasks.splice(taskIdx + 1, 0, clone);
      this.saveData();
      this.render();
    }

    /**
     * Resizable Splitter
     */
    
    syncVerticalScroll() {
      const leftPane = document.getElementById('mpLeftPane');
      const rightPane = document.getElementById('mpRightPane');
      if (!leftPane || !rightPane) return;

      let isSyncingLeft = false;
      let isSyncingRight = false;

      leftPane.onscroll = () => {
        if (!isSyncingLeft) {
          isSyncingRight = true;
          rightPane.scrollTop = leftPane.scrollTop;
        }
        isSyncingLeft = false;
      };

      rightPane.onscroll = () => {
        if (!isSyncingRight) {
          isSyncingLeft = true;
          leftPane.scrollTop = rightPane.scrollTop;
        }
        isSyncingRight = false;
      };
    }
  
    initSplitter() {
      const splitter = document.getElementById('mpSplitter');
      const leftPane = document.getElementById('mpLeftPane');
      const wrap = document.getElementById('mpSplitWrap');
      if (!splitter || !leftPane || !wrap) return;

      const onMouseDown = (e) => {
        this.isDraggingSplitter = true;
        splitter.classList.add('dragging');
        if (document && document.body) document.body.style.cursor = 'col-resize';
        if (e && e.preventDefault) e.preventDefault();

        const onMouseMove = (ev) => {
          if (!this.isDraggingSplitter) return;
          const wrapRect = wrap.getBoundingClientRect ? wrap.getBoundingClientRect() : { left: 0 };
          let newWidth = ev.clientX - wrapRect.left;
          if (newWidth < 320) newWidth = 320;
          if (newWidth > 1400) newWidth = 1400;
          this.leftPaneWidth = newWidth;
          leftPane.style.width = `${newWidth}px`;
        };

        const onMouseUp = () => {
          this.isDraggingSplitter = false;
          splitter.classList.remove('dragging');
          if (document && document.body) document.body.style.cursor = '';
          try {
            localStorage.setItem('mp_left_pane_width', String(this.leftPaneWidth));
          } catch (err) {}
          if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          }
        };

        if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        }
      };

      if (splitter.addEventListener) {
        splitter.addEventListener('mousedown', onMouseDown);
      }
    }

    /**
     * Add Category / Sub Task / Sub-Sub Task
     */
    addTask(type = 'subsubcategory', parentIndex = null) {
      let insertIdx = this.tasks.length;
      let newCode = '1.0';

      if (parentIndex !== null && parentIndex >= 0 && parentIndex < this.tasks.length) {
        insertIdx = this.getSubtreeEndIndex(parentIndex);
        const pTask = this.tasks[parentIndex];
        const childCount = this.countDirectChildren(parentIndex, type);
        newCode = `${pTask.code}.${childCount + 1}`;
      } else {
        const catCount = this.tasks.filter(t => t.type === 'category').length + 1;
        newCode = `${catCount}.0`;
      }

      const newTask = {
        id: `mp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        type: type,
        code: newCode,
        description: type === 'category' ? 'New General Scope Category' : (type === 'subcategory' ? 'New Sub Scope Activity' : 'New Specific Sub-Sub Task Item'),
        estimatedManpower: type === 'category' ? 0 : 4,
        manpower: type === 'category' ? 0 : 4,
        trade: STANDARD_TRADES[1].name,
        ratePerDay: STANDARD_TRADES[1].rate,
        hasOt: false,
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        duration: 30,
        isCollapsed: false,
        periodScheduled: {},
        periodActual: {}
      };

      this.tasks.splice(insertIdx, 0, newTask);
      this.saveData();
      this.render();
    }

    deleteTask(idx) {
      if (idx < 0 || idx >= this.tasks.length) return;
      const t = this.tasks[idx];
      if (!confirm(`Are you sure you want to delete task "${t.code}: ${t.description}"?`)) return;

      this.tasks.splice(idx, 1);
      this.saveData();
      this.render();
    }

    updateTaskField(idx, field, value) {
      if (idx < 0 || idx >= this.tasks.length) return;
      const t = this.tasks[idx];

      if (field === 'manpower' || field === 'estimatedManpower' || field === 'ratePerDay') {
        t[field] = parseFloat(value) || 0;
      } else if (field === 'hasOt') {
        t.hasOt = !!value;
      } else {
        t[field] = value;
      }

      this.saveData();
      this.render();
    }

    updateTaskTrade(idx, tradeName) {
      if (idx < 0 || idx >= this.tasks.length) return;
      const match = STANDARD_TRADES.find(tr => tr.name === tradeName);
      if (match) {
        this.tasks[idx].trade = match.name;
        this.tasks[idx].ratePerDay = match.rate;
      } else {
        this.tasks[idx].trade = tradeName;
      }
      this.saveData();
      this.render();
    }

    updatePeriodDirectInput(tIdx, dateKey, rawVal) {
      if (tIdx < 0 || tIdx >= this.tasks.length) return;
      const t = this.tasks[tIdx];
      if (!t.periodScheduled) t.periodScheduled = {};

      const numVal = parseFloat(String(rawVal).replace(/[^0-9.]/g, '')) || 0;
      t.periodScheduled[dateKey] = numVal;

      this.saveData();
      this.render();
    }

    setScale(s) {
      this.scale = s;
      if (s === 'months' || s === 'quarters') {
        this.monthFilter = 'all';
      }
      this.render();
    }

    setMonthFilter(m) {
      this.monthFilter = m;
      if (m !== 'all') {
        if (this.scale === 'months' || this.scale === 'quarters') {
          this.scale = 'days';
        }
      }
      this.saveData();
      this.render();
    }

    navigateMonth(dir) {
      const months = this.getAvailableMonths();
      if (!months || months.length === 0) return;

      if (this.monthFilter === 'all') {
        this.setMonthFilter(dir > 0 ? months[0].value : months[months.length - 1].value);
        return;
      }

      const curIdx = months.findIndex(m => m.value === this.monthFilter);
      if (curIdx === -1) {
        this.setMonthFilter(months[0].value);
        return;
      }

      const nextIdx = curIdx + dir;
      if (nextIdx >= 0 && nextIdx < months.length) {
        this.setMonthFilter(months[nextIdx].value);
      } else {
        this.setMonthFilter('all');
      }
    }

    setViewMode(m) {
      this.viewMode = m;
      this.render();
    }

    toggleChart() {
      this.chartVisible = !this.chartVisible;
      this.render();
    }

    /**
     * Daily Actual Manpower Log Modal
     */
    openLogActualModal() {
      const modal = document.getElementById('mpLogActualModal');
      const body = document.getElementById('mpLogModalContent');
      if (!modal || !body) return;

      let rowsHtml = '';
      this.tasks.forEach((t, i) => {
        if (!this.hasChildTask(i)) {
          const actVal = (t.periodActual && t.periodActual[this.currentDate]) !== undefined ? t.periodActual[this.currentDate] : t.manpower;
          rowsHtml += `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 0; border-bottom:1px solid #f1f5f9;">
              <div style="flex:1;">
                <strong style="color:#1e40af; font-size:11.5px;">${escapeHtml(t.code)}</strong> 
                <span style="font-weight:600; font-size:12px; color:#0f172a;">${escapeHtml(t.description)}</span>
                <div style="font-size:10.5px; color:#64748b;">${escapeHtml(t.trade)} • ₱${formatNumber(t.ratePerDay, 0)}/day (Scheduled: <strong>${t.manpower} Pax</strong> | Est: <strong>${t.estimatedManpower || 0}</strong>)</div>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <label style="font-size:11px; font-weight:700; color:#334155;">Actual On-Site:</label>
                <input type="number" min="0" value="${actVal}" id="mp_log_inp_${i}" 
                  style="width:65px; height:28px; text-align:center; border:1px solid #cbd5e1; border-radius:4px; font-weight:700; color:#059669;">
                <span style="font-size:11px; color:#64748b;">Pax</span>
              </div>
            </div>
          `;
        }
      });

      body.innerHTML = `
        <div style="margin-bottom:12px; background:#eff6ff; padding:10px 14px; border-radius:6px; border:1px solid #bfdbfe; display:flex; align-items:center; justify-content:space-between;">
          <div>
            <strong style="color:#1e40af; font-size:12px;">Work Force Date:</strong>
            <input type="date" value="${this.currentDate}" id="mpLogDatePicker" onchange="ManpowerUtilization.onLogDateChange(this.value)" 
              style="margin-left:8px; height:26px; border:1px solid #cbd5e1; border-radius:4px; padding:2px 6px; font-size:11px;">
          </div>
          <span style="font-size:11px; color:#2563eb; font-weight:600;">Daily Force Account Verification</span>
        </div>
        <div style="max-height: 45vh; overflow-y: auto; padding-right: 4px;">
          ${rowsHtml}
        </div>
      `;

      modal.style.display = 'flex';
    }

    closeLogActualModal() {
      const modal = document.getElementById('mpLogActualModal');
      if (modal) modal.style.display = 'none';
    }

    onLogDateChange(newDate) {
      this.currentDate = newDate;
      this.openLogActualModal();
    }

    saveLoggedActual() {
      const datePicker = document.getElementById('mpLogDatePicker');
      const targetDate = datePicker ? datePicker.value : this.currentDate;

      this.tasks.forEach((t, i) => {
        if (!this.hasChildTask(i)) {
          const inp = document.getElementById(`mp_log_inp_${i}`);
          if (inp) {
            if (!t.periodActual) t.periodActual = {};
            t.periodActual[targetDate] = parseFloat(inp.value) || 0;
          }
        }
      });

      this.closeLogActualModal();
      this.saveData();
      this.render();
      alert(`✅ Actual Manpower logged successfully for ${targetDate}!\nComparison charts, utilization rates, and cumulative costs have been recalculated.`);
    }

    /**
     * Export complete Manpower workbook to Excel (.xlsx) using SheetJS
     */
    exportToExcel() {
      if (typeof window.XLSX === 'undefined') {
        alert('SheetJS (XLSX) library is still loading. Please retry in a moment.');
        return;
      }

      const { periods } = this.computeTimelinePeriods();
      const aggregations = this.computeAggregations(periods);

      const sheetData = [];

      sheetData.push([
        'FCL ARANANG DEVELOPMENT CORPORATION - MANPOWER UTILIZATION SCHEDULE & COST PROJECTION'
      ]);
      sheetData.push([
        `Project Ref: ${this.currentProjectId}`,
        `Report Date: ${new Date().toLocaleDateString()}`,
        `Scale: ${this.scale.toUpperCase()}`
      ]);
      sheetData.push([]);

      // Table Column Headers including Estimated Manpower
      const headerRow1 = [
        'Item Code',
        'Work Description',
        'Estimated Manpower',
        'No. of Manpower',
        'Skill / Trade',
        'Rate / Day (₱)',
        'O.T. (+25%)',
        'Daily Total (₱)'
      ];

      periods.forEach(p => headerRow1.push(p.key));
      sheetData.push(headerRow1);

      // Task Rows
      this.tasks.forEach((t, tIdx) => {
        const isCat = t.type === 'category';
        const indent = isCat ? '' : (t.type === 'subcategory' ? '  ' : '    ');
        const baseRate = parseFloat(t.ratePerDay) || 0;
        const otRate = baseRate * 1.25;
        const dailyTotal = (t.hasOt ? otRate : baseRate) * (parseFloat(t.manpower) || 0);

        const row = [
          t.code,
          indent + t.description,
          t.estimatedManpower || 0,
          t.manpower || 0,
          t.trade,
          baseRate,
          t.hasOt ? otRate : 'N/A',
          dailyTotal
        ];

        periods.forEach((p, pIdx) => {
          const c = aggregations.taskPeriodCosts[tIdx][pIdx];
          if (this.viewMode === 'cumulative') {
            let cum = 0;
            for (let k = 0; k <= pIdx; k++) cum += aggregations.taskPeriodCosts[tIdx][k].cost;
            row.push(cum);
          } else if (this.viewMode === 'period') {
            row.push(c.cost);
          } else {
            row.push(c.scheduledMp);
          }
        });

        sheetData.push(row);
      });

      // Bottom Cumulative Cost Summary Row
      const cumulRow = ['TOTAL', 'CUMULATIVE LABOR COST PER DATE (₱)', '', '', '', '', '', ''];
      periods.forEach((p, idx) => {
        cumulRow.push(aggregations.cumulativeCosts[idx]);
      });
      sheetData.push(cumulRow);

      const wb = window.XLSX.utils.book_new();
      const ws = window.XLSX.utils.aoa_to_sheet(sheetData);
      window.XLSX.utils.book_append_sheet(wb, ws, 'Manpower Utilization');
      window.XLSX.writeFile(wb, `Manpower_Utilization_${this.currentProjectId}_${this.scale}.xlsx`);
    }

    setupGlobalEvents() {
      // Excel Keyboard Navigation
      document.addEventListener('keydown', (e) => {
        if (!e.target || !e.target.classList.contains('mp-cell-input')) return;
        const td = e.target.closest('td');
        const tr = e.target.closest('tr');
        if (!td || !tr) return;

        const cellIndex = td.cellIndex;

        if (e.key === 'Enter') {
          const nextTr = tr.nextElementSibling;
          if (nextTr && nextTr.children[cellIndex]) {
            const nextInp = nextTr.children[cellIndex].querySelector('.mp-cell-input');
            if (nextInp) {
              nextInp.focus();
              nextInp.select();
              e.preventDefault();
            }
          }
        }
      });
    }
  }

  // Singleton instance
  const instance = new ManpowerManager();

  return {
    init: (containerId, projectId) => instance.mount(containerId, projectId),
    render: (containerId, projectId) => instance.mount(containerId, projectId),
    addTask: (type, parentIdx) => instance.addTask(type, parentIdx),
    breakdownTask: (taskIdx, type, isSibling) => instance.breakdownTask(taskIdx, type, isSibling),
    addSkillTrade: (taskIdx) => instance.addSkillTrade(taskIdx),
    updateTradeSkill: (idx, val) => instance.updateTradeSkill(idx, val),
    toggleCollapse: (idx) => instance.toggleCollapse(idx),
    contextMenuAction: (action, taskIdx) => instance.contextMenuAction(action, taskIdx),
    deleteTask: (idx) => instance.deleteTask(idx),
    duplicateTask: (idx) => instance.duplicateTask(idx),
    updateTaskField: (idx, field, val) => instance.updateTaskField(idx, field, val),
    updateTaskTrade: (idx, val) => instance.updateTaskTrade(idx, val),
    updatePeriodDirectInput: (tIdx, key, val) => instance.updatePeriodDirectInput(tIdx, key, val),
    setScale: (s) => instance.setScale(s),
    setViewMode: (m) => instance.setViewMode(m),
    setMonthFilter: (m) => instance.setMonthFilter(m),
    navigateMonth: (dir) => instance.navigateMonth(dir),
    getAvailableMonths: () => instance.getAvailableMonths(),
    getProjectGanttStartDate: () => instance.getProjectGanttStartDate(),
    getProjectGanttTimelineRange: () => instance.getProjectGanttTimelineRange(),
    adaptAndSyncWithGanttTimeline: (force) => instance.adaptAndSyncWithGanttTimeline(force),
    toggleChart: () => instance.toggleChart(),
    syncFromGantt: (shouldSave) => instance.syncFromGantt(shouldSave),
    saveData: () => instance.saveData(),
    exportToExcel: () => instance.exportToExcel(),
    openLogActualModal: () => instance.openLogActualModal(),
    closeLogActualModal: () => instance.closeLogActualModal(),
    onLogDateChange: (dt) => instance.onLogDateChange(dt),
    saveLoggedActual: () => instance.saveLoggedActual(),
    showChartTooltip: (e, el) => instance.showChartTooltip(e, el),
    hideChartTooltip: () => instance.hideChartTooltip(),
    getInstance: () => instance
  };
});
