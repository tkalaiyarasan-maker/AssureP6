/**
 * Authentic Primavera P6 .xer sample file raw strings
 */

export interface SampleProjectInfo {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string;
  activityCount: number;
  durationMonths: number;
  xerContent: string;
}

export const SAMPLE_PROJECT_METRO: string = `ERMHDR	8.3	2024-05-15	PROJ	METRO-P2
%T	PROJECT
%F	proj_id	proj_short_name	task_code_base	plan_start_date	plan_end_date	last_recalc_date	status_code
%R	100	METRO-P2	Metro Rail Transit Expansion Phase 2 EPC	2024-01-08 08:00	2025-06-30 17:00	2024-05-01 08:00	Active
%T	CALENDAR
%F	clndr_id	clndr_name	day_hr_cnt	clndr_type
%R	1	Standard 5-Day Workweek	8.0	CA_Project
%R	2	Continuous 7-Day Tunneling	24.0	CA_Project
%T	PROJWBS
%F	wbs_id	proj_id	parent_wbs_id	wbs_short_name	wbs_name	seq_num	status_code
%R	1000	100		M2	Metro Line 2 Extension	1	WS_Open
%R	1100	100	1000	M2.01	Project Management & Permitting	1	WS_Open
%R	1200	100	1000	M2.02	Detailed Engineering & Design	2	WS_Open
%R	1300	100	1000	M2.03	Procurement & Long Lead Equipment	3	WS_Open
%R	1400	100	1000	M2.04	Civil Works & Tunneling	4	WS_Open
%R	1500	100	1000	M2.05	Station Architectural & Structural	5	WS_Open
%R	1600	100	1000	M2.06	Trackwork & Traction Power	6	WS_Open
%R	1700	100	1000	M2.07	Signaling, Telecom & SCADA	7	WS_Open
%R	1800	100	1000	M2.08	Testing, Commissioning & Revenue Service	8	WS_Open
%T	RSRC
%F	rsrc_id	rsrc_short_name	rsrc_name	rsrc_type	unit_id
%R	501	PM	Project Manager	RT_Labor	hr
%R	502	CIV-ENG	Senior Civil Engineer	RT_Labor	hr
%R	503	STR-ENG	Structural Design Engineer	RT_Labor	hr
%R	504	SYS-ENG	Signaling & Systems Specialist	RT_Labor	hr
%R	505	TBM-CREW	Tunnel Boring Machine Crew	RT_Labor	hr
%R	506	ELEC-CREW	High-Voltage Traction Crew	RT_Labor	hr
%R	507	TRK-CREW	Ballast & Trackwork Crew	RT_Labor	hr
%R	508	STEEL	Structural Rebar & Steel	RT_Mat	ton
%R	509	CONC	High-Strength Precast Concrete	RT_Mat	m3
%T	TASK
%F	task_id	proj_id	wbs_id	task_code	task_name	status_code	task_type	act_start_date	act_end_date	target_start_date	target_end_date	early_start_date	early_end_date	late_start_date	late_end_date	target_drtn_hr_cnt	remain_drtn_hr_cnt	act_work_qty	phys_complete_pct	total_float_hr_cnt	free_float_hr_cnt	clndr_id
%R	101	100	1100	M2-1000	Notice to Proceed (NTP)	TK_Complete	TT_Mile	2024-01-08 08:00	2024-01-08 08:00	2024-01-08 08:00	2024-01-08 08:00	2024-01-08 08:00	2024-01-08 08:00	2024-01-08 08:00	2024-01-08 08:00	0	0	0	100	0	0	1
%R	102	100	1100	M2-1010	Environmental Approvals & ROW Acquisition	TK_Complete	TT_Task	2024-01-09 08:00	2024-02-16 17:00	2024-01-09 08:00	2024-02-16 17:00	2024-01-09 08:00	2024-02-16 17:00	2024-01-09 08:00	2024-02-16 17:00	240	0	240	100	80	80	1
%R	103	100	1100	M2-1020	Project Management Plan & Quality Audit	TK_Complete	TT_Task	2024-01-09 08:00	2024-02-02 17:00	2024-01-09 08:00	2024-02-02 17:00	2024-01-09 08:00	2024-02-02 17:00	2024-01-16 08:00	2024-02-09 17:00	160	0	160	100	120	120	1
%R	104	100	1200	M2-2000	Alignment Geotechnical Investigation	TK_Complete	TT_Task	2024-01-15 08:00	2024-02-23 17:00	2024-01-15 08:00	2024-02-23 17:00	2024-01-15 08:00	2024-02-23 17:00	2024-01-15 08:00	2024-02-23 17:00	240	0	240	100	0	0	1
%R	105	100	1200	M2-2010	Tunnel & Shaft Detailed Structural Design	TK_Complete	TT_Task	2024-02-26 08:00	2024-04-12 17:00	2024-02-26 08:00	2024-04-12 17:00	2024-02-26 08:00	2024-04-12 17:00	2024-02-26 08:00	2024-04-12 17:00	280	0	280	100	0	0	1
%R	106	100	1200	M2-2020	Underground Station Architectural Plans	TK_Complete	TT_Task	2024-02-26 08:00	2024-04-19 17:00	2024-02-26 08:00	2024-04-19 17:00	2024-02-26 08:00	2024-04-19 17:00	2024-03-04 08:00	2024-04-26 17:00	320	0	320	100	40	40	1
%R	107	100	1200	M2-2030	Traction Power & OCS System Engineering	TK_Complete	TT_Task	2024-03-04 08:00	2024-04-26 17:00	2024-03-04 08:00	2024-04-26 17:00	2024-03-04 08:00	2024-04-26 17:00	2024-03-18 08:00	2024-05-10 17:00	320	0	320	100	80	80	1
%R	108	100	1200	M2-2040	CBTC Signaling & Interlocking Architecture	TK_Active	TT_Task	2024-03-18 08:00		2024-03-18 08:00	2024-05-24 17:00	2024-03-18 08:00	2024-05-24 17:00	2024-03-18 08:00	2024-05-24 17:00	400	120	280	70	0	0	1
%R	109	100	1200	M2-2090	Engineering IFC Package Approved	TK_Active	TT_Mile	2024-04-15 08:00		2024-04-15 08:00	2024-04-15 08:00	2024-04-15 08:00	2024-04-15 08:00	2024-04-15 08:00	2024-04-15 08:00	0	0	0	100	0	0	1
%R	110	100	1300	M2-3000	Procure Tunnel Boring Machine (TBM)	TK_Complete	TT_Task	2024-01-15 08:00	2024-04-05 17:00	2024-01-15 08:00	2024-04-05 17:00	2024-01-15 08:00	2024-04-05 17:00	2024-01-15 08:00	2024-04-05 17:00	480	0	480	100	0	0	1
%R	111	100	1300	M2-3010	Procure Precast Concrete Tunnel Segments	TK_Complete	TT_Task	2024-02-05 08:00	2024-04-19 17:00	2024-02-05 08:00	2024-04-19 17:00	2024-02-05 08:00	2024-04-19 17:00	2024-02-19 08:00	2024-05-03 17:00	440	0	440	100	80	80	1
%R	112	100	1300	M2-3020	Procure Continuously Welded Rail (UIC 60)	TK_Active	TT_Task	2024-03-01 08:00		2024-03-01 08:00	2024-05-31 17:00	2024-03-01 08:00	2024-05-31 17:00	2024-04-05 08:00	2024-07-05 17:00	520	180	340	65	200	200	1
%R	113	100	1300	M2-3030	Procure Traction Substations & Transformers	TK_Active	TT_Task	2024-03-15 08:00		2024-03-15 08:00	2024-06-21 17:00	2024-03-15 08:00	2024-06-21 17:00	2024-04-12 08:00	2024-07-19 17:00	560	240	320	57	160	160	1
%R	114	100	1400	M2-4000	Launch Shaft Excavation & Shoring	TK_Complete	TT_Task	2024-03-04 08:00	2024-04-19 17:00	2024-03-04 08:00	2024-04-19 17:00	2024-03-04 08:00	2024-04-19 17:00	2024-03-04 08:00	2024-04-19 17:00	280	0	280	100	0	0	1
%R	115	100	1400	M2-4010	TBM Assembly, Calibration & Launch	TK_Active	TT_Task	2024-04-22 08:00		2024-04-22 08:00	2024-05-17 17:00	2024-04-22 08:00	2024-05-17 17:00	2024-04-22 08:00	2024-05-17 17:00	160	60	100	62	0	0	1
%R	116	100	1400	M2-4020	Main Bore Tunnel Drive - Section 1 (3.2km)	TK_NotStart	TT_Task			2024-05-20 08:00	2024-10-18 17:00	2024-05-20 08:00	2024-10-18 17:00	2024-05-20 08:00	2024-10-18 17:00	880	880	0	0	0	0	1
%R	117	100	1400	M2-4030	Cross-Passage Excavation & Waterproofing	TK_NotStart	TT_Task			2024-10-21 08:00	2024-12-06 17:00	2024-10-21 08:00	2024-12-06 17:00	2024-10-21 08:00	2024-12-06 17:00	280	280	0	0	0	0	1
%R	118	100	1400	M2-4040	TBM Reception & Breakthrough at Station A	TK_NotStart	TT_Mile			2024-12-09 08:00	2024-12-09 08:00	2024-12-09 08:00	2024-12-09 08:00	2024-12-09 08:00	2024-12-09 08:00	0	0	0	0	0	0	1
%R	119	100	1500	M2-5000	Station A Cut-and-Cover Deep Excavation	TK_Active	TT_Task	2024-03-25 08:00		2024-03-25 08:00	2024-06-28 17:00	2024-03-25 08:00	2024-06-28 17:00	2024-04-15 08:00	2024-07-19 17:00	560	280	280	50	120	120	1
%R	120	100	1500	M2-5010	Station A Base Slab & Waterproofing	TK_NotStart	TT_Task			2024-07-01 08:00	2024-08-30 17:00	2024-07-01 08:00	2024-08-30 17:00	2024-07-22 08:00	2024-09-20 17:00	360	360	0	0	120	120	1
%R	121	100	1500	M2-5020	Station A Concourse & Platform Structure	TK_NotStart	TT_Task			2024-09-02 08:00	2024-11-29 17:00	2024-09-02 08:00	2024-11-29 17:00	2024-09-23 08:00	2024-12-20 17:00	520	520	0	0	120	120	1
%R	122	100	1600	M2-6000	Trackbed Plinth & Concrete Invert Prep	TK_NotStart	TT_Task			2024-12-10 08:00	2025-01-24 17:00	2024-12-10 08:00	2025-01-24 17:00	2024-12-10 08:00	2025-01-24 17:00	264	264	0	0	0	0	1
%R	123	100	1600	M2-6010	Rail Laying & Continuous Flash-Butt Welding	TK_NotStart	TT_Task			2025-01-27 08:00	2025-03-07 17:00	2025-01-27 08:00	2025-03-07 17:00	2025-01-27 08:00	2025-03-07 17:00	240	240	0	0	0	0	1
%R	124	100	1600	M2-6020	Third Rail / OCS Traction Power Stringing	TK_NotStart	TT_Task			2025-02-17 08:00	2025-03-28 17:00	2025-02-17 08:00	2025-03-28 17:00	2025-02-17 08:00	2025-03-28 17:00	240	240	0	0	0	0	1
%R	125	100	1700	M2-7000	Trackside Axle Counters & Transponders	TK_NotStart	TT_Task			2025-03-10 08:00	2025-04-11 17:00	2025-03-10 08:00	2025-04-11 17:00	2025-03-10 08:00	2025-04-11 17:00	200	200	0	0	0	0	1
%R	126	100	1700	M2-7010	Wayside Signaling & Interlocking Installation	TK_NotStart	TT_Task			2025-03-24 08:00	2025-04-25 17:00	2025-03-24 08:00	2025-04-25 17:00	2025-03-24 08:00	2025-04-25 17:00	200	200	0	0	0	0	1
%R	127	100	1700	M2-7020	Central Control Center SCADA Integration	TK_NotStart	TT_Task			2025-04-14 08:00	2025-05-16 17:00	2025-04-14 08:00	2025-05-16 17:00	2025-04-14 08:00	2025-05-16 17:00	200	200	0	0	0	0	1
%R	128	100	1800	M2-8000	Static Vehicle Clearance & Gauge Checks	TK_NotStart	TT_Task			2025-05-05 08:00	2025-05-16 17:00	2025-05-05 08:00	2025-05-16 17:00	2025-05-05 08:00	2025-05-16 17:00	80	80	0	0	0	0	1
%R	129	100	1800	M2-8010	Dynamic Train Test Runs (Low & High Speed)	TK_NotStart	TT_Task			2025-05-19 08:00	2025-06-06 17:00	2025-05-19 08:00	2025-06-06 17:00	2025-05-19 08:00	2025-06-06 17:00	120	120	0	0	0	0	1
%R	130	100	1800	M2-8020	Trial Running & Safety Certification	TK_NotStart	TT_Task			2025-06-09 08:00	2025-06-27 17:00	2025-06-09 08:00	2025-06-27 17:00	2025-06-09 08:00	2025-06-27 17:00	120	120	0	0	0	0	1
%R	131	100	1800	M2-8090	Commercial Revenue Service In-Service Date	TK_NotStart	TT_FinMile			2025-06-30 17:00	2025-06-30 17:00	2025-06-30 17:00	2025-06-30 17:00	2025-06-30 17:00	2025-06-30 17:00	0	0	0	0	0	0	1
%T	TASKPRED
%F	task_pred_id	task_id	pred_task_id	pred_type	lag_hr_cnt	driving_path_flag
%R	1	102	101	PR_FS	0	Y
%R	2	103	101	PR_FS	0	N
%R	3	104	101	PR_FS	0	Y
%R	4	105	104	PR_FS	0	Y
%R	5	106	104	PR_FS	0	N
%R	6	107	105	PR_FS	0	N
%R	7	108	105	PR_FS	0	Y
%R	8	109	105	PR_FS	0	Y
%R	9	110	101	PR_FS	0	Y
%R	10	111	105	PR_FS	0	N
%R	11	112	109	PR_FS	0	N
%R	12	113	107	PR_FS	0	N
%R	13	114	105	PR_FS	0	Y
%R	14	115	110	PR_FS	0	Y
%R	15	115	114	PR_FS	0	Y
%R	16	116	115	PR_FS	0	Y
%R	17	117	116	PR_SS	800	Y
%R	18	118	116	PR_FS	0	Y
%R	19	119	106	PR_FS	0	N
%R	20	120	119	PR_FS	0	N
%R	21	121	120	PR_FS	0	N
%R	22	122	118	PR_FS	0	Y
%R	23	123	122	PR_FS	0	Y
%R	24	124	122	PR_FS	80	Y
%R	25	125	123	PR_FS	0	Y
%R	26	126	125	PR_FS	0	Y
%R	27	127	126	PR_FS	0	Y
%R	28	128	124	PR_FS	0	Y
%R	29	128	127	PR_FS	0	Y
%R	30	129	128	PR_FS	0	Y
%R	31	130	129	PR_FS	0	Y
%R	32	131	130	PR_FS	0	Y
%T	TASKRSRC
%F	task_rsrc_id	task_id	rsrc_id	target_qty	act_qty	target_cost	act_cost
%R	1	102	501	120	120	15600	15600
%R	2	104	502	240	240	28800	28800
%R	3	105	503	280	280	33600	33600
%R	4	108	504	400	280	56000	39200
%R	5	114	502	140	140	16800	16800
%R	6	115	505	320	200	48000	30000
%R	7	116	505	1760	0	264000	0
%R	8	116	509	4500	0	675000	0
%R	9	121	508	220	0	198000	0
%R	10	123	507	480	0	62400	0
%R	11	124	506	480	0	72000	0
%R	12	126	504	200	0	28000	0
%E
`;

export const SAMPLE_PROJECT_HIGHRISE: string = `ERMHDR	8.3	2024-03-01	PROJ	TOWER-45
%T	PROJECT
%F	proj_id	proj_short_name	task_code_base	plan_start_date	plan_end_date	last_recalc_date	status_code
%R	200	TOWER-45	Metropolitan Commercial Tower (45-Storey)	2024-02-01 08:00	2025-11-30 17:00	2024-04-15 08:00	Active
%T	CALENDAR
%F	clndr_id	clndr_name	day_hr_cnt	clndr_type
%R	1	Standard 6-Day Construction	8.0	CA_Project
%T	PROJWBS
%F	wbs_id	proj_id	parent_wbs_id	wbs_short_name	wbs_name	seq_num	status_code
%R	2000	200		TW	Tower 45 Project Root	1	WS_Open
%R	2100	200	2000	TW.SUB	Substructure & Deep Foundations	1	WS_Open
%R	2200	200	2000	TW.POD	Podium & Commercial Levels L1-L5	2	WS_Open
%R	2300	200	2000	TW.STR	Tower Superstructure Core & Slabs	3	WS_Open
%R	2400	200	2000	TW.ENV	Unitized Curtain Wall Façade	4	WS_Open
%R	2500	200	2000	TW.MEP	MEP Riser & Plant Infrastructure	5	WS_Open
%R	2600	200	2000	TW.FIT	Interior Fit-Out & Tenant Handover	6	WS_Open
%T	RSRC
%F	rsrc_id	rsrc_short_name	rsrc_name	rsrc_type	unit_id
%R	601	SUPV	Construction Superintendent	RT_Labor	hr
%R	602	CONC-CREW	Formwork & Concrete Crew	RT_Labor	hr
%R	603	GLZ-CREW	Curtain Wall Glazing Specialists	RT_Labor	hr
%R	604	MEP-CREW	HVAC & Piping Trades	RT_Labor	hr
%T	TASK
%F	task_id	proj_id	wbs_id	task_code	task_name	status_code	task_type	act_start_date	act_end_date	target_start_date	target_end_date	early_start_date	early_end_date	late_start_date	late_end_date	target_drtn_hr_cnt	remain_drtn_hr_cnt	act_work_qty	phys_complete_pct	total_float_hr_cnt	free_float_hr_cnt	clndr_id
%R	201	200	2100	C1000	Site Mobilization & Crane Erection	TK_Complete	TT_Task	2024-02-01 08:00	2024-02-15 17:00	2024-02-01 08:00	2024-02-15 17:00	2024-02-01 08:00	2024-02-15 17:00	2024-02-01 08:00	2024-02-15 17:00	96	0	96	100	0	0	1
%R	202	200	2100	C1010	Secant Bored Piles & Diaphragm Wall	TK_Complete	TT_Task	2024-02-16 08:00	2024-03-29 17:00	2024-02-16 08:00	2024-03-29 17:00	2024-02-16 08:00	2024-03-29 17:00	2024-02-16 08:00	2024-03-29 17:00	288	0	288	100	0	0	1
%R	203	200	2100	C1020	Deep Basement Excavation & Strutting	TK_Active	TT_Task	2024-04-01 08:00		2024-04-01 08:00	2024-05-18 17:00	2024-04-01 08:00	2024-05-18 17:00	2024-04-01 08:00	2024-05-18 17:00	336	144	192	57	0	0	1
%R	204	200	2100	C1030	Thick Raft Foundation Concrete Pour (4500m3)	TK_NotStart	TT_Task			2024-05-20 08:00	2024-06-15 17:00	2024-05-20 08:00	2024-06-15 17:00	2024-05-20 08:00	2024-06-15 17:00	192	192	0	0	0	0	1
%R	205	200	2200	C2000	Podium Basement Columns & Transfer Slab	TK_NotStart	TT_Task			2024-06-17 08:00	2024-08-03 17:00	2024-06-17 08:00	2024-08-03 17:00	2024-06-17 08:00	2024-08-03 17:00	336	336	0	0	0	0	1
%R	206	200	2300	C3000	Slipform Core Wall Setup & Cycle (L6-L20)	TK_NotStart	TT_Task			2024-08-05 08:00	2024-11-30 17:00	2024-08-05 08:00	2024-11-30 17:00	2024-08-05 08:00	2024-11-30 17:00	816	816	0	0	0	0	1
%R	207	200	2300	C3010	Post-Tensioned Floor Slabs (L6-L20)	TK_NotStart	TT_Task			2024-08-26 08:00	2024-12-21 17:00	2024-08-26 08:00	2024-12-21 17:00	2024-09-02 08:00	2024-12-28 17:00	816	816	0	0	48	48	1
%R	208	200	2400	C4000	Curtain Wall Bracket Alignment & Glazing L6-L15	TK_NotStart	TT_Task			2024-11-04 08:00	2025-02-15 17:00	2024-11-04 08:00	2025-02-15 17:00	2024-11-18 08:00	2025-03-01 17:00	720	720	0	0	96	96	1
%R	209	200	2500	C5000	Central Chillers & Electrical Switchgear Install	TK_NotStart	TT_Task			2024-12-02 08:00	2025-03-15 17:00	2024-12-02 08:00	2025-03-15 17:00	2024-12-09 08:00	2025-03-22 17:00	720	720	0	0	48	48	1
%R	210	200	2300	C3020	Tower Top-Out (Level 45 Parapet Pour)	TK_NotStart	TT_Mile			2025-04-30 17:00	2025-04-30 17:00	2025-04-30 17:00	2025-04-30 17:00	2025-04-30 17:00	2025-04-30 17:00	0	0	0	0	0	0	1
%R	211	200	2600	C6000	Elevator Final Inspection & Handover	TK_NotStart	TT_Task			2025-09-01 08:00	2025-11-20 17:00	2025-09-01 08:00	2025-11-20 17:00	2025-09-01 08:00	2025-11-20 17:00	560	560	0	0	0	0	1
%R	212	200	2600	C6090	Certificate of Occupancy (C of O)	TK_NotStart	TT_FinMile			2025-11-30 17:00	2025-11-30 17:00	2025-11-30 17:00	2025-11-30 17:00	2025-11-30 17:00	2025-11-30 17:00	0	0	0	0	0	0	1
%T	TASKPRED
%F	task_pred_id	task_id	pred_task_id	pred_type	lag_hr_cnt	driving_path_flag
%R	201	202	201	PR_FS	0	Y
%R	202	203	202	PR_FS	0	Y
%R	203	204	203	PR_FS	0	Y
%R	204	205	204	PR_FS	0	Y
%R	205	206	205	PR_FS	0	Y
%R	206	207	206	PR_SS	144	N
%R	207	208	207	PR_SS	400	N
%R	208	209	205	PR_FS	800	N
%R	209	210	206	PR_FS	0	Y
%R	210	211	210	PR_FS	0	Y
%R	211	212	211	PR_FS	0	Y
%T	TASKRSRC
%F	task_rsrc_id	task_id	rsrc_id	target_qty	act_qty	target_cost	act_cost
%R	201	202	602	288	288	34560	34560
%R	202	203	601	192	192	23040	23040
%R	203	204	602	192	0	23040	0
%R	204	206	602	816	0	97920	0
%R	205	208	603	720	0	108000	0
%R	206	209	604	720	0	108000	0
%E
`;

export const SAMPLE_PROJECT_MAHSR: string = `ERMHDR	8.3	2020-12-10	PROJ	MAHSR-C4
%T	PROJECT
%F	proj_id	proj_short_name	task_code_base	plan_start_date	plan_end_date	last_recalc_date	status_code
%R	400	MAHSR-C4	MAHSR C4 - CWP Baseline	2020-12-10 08:00	2024-12-08 17:00	2020-12-10 08:00	Active
%T	CALENDAR
%F	clndr_id	clndr_name	day_hr_cnt	clndr_type
%R	1	Standard 6-Day Workweek	8.0	CA_Project
%R	2	Continuous 7-Day Casting Yard	24.0	CA_Project
%R	3	Monsoon Adjusted Calendar	8.0	CA_Project
%R	4	High-Speed Trackwork 24x7	24.0	CA_Project
%R	5	Station Architectural Finish	8.0	CA_Project
%R	6	Depot & Traction Power System	8.0	CA_Project
%T	PROJWBS
%F	wbs_id	proj_id	parent_wbs_id	wbs_short_name	wbs_name	seq_num	status_code
%R	4000	400		C4	MAHSR Package C4 High-Speed Rail	1	WS_Open
%R	4100	400	4000	C4.01	Project Management, Permitting & ROW	1	WS_Open
%R	4200	400	4000	C4.02	Detailed Engineering, BIM & Geotech	2	WS_Open
%R	4300	400	4000	C4.03	Precast Segmental Casting Yards (CY1-CY4)	3	WS_Open
%R	4400	400	4000	C4.04	Viaduct Substructure (Piles & Piers 237km)	4	WS_Open
%R	4500	400	4000	C4.05	Superstructure Full-Span Girder Launching	5	WS_Open
%R	4600	400	4000	C4.06	Special Steel Trusses & River Crossings	6	WS_Open
%R	4700	400	4000	C4.07	Surat, Bilimora, Navsari & Vapi Stations	7	WS_Open
%R	4800	400	4000	C4.08	Traction Power Substations & OCS	8	WS_Open
%R	4900	400	4000	C4.09	Trackwork, High-Speed Turnouts & Testing	9	WS_Open
%T	RSRC
%F	rsrc_id	rsrc_short_name	rsrc_name	rsrc_type	unit_id
%R	701	CIV-DIR	Civil Project Director	RT_Labor	hr
%R	702	FSLM-OP	Full-Span Launching Machine Operator	RT_Labor	hr
%R	703	REBAR-CRW	Pier Rebar & Shuttering Crew	RT_Labor	hr
%R	704	PSC-STEEL	Pre-Stressed High-Tensile Steel	RT_Mat	ton
%R	705	C60-CONC	Ultra High Performance C60 Concrete	RT_Mat	m3
%R	706	CRANE-300T	300-Ton Crawler Crane	RT_Nonlabor	hr
%T	TASK
%F	task_id	proj_id	wbs_id	task_code	task_name	status_code	task_type	act_start_date	act_end_date	target_start_date	target_end_date	early_start_date	early_end_date	late_start_date	late_end_date	target_drtn_hr_cnt	remain_drtn_hr_cnt	act_work_qty	phys_complete_pct	total_float_hr_cnt	free_float_hr_cnt	clndr_id
%R	401	400	4100	C4-1000	Project Commencement Milestone	TK_NotStart	TT_Mile			2020-12-10 08:00	2020-12-10 08:00	2020-12-10 08:00	2020-12-10 08:00	2020-12-10 08:00	2020-12-10 08:00	0	0	0	0	0	0	1
%R	402	400	4100	C4-1010	Project Setup & ROW Demarcation	TK_NotStart	TT_Task			2020-12-11 08:00	2021-02-28 17:00	2020-12-11 08:00	2021-02-28 17:00	2020-12-11 08:00	2021-02-28 17:00	544	544	0	0	0	0	1
%R	403	400	4200	C4-2000	Geotechnical Borehole Investigation	TK_NotStart	TT_Task			2020-12-15 08:00	2021-04-30 17:00	2020-12-15 08:00	2021-04-30 17:00	2020-12-15 08:00	2021-04-30 17:00	936	936	0	0	0	0	1
%R	404	400	4300	C4-3000	Casting Yard Setup & Gantry Assembly	TK_NotStart	TT_Task			2021-01-05 08:00	2021-06-30 17:00	2021-01-05 08:00	2021-06-30 17:00	2021-01-05 08:00	2021-06-30 17:00	1200	1200	0	0	40	40	1
%R	405	400	4400	C4-4000	Initial Pile Testing & Calibration	TK_NotStart	TT_Task			2021-02-01 08:00	2021-04-15 17:00	2021-02-01 08:00	2021-04-15 17:00	2021-02-01 08:00	2021-04-15 17:00	512	512	0	0	0	0	1
%R	406	400	4400	C4-4010	Cast-in-Situ Piling Works Section 1	TK_NotStart	TT_Task			2021-04-16 08:00	2022-01-31 17:00	2021-04-16 08:00	2022-01-31 17:00	2021-04-16 08:00	2022-01-31 17:00	1960	1960	0	0	0	0	1
%R	407	400	4400	C4-4020	Pile Cap Casting Section 1	TK_NotStart	TT_Task			2021-06-01 08:00	2022-03-31 17:00	2021-06-01 08:00	2022-03-31 17:00	2021-06-01 08:00	2022-03-31 17:00	2080	2080	0	0	0	0	1
%R	408	400	4400	C4-4030	Pier Shaft Construction Section 1	TK_NotStart	TT_Task			2021-07-15 08:00	2022-06-30 17:00	2021-07-15 08:00	2022-06-30 17:00	2021-07-15 08:00	2022-06-30 17:00	2400	2400	0	0	0	0	1
%R	409	400	4400	C4-4040	Pier Cap Casting & Prestressing	TK_NotStart	TT_Task			2021-09-01 08:00	2022-08-31 17:00	2021-09-01 08:00	2022-08-31 17:00	2021-09-01 08:00	2022-08-31 17:00	2500	2500	0	0	0	0	1
%R	410	400	4300	C4-3010	Full-Span Box Girder Precasting	TK_NotStart	TT_Task			2021-07-01 08:00	2023-06-30 17:00	2021-07-01 08:00	2023-06-30 17:00	2021-07-01 08:00	2023-06-30 17:00	4960	4960	0	0	120	120	2
%R	411	400	4500	C4-5000	Launcher Erection & Commissioning	TK_NotStart	TT_Task			2022-09-01 08:00	2022-10-31 17:00	2022-09-01 08:00	2022-10-31 17:00	2022-09-01 08:00	2022-10-31 17:00	416	416	0	0	0	0	1
%R	412	400	4500	C4-5010	Viaduct Girder Launching Sequence	TK_NotStart	TT_Task			2022-11-01 08:00	2024-03-31 17:00	2022-11-01 08:00	2024-03-31 17:00	2022-11-01 08:00	2024-03-31 17:00	3520	3520	0	0	0	0	1
%R	413	400	4700	C4-7000	Station Substructure & Concourse Works	TK_NotStart	TT_Task			2021-08-01 08:00	2023-12-31 17:00	2021-08-01 08:00	2023-12-31 17:00	2021-09-01 08:00	2024-01-31 17:00	5920	5920	0	0	200	200	5
%R	414	400	4900	C4-9000	Track Bed & Plinth Construction	TK_NotStart	TT_Task			2024-02-01 08:00	2024-09-30 17:00	2024-02-01 08:00	2024-09-30 17:00	2024-02-01 08:00	2024-09-30 17:00	1632	1632	0	0	0	0	4
%R	415	400	4800	C4-8000	Traction Power Substation Works	TK_NotStart	TT_Task			2024-06-01 08:00	2024-10-31 17:00	2024-06-01 08:00	2024-10-31 17:00	2024-06-01 08:00	2024-10-31 17:00	1040	1040	0	0	0	0	6
%R	416	400	4900	C4-9010	Integrated Systems Testing & Trial Runs	TK_NotStart	TT_Task			2024-11-01 08:00	2024-12-07 17:00	2024-11-01 08:00	2024-12-07 17:00	2024-11-01 08:00	2024-12-07 17:00	248	248	0	0	0	0	4
%R	417	400	4900	C4-9090	Project Contractual Completion Date	TK_NotStart	TT_FinMile			2024-12-08 17:00	2024-12-08 17:00	2024-12-08 17:00	2024-12-08 17:00	2024-12-08 17:00	2024-12-08 17:00	0	0	0	0	0	0	1
%T	TASKPRED
%F	task_pred_id	task_id	pred_task_id	pred_type	lag_hr_cnt	driving_path_flag
%R	401	402	401	PR_FS	0	Y
%R	402	403	401	PR_FS	0	Y
%R	403	404	402	PR_FS	0	N
%R	404	405	403	PR_FS	0	Y
%R	405	406	405	PR_FS	0	Y
%R	406	407	406	PR_SS	320	Y
%R	407	408	407	PR_SS	320	Y
%R	408	409	408	PR_SS	320	Y
%R	409	410	404	PR_FS	0	N
%R	410	411	409	PR_FS	0	Y
%R	411	412	411	PR_FS	0	Y
%R	412	413	407	PR_FS	400	N
%R	413	414	412	PR_FS	0	Y
%R	414	415	412	PR_FS	0	Y
%R	415	416	414	PR_FS	0	Y
%R	416	416	415	PR_FS	0	Y
%R	417	417	416	PR_FS	0	Y
%E
`;

export const SAMPLE_PROJECTS: SampleProjectInfo[] = [
  {
    id: 'mahsr-c4',
    name: 'MAHSR C4 - CWP Baseline (High-Speed Rail)',
    code: 'MAHSR-C4',
    category: 'High-Speed Rail / EPC Mega Project',
    description: 'Reference 54-parameter L&T baseline schedule health check: 6,078 activities, 13,094 logic links, 1,979 WBS nodes, 80.8% Acceptable score.',
    activityCount: 6078,
    durationMonths: 48,
    xerContent: SAMPLE_PROJECT_MAHSR,
  },
  {
    id: 'metro-epc',
    name: 'Metro Rail Transit Expansion Phase 2 (EPC)',
    code: 'METRO-P2',
    category: 'Infrastructure & EPC',
    description: 'Turnkey 18-month rail project with Tunnel Boring Machine (TBM) drives, station excavation, signaling CBTC, and revenue service testing.',
    activityCount: 31,
    durationMonths: 18,
    xerContent: SAMPLE_PROJECT_METRO,
  },
  {
    id: 'commercial-highrise',
    name: 'Metropolitan Commercial Tower (45-Storey)',
    code: 'TOWER-45',
    category: 'Commercial Construction',
    description: 'Deep foundation diaphragm walls, core slipform cycles, unitized curtain wall glazing, and MEP risers.',
    activityCount: 12,
    durationMonths: 22,
    xerContent: SAMPLE_PROJECT_HIGHRISE,
  },
];

